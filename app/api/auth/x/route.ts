import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthCookieOptions } from '@/lib/cookie-options'
import { getAppOrigin } from '@/lib/x-oauth'

/**
 * X (Twitter) OAuth 2.0 — step 1: send the user to X's authorize page.
 *
 * X requires PKCE, so a fresh verifier/challenge pair is generated per
 * request and the verifier + CSRF `state` are stashed in httpOnly cookies
 * for the callback to redeem.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.X_CLIENT_ID
  const appOrigin = getAppOrigin(request)

  if (!clientId) {
    return NextResponse.redirect(`${appOrigin}/signin?error=x_not_configured`)
  }

  // The PKCE cookies must live on the SAME host X redirects back to
  // (the registered callback). If the visitor started on another host
  // (www vs apex, a preview URL), bounce them to the canonical host first
  // — otherwise the callback can't read the cookies and fails with
  // "state_mismatch".
  if (request.nextUrl.origin !== appOrigin) {
    return NextResponse.redirect(`${appOrigin}/api/auth/x`)
  }

  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${appOrigin}/api/auth/x/callback`,
    scope: 'users.read tweet.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const response = NextResponse.redirect(
    `https://x.com/i/oauth2/authorize?${params.toString()}`,
  )
  const cookieOpts = getAuthCookieOptions({ maxAge: 60 * 10 })
  response.cookies.set('x_code_verifier', codeVerifier, cookieOpts)
  response.cookies.set('x_oauth_state', state, cookieOpts)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
