import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ensurePushSchema } from '@/lib/push'
import {
  extractHostname,
  isPreviewDeploymentEnv,
  isPreviewRequestHost,
  isServiceWorkerAllowedOrigin,
  validatePushSubscriptionPayload,
} from '@/lib/push-origin'

/**
 * Origins we accept push subscriptions from.
 *
 * Browser notifications carry the SW's origin in the OS notification
 * UI ("from dermaspaceng.com"). Reject preview / `.vercel.app` origins
 * and preview deployment environments unconditionally, and validate
 * the Web Push endpoint URL to prevent SSRF.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const effectiveHost = forwardedHost?.split(',')[0]?.trim() || host

  const canonicalOptions = {
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    allowLocalhost: !isPreviewDeploymentEnv(),
  }

  const isPreview =
    isPreviewDeploymentEnv() ||
    isPreviewRequestHost({ origin, referer, host, forwardedHost })
  const originValid =
    !origin || isServiceWorkerAllowedOrigin(origin, canonicalOptions)
  const hostValid =
    !effectiveHost || isServiceWorkerAllowedOrigin(effectiveHost, canonicalOptions)

  // If both Origin and effectiveHost are present, ensure they refer to the same host
  // so a cross-site request cannot spoof an arbitrary Origin/X-Forwarded-Host pair.
  const originHost = extractHostname(origin)
  const requestHost = extractHostname(effectiveHost)
  const originMatchesHost = !originHost || !requestHost || originHost === requestHost

  if (isPreview || !originValid || !hostValid || !originMatchesHost) {
    console.warn('[push/subscribe] rejecting preview/invalid origin', {
      origin,
      effectiveHost,
      isPreview,
    })
    return NextResponse.json(
      { error: 'Push notifications are not available on preview deployments' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    await ensurePushSchema()
    const body = await request.json()
    const sub = body.subscription || body
    const validated = validatePushSubscriptionPayload(sub)
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const { endpoint, p256dh, auth } = validated
    const ua = request.headers.get('user-agent') || null
    const storedOrigin =
      origin ||
      (effectiveHost
        ? `${effectiveHost.startsWith('localhost') || effectiveHost.startsWith('127.') ? 'http' : 'https'}://${effectiveHost}`
        : null)

    await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, origin)
      VALUES (${user.id}, ${endpoint}, ${p256dh}, ${auth}, ${ua}, ${storedOrigin})
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id      = EXCLUDED.user_id,
        p256dh       = EXCLUDED.p256dh,
        auth         = EXCLUDED.auth,
        user_agent   = EXCLUDED.user_agent,
        origin       = EXCLUDED.origin,
        last_used_at = NOW()
    `
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('[push/subscribe]', err)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
