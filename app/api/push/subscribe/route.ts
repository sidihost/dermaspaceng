import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { ensurePushSchema } from '@/lib/push'
import {
  isPreviewDeploymentEnv,
  isPreviewRequestHost,
  isServiceWorkerAllowedOrigin,
} from '@/lib/push-origin'

/**
 * Origins we accept push subscriptions from.
 *
 * Browser notifications carry the SW's origin in the OS notification
 * UI ("from dermaspaceng.com"). Reject preview / `.vercel.app` origins
 * and preview deployment environments unconditionally.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  if (isPreview || !originValid || !hostValid) {
    console.warn('[push/subscribe] rejecting preview/invalid origin', {
      origin,
      effectiveHost,
      isPreview,
    })
    return NextResponse.json(
      { error: 'Push notifications are not available on preview deployments' },
      { status: 403 },
    )
  }

  try {
    await ensurePushSchema()
    const body = await request.json()
    const sub = body.subscription || body
    const endpoint: string | undefined = sub?.endpoint
    const p256dh: string | undefined = sub?.keys?.p256dh
    const auth: string | undefined = sub?.keys?.auth
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }
    const ua = request.headers.get('user-agent') || null
    const storedOrigin = origin || (effectiveHost ? `https://${effectiveHost}` : null)

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
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe]', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}
