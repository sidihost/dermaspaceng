import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

/**
 * X (Twitter) OAuth 2.0 — step 1: send the user to X's authorize page.
 *
 * X requires PKCE for all OAuth 2.0 clients, so we generate a fresh
 * `code_verifier` + `code_challenge` pair on every request and stash
 * the verifier in an httpOnly cookie so the callback can redeem it.
 * A short-lived `state` cookie protects the round-trip from CSRF.
 *
 * Scopes:
 *   users.read       — read the signed-in user's profile (id, name, username, avatar)
 *   tweet.read       — required by X to grant `users.read`
 *   offline.access   — returns a refresh token (future-proofs us for
 *                      any follow-up calls without re-prompting the user)
 */
export async function GET() {
  const clientId = process.env.X_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'X OAuth not configured' },
      { status: 500 },
    )
  }

  // PKCE — S256 variant. `base64url` gives us the URL-safe alphabet X wants.
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  // CSRF guard. Verified against the returned `state` in the callback.
  const state = crypto.randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === 'production'
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    maxAge: 60 * 10, // 10 minutes — plenty to complete the round-trip
    path: '/',
  }
  cookieStore.set('x_code_verifier', codeVerifier, cookieOpts)
  cookieStore.set('x_oauth_state', state, cookieOpts)

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/x/callback`
  const scope = 'users.read tweet.read offline.access'

  const authorizeUrl =
    `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${state}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`

  return NextResponse.redirect(authorizeUrl)
}
