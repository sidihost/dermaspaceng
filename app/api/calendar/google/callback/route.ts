/**
 * Google's redirect lands here with `?code=...&state=...`. We
 *  1. Validate `state` against the cookie we set in /connect.
 *  2. Exchange the code for tokens.
 *  3. Fetch the connected account profile so the UI can show
 *     "Connected as ana@dermaspace.com".
 *  4. Persist the connection row, then bounce back to
 *     /admin/addons?google_calendar=connected for a celebration.
 *
 * On any failure we still redirect to /admin/addons but with an
 * `error` query so the page can render a non-blocking toast.
 */

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  exchangeCode,
  fetchUserInfo,
  isConfigured,
  saveConnection,
} from '@/lib/google-calendar'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

function back(query: string) {
  return NextResponse.redirect(new URL(`/admin/addons?${query}`, SITE))
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError) return back(`google_calendar=denied&reason=${oauthError}`)
  if (!code || !state) return back('google_calendar=invalid')
  if (!isConfigured()) return back('google_calendar=not_configured')

  const jar = await cookies()
  const expected = jar.get('gcal_oauth_state')?.value
  jar.delete('gcal_oauth_state')
  if (!expected || expected !== state) return back('google_calendar=csrf_mismatch')

  const user = await getCurrentUser()
  if (!user) return back('google_calendar=session_expired')

  // state = "<userId>:<csrf>" — we already verified the cookie
  // matches, so the userId in state really is the requester's.
  const [stateUserId] = state.split(':')
  if (stateUserId !== user.id) return back('google_calendar=user_mismatch')

  try {
    const tokens = await exchangeCode(code)
    let email: string | null = null
    let picture: string | null = null
    try {
      const info = await fetchUserInfo(tokens.access_token)
      email = info.email
      picture = info.picture ?? null
    } catch {
      // userinfo fetch is best-effort — do not block on it
    }
    await saveConnection({
      userId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
      email,
      picture,
    })
    return back('google_calendar=connected')
  } catch (err: any) {
    console.log('[v0] google calendar callback error:', err?.message ?? err)
    return back(
      `google_calendar=error&reason=${encodeURIComponent(String(err?.message ?? err).slice(0, 120))}`,
    )
  }
}
