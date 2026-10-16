import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { invalidateUserMe } from '@/lib/redis'
import { getAuthCookieOptions } from '@/lib/cookie-options'
import { getAppOrigin, xPlaceholderEmail } from '@/lib/x-oauth'

/**
 * X (Twitter) OAuth 2.0 — step 2: exchange the code, fetch the X user,
 * upsert our user row, create a session and redirect.
 */

interface XTokenResponse {
  access_token: string
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
  const appUrl = getAppOrigin(request)
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const returnedState = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const codeVerifier = request.cookies.get('x_code_verifier')?.value
  const expectedState = request.cookies.get('x_oauth_state')?.value

  // Every exit path clears the one-shot PKCE cookies.
  const redirect = (path: string) => {
    const res = NextResponse.redirect(`${appUrl}${path}`)
    const expired = getAuthCookieOptions({ maxAge: 0, expires: new Date(0) })
    res.cookies.set('x_code_verifier', '', expired)
    res.cookies.set('x_oauth_state', '', expired)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  if (oauthError) {
    // `access_denied` = the user pressed Cancel on X's consent screen.
    return redirect(
      oauthError === 'access_denied' ? '/signin?error=x_cancelled' : '/signin?error=x_auth_failed',
    )
  }
  if (!code) return redirect('/signin?error=no_code')

  if (!codeVerifier || !expectedState || expectedState !== returnedState) {
    return redirect('/signin?error=state_mismatch')
  }

  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId) {
    console.error('[x-auth] X_CLIENT_ID is not set')
    return redirect('/signin?error=x_not_configured')
  }

  try {
    // Codes are single-use, so pick the right client-auth method first
    // time: confidential clients use HTTP Basic, public clients send
    // client_id in the body.
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
    if (clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    } else {
      body.set('client_id', clientId)
    }

    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('[x-auth] token exchange failed', {
        status: tokenRes.status,
        body: errText,
        redirectUri,
        clientType: clientSecret ? 'confidential' : 'public',
      })
      const params = new URLSearchParams({ error: 'token_exchange_failed' })
      try {
        const parsed = JSON.parse(errText) as { error?: string; error_description?: string }
        if (parsed.error) params.set('reason', parsed.error)
        if (parsed.error_description) params.set('detail', parsed.error_description)
      } catch {
        /* non-JSON body — generic message only */
      }
      return redirect(`/signin?${params.toString()}`)
    }

    const tokens: XTokenResponse = await tokenRes.json()

    const userRes = await fetch(
      'https://api.x.com/2/users/me?user.fields=profile_image_url,username,name',
      { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store' },
    )
    if (!userRes.ok) {
      console.error('[x-auth] /users/me failed', {
        status: userRes.status,
        body: await userRes.text().catch(() => ''),
      })
      return redirect('/signin?error=user_info_failed')
    }
    const { data: xUser } = (await userRes.json()) as XUserResponse
    if (!xUser?.id) return redirect('/signin?error=user_info_failed')

    const avatar = xUser.profile_image_url?.replace('_normal', '_400x400') ?? null
    const [firstName = '', ...rest] = (xUser.name || xUser.username || '').trim().split(/\s+/)
    const lastName = rest.join(' ')

    const existing = await query(
      `SELECT id, profile_complete, is_active FROM users WHERE x_id = $1 LIMIT 1`,
      [xUser.id],
    )

    let userId: string
    let profileComplete = false

    if (existing.rows.length > 0) {
      const row = existing.rows[0] as {
        id: string
        profile_complete: boolean | null
        is_active: boolean | null
      }
      if (row.is_active === false) return redirect('/signin?error=account_suspended')
      userId = row.id
      profileComplete = Boolean(row.profile_complete)

      await query(
        `UPDATE users
           SET avatar_url = COALESCE(avatar_url, $1),
               x_username = $2,
               updated_at = NOW()
         WHERE id = $3`,
        [avatar, xUser.username, userId],
      )
      invalidateUserMe(userId).catch(() => {})
    } else {
      userId = uuidv4()
      // ON CONFLICT covers a double-click / retried callback racing the
      // same X account into two inserts.
      const inserted = await query(
        `INSERT INTO users (
           id, email, first_name, last_name,
           x_id, x_username, avatar_url,
           email_verified, profile_complete, role
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, 'user')
         ON CONFLICT (x_id) DO UPDATE SET updated_at = NOW()
         RETURNING id, profile_complete`,
        [userId, xPlaceholderEmail(xUser.id), firstName, lastName, xUser.id, xUser.username, avatar],
      )
      const row = inserted.rows[0] as { id: string; profile_complete: boolean | null }
      userId = row.id
      profileComplete = Boolean(row.profile_complete)
    }

    const sessionToken = await createSession(
      userId,
      request.headers.get('user-agent') || '',
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
    )

    const res = redirect(profileComplete ? '/dashboard' : '/complete-profile')
    res.cookies.set(
      'session_id',
      sessionToken,
      getAuthCookieOptions({ maxAge: 60 * 60 * 24 * 30 }),
    )
    return res
  } catch (err) {
    console.error('X auth error:', err)
    return redirect('/signin?error=auth_failed')
  }
}
