import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { invalidateUserMe } from '@/lib/redis'

/**
 * X (Twitter) OAuth 2.0 — step 2: receive the code, exchange it for a
 * token, fetch the X user, upsert our user row, and create a session.
 *
 * This mirrors /api/auth/google/callback so the two providers behave
 * identically — same lookup (by provider id OR email), same "link
 * existing account" fallback, same `profile_complete` redirect.
 */

interface XTokenResponse {
  token_type: string
  expires_in: number
  access_token: string
  scope: string
  refresh_token?: string
}

interface XUserResponse {
  data: {
    id: string
    name: string
    username: string
    profile_image_url?: string
  }
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const returnedState = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError) {
    return NextResponse.redirect(`${appUrl}/signin?error=x_auth_failed`)
  }
  if (!code) {
    return NextResponse.redirect(`${appUrl}/signin?error=no_code`)
  }

  // Pull + invalidate the one-shot PKCE cookies we set in /api/auth/x.
  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('x_code_verifier')?.value
  const expectedState = cookieStore.get('x_oauth_state')?.value
  cookieStore.delete('x_code_verifier')
  cookieStore.delete('x_oauth_state')

  if (!codeVerifier || !expectedState || expectedState !== returnedState) {
    return NextResponse.redirect(`${appUrl}/signin?error=state_mismatch`)
  }

  // Bail loudly if the X env vars are missing — otherwise we'd get a
  // generic "token_exchange_failed" with no clue why.
  if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET) {
    console.error('[x-auth] X_CLIENT_ID or X_CLIENT_SECRET is not set')
    return NextResponse.redirect(`${appUrl}/signin?error=x_not_configured`)
  }

  try {
    // X (Twitter) OAuth 2.0 token exchange.
    //
    // Authorization codes from X are SINGLE-USE — the moment X
    // processes a token request with a given code (even if it rejects
    // it) the code is invalidated. So we must pick the correct auth
    // method on the first try; we cannot "try Basic, then retry without".
    //
    // Choose method based on whether X_CLIENT_SECRET is set:
    //   - Secret present → Confidential client → HTTP Basic auth
    //     header (`Authorization: Basic base64(client_id:client_secret)`),
    //     and DO NOT include `client_id` in the body.
    //   - No secret    → Public client (PKCE-only) → no auth header,
    //     and `client_id` MUST be in the body.
    //
    // If the exchange fails we surface X's own `error` / `error_description`
    // back in the redirect URL so the signin page can show a useful
    // message instead of a generic "token_exchange_failed".
    const isConfidential = Boolean(process.env.X_CLIENT_SECRET)
    const redirectUri = `${appUrl}/api/auth/x/callback`

    const body = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    })
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    }

    if (isConfidential) {
      const basic = Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`,
      ).toString('base64')
      headers.Authorization = `Basic ${basic}`
    } else {
      // Public clients authenticate via the body's `client_id` instead
      // of an Authorization header.
      body.set('client_id', process.env.X_CLIENT_ID!)
    }

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body,
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('[x-auth] token exchange failed', {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
        body: errText,
        redirectUri,
        clientType: isConfidential ? 'confidential' : 'public',
      })

      // Try to forward X's own error code so the signin page can
      // explain what went wrong (e.g. invalid_client = wrong secret,
      // invalid_grant = redirect URI / code mismatch).
      let xError = ''
      let xErrorDescription = ''
      try {
        const parsed = JSON.parse(errText) as {
          error?: string
          error_description?: string
        }
        xError = parsed.error || ''
        xErrorDescription = parsed.error_description || ''
      } catch {
        // X returned non-JSON — keep empty so we just show the generic msg.
      }

      const params = new URLSearchParams({ error: 'token_exchange_failed' })
      if (xError) params.set('reason', xError)
      if (xErrorDescription) params.set('detail', xErrorDescription)
      return NextResponse.redirect(`${appUrl}/signin?${params.toString()}`)
    }

    const tokens: XTokenResponse = await tokenRes.json()

    const userRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    )
    if (!userRes.ok) {
      const userErrText = await userRes.text().catch(() => '')
      console.error('[x-auth] /users/me failed', {
        status: userRes.status,
        statusText: userRes.statusText,
        body: userErrText,
      })
      return NextResponse.redirect(`${appUrl}/signin?error=user_info_failed`)
    }
    const { data: xUser } = (await userRes.json()) as XUserResponse

    // X profile_image_url defaults to the "_normal" size (48×48). Swap it
    // for "_400x400" so the avatar we store looks sharp in dashboards.
    const avatar = xUser.profile_image_url?.replace('_normal', '_400x400') ?? null

    // Split "name" into first/last on whitespace (X doesn't give
    // structured parts). If the user has a single-token display name we
    // store it as first_name and leave last_name empty.
    const [firstName = '', ...rest] = (xUser.name || '').trim().split(/\s+/)
    const lastName = rest.join(' ')

    // X OAuth 2.0 doesn't expose email (app-level restriction on Twitter's
    // side unless you're allow-listed). We therefore look up strictly by
    // x_id; new users coming in via X get a synthetic placeholder email
    // the `/complete-profile` flow will overwrite on first launch.
    const existing = await query(
      `SELECT id, x_id, profile_complete, is_active
       FROM users
       WHERE x_id = $1
       LIMIT 1`,
      [xUser.id],
    )

    let userId: string
    let profileComplete = false

    if (existing.rows.length > 0) {
      // `query()` returns `rows: any[]` so we narrow to the shape we
      // actually selected. Keeps the two assignments below type-safe.
      const row = existing.rows[0] as {
        id: string
        x_id: string
        profile_complete: boolean | null
        is_active: boolean
      }
      if (!row.is_active) {
        return NextResponse.redirect(`${appUrl}/signin?error=account_suspended`)
      }
      userId = row.id
      profileComplete = Boolean(row.profile_complete)

      // Refresh cached profile fields (avatar / username) in case the
      // user changed them on X since their last sign-in.
      await query(
        `UPDATE users
           SET avatar_url = COALESCE($1, avatar_url),
               x_username = $2,
               updated_at = NOW()
         WHERE id = $3`,
        [avatar, xUser.username, userId],
      )
      // Bust the warm /api/auth/me cache for this user so the
      // refreshed avatar_url propagates to the dashboard on the next
      // navigation rather than after the 60s TTL.
      invalidateUserMe(userId).catch(() => {})
    } else {
      const newUserId = uuidv4()
      // Placeholder email — X doesn't return one and `users.email` is
      // NOT NULL / UNIQUE in our schema. `complete-profile` swaps it
      // for the real address the user types in.
      const placeholderEmail = `x_${xUser.id}@users.dermaspaceng.com`

      await query(
        `INSERT INTO users (
           id, email, first_name, last_name,
           x_id, x_username, avatar_url,
           email_verified, profile_complete, role
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, 'user')`,
        [
          newUserId,
          placeholderEmail,
          firstName,
          lastName,
          xUser.id,
          xUser.username,
          avatar,
        ],
      )
      userId = newUserId
      profileComplete = false
    }

    const sessionToken = await createSession(
      userId,
      request.headers.get('user-agent') || '',
      request.headers.get('x-forwarded-for') || '',
    )

    cookieStore.set('session_id', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    if (!profileComplete) {
      return NextResponse.redirect(`${appUrl}/complete-profile`)
    }
    return NextResponse.redirect(`${appUrl}/dashboard`)
  } catch (err) {
    console.error('X auth error:', err)
    return NextResponse.redirect(`${appUrl}/signin?error=auth_failed`)
  }
}
