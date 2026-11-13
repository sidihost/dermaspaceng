import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthCookieOptions } from '@/lib/cookie-options'
import { getAppOrigin, sanitizeRedirectPath } from '@/lib/x-oauth'
import { setJson } from '@/lib/redis'

/**
 * X (Twitter) OAuth 2.0 — step 1: build the PKCE authorize URL.
 *
 * Supports two modes:
 *   - `?format=json` — returns `{ url, pollToken }` so the client can open
 *     X directly in a popup window (required inside the AI Studio preview
 *     iframe, since X blocks framing) and poll `/api/auth/x/status` if X's
 *     COOP policy severs `window.opener`.
 *   - default        — issues a 302 redirect to X (top-level fallback).
 *
 * PKCE `code_verifier` + `state` are stored both in httpOnly cookies and in
 * a 10-minute single-use server-side store (`x_oauth:<state>`) so the
 * callback succeeds even if cross-origin iframe cookie rules prevent the
 * cookies from traveling across the popup boundary.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.X_CLIENT_ID
  const appOrigin = getAppOrigin(request)
  const format = request.nextUrl.searchParams.get('format')
  const isPopup = format === 'json'
  const safeRedirect = sanitizeRedirectPath(
    request.nextUrl.searchParams.get('redirect'),
  )

  if (!clientId) {
    if (isPopup) {
      return NextResponse.json(
        {
          error: 'x_not_configured',
          message: "X sign-in isn't configured yet — please use email or Google.",
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return NextResponse.redirect(`${appOrigin}/signin?error=x_not_configured`)
  }

  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')
  const pollToken = isPopup ? crypto.randomBytes(24).toString('base64url') : undefined

  // Store PKCE verifier server-side (10-minute TTL) as a reliable
  // fallback alongside the httpOnly cookies.
  await setJson(
    `x_oauth:${state}`,
    {
      codeVerifier,
      redirectTo: safeRedirect,
      pollToken,
      isPopup,
    },
    60 * 10,
  )

  if (pollToken) {
    await setJson(`x_poll:${pollToken}`, { status: 'pending' }, 60 * 10)
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${appOrigin}/api/auth/x/callback`,
    scope: 'users.read tweet.read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `https://x.com/i/oauth2/authorize?${params.toString()}`

  const response = isPopup
    ? NextResponse.json({ url: authUrl, pollToken })
    : NextResponse.redirect(authUrl)

  const cookieOpts = getAuthCookieOptions({ maxAge: 60 * 10 }, request)
  response.cookies.set('x_code_verifier', codeVerifier, cookieOpts)
  response.cookies.set('x_oauth_state', state, cookieOpts)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
