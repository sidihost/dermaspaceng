import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { query } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { delKey, getJson, invalidateUserMe, setJson } from '@/lib/redis'
import { getAuthCookieOptions } from '@/lib/cookie-options'
import { getAppOrigin, xPlaceholderEmail } from '@/lib/x-oauth'

/**
 * X (Twitter) OAuth 2.0 — step 2: exchange the authorization code,
 * fetch the X user, upsert our user row, create a session, update the
 * server-side poll channel (`x_poll:<pollToken>`), and return an HTML
 * bridge that:
 *   - notifies `window.opener` + `BroadcastChannel` if reachable,
 *   - attempts `window.close()` for popup windows, and
 *   - redirects top-level navigations directly when not in popup mode.
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

interface StoredXOAuthState {
  codeVerifier: string
  redirectTo?: string
  pollToken?: string
  isPopup?: boolean
}

function buildCallbackHtml(payload: {
  type: 'X_OAUTH_SUCCESS' | 'X_OAUTH_ERROR'
  redirectTo: string
  isPopup: boolean
  handoff?: string
  error?: string
  reason?: string
  detail?: string
  title: string
  subtitle: string
}): string {
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c')
  const safeRedirectHref = payload.redirectTo
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${payload.title} | Dermaspace</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #faf7fc;
        color: #111827;
        padding: 24px;
      }
      .card {
        max-width: 360px;
        width: 100%;
        background: #ffffff;
        border: 1px solid rgba(123, 45, 142, 0.14);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
      }
      h1 {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 8px;
      }
      p {
        font-size: 14px;
        color: #4b5563;
        margin: 0 0 18px;
        line-height: 1.5;
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
      }
      button.primary,
      a.primary {
        display: inline-block;
        width: 100%;
        box-sizing: border-box;
        padding: 10px 18px;
        border: 0;
        border-radius: 10px;
        background: #7b2d8e;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
      }
      a.secondary {
        font-size: 13px;
        color: #7b2d8e;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${payload.title}</h1>
      <p>${payload.subtitle}</p>
      <div class="actions">
        ${
          payload.isPopup
            ? `<button type="button" class="primary" onclick="window.close()">Close this window</button>
               <a href="${safeRedirectHref}" class="secondary" id="continue-link">Or continue here</a>`
            : `<a href="${safeRedirectHref}" class="primary" id="continue-link">Continue</a>`
        }
      </div>
    </div>
    <script>
      (function () {
        var payload = ${safeJson};
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            var ch = new BroadcastChannel('dermaspace_x_oauth');
            ch.postMessage(payload);
            ch.close();
          }
        } catch (e) {}

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(payload, '*');
          } catch (e) {}
          try {
            window.close();
          } catch (e) {}
          setTimeout(function () {
            try { window.close(); } catch (e) {}
          }, 150);
          return;
        }

        if (payload.isPopup) {
          // Even when cross-origin COOP severs window.opener, attempt to
          // close the popup automatically; the opener also closes it via
          // /api/auth/x/status polling.
          try { window.close(); } catch (e) {}
          setTimeout(function () {
            try { window.close(); } catch (e) {}
          }, 200);
          return;
        }

        window.location.replace(payload.redirectTo);
      })();
    </script>
  </body>
</html>`
}

export async function GET(request: NextRequest) {
  const appUrl = getAppOrigin(request)
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const returnedState = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const cookieVerifier = request.cookies.get('x_code_verifier')?.value
  const cookieState = request.cookies.get('x_oauth_state')?.value

  // Consume server-side PKCE state (one-time use) so we work both with
  // and without cross-origin cookies.
  let serverState: StoredXOAuthState | null = null
  if (returnedState) {
    serverState = await getJson<StoredXOAuthState>(`x_oauth:${returnedState}`)
    if (serverState) {
      await delKey(`x_oauth:${returnedState}`)
    }
  }

  const isPopup = Boolean(serverState?.isPopup)

  const publishPoll = async (
    data:
      | { status: 'success'; handoff: string; redirectTo: string }
      | { status: 'error'; error: string; reason?: string; detail?: string },
  ) => {
    if (!serverState?.pollToken) return
    await setJson(`x_poll:${serverState.pollToken}`, data, 120)
  }

  const clearPkceCookies = (res: NextResponse) => {
    const expired = getAuthCookieOptions(
      { maxAge: 0, expires: new Date(0) },
      request,
    )
    res.cookies.set('x_code_verifier', '', expired)
    res.cookies.set('x_oauth_state', '', expired)
    res.headers.set('Cache-Control', 'no-store')
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
    return res
  }

  const errorResponse = async (
    errorCode: string,
    extra?: { reason?: string; detail?: string },
  ) => {
    await publishPoll({
      status: 'error',
      error: errorCode,
      reason: extra?.reason,
      detail: extra?.detail,
    })

    const params = new URLSearchParams({ error: errorCode })
    if (extra?.reason) params.set('reason', extra.reason)
    if (extra?.detail) params.set('detail', extra.detail)
    const redirectTo = `${appUrl}/signin?${params.toString()}`
    const html = buildCallbackHtml({
      type: 'X_OAUTH_ERROR',
      redirectTo,
      isPopup,
      error: errorCode,
      reason: extra?.reason,
      detail: extra?.detail,
      title: 'Could not complete X sign-in',
      subtitle: 'You can close this window and try again on Dermaspace.',
    })
    return clearPkceCookies(
      new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    )
  }

  if (oauthError) {
    return errorResponse(
      oauthError === 'access_denied' ? 'x_cancelled' : 'x_auth_failed',
    )
  }

  if (!code) {
    return errorResponse('no_code')
  }

  let codeVerifier: string | null = null
  if (
    cookieVerifier &&
    cookieState &&
    returnedState &&
    cookieState === returnedState
  ) {
    codeVerifier = cookieVerifier
  } else if (serverState?.codeVerifier) {
    codeVerifier = serverState.codeVerifier
  }

  if (!codeVerifier) {
    return errorResponse('state_mismatch')
  }

  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId) {
    console.error('[x-auth] X_CLIENT_ID is not set')
    return errorResponse('x_not_configured')
  }

  try {
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
      let reason: string | undefined
      let detail: string | undefined
      try {
        const parsed = JSON.parse(errText) as {
          error?: string
          error_description?: string
        }
        reason = parsed.error
        detail = parsed.error_description
      } catch {
        /* non-JSON body */
      }
      return errorResponse('token_exchange_failed', { reason, detail })
    }

    const tokens: XTokenResponse = await tokenRes.json()

    const userRes = await fetch(
      'https://api.x.com/2/users/me?user.fields=profile_image_url,username,name',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        cache: 'no-store',
      },
    )
    if (!userRes.ok) {
      console.error('[x-auth] /users/me failed', {
        status: userRes.status,
        body: await userRes.text().catch(() => ''),
      })
      return errorResponse('user_info_failed')
    }

    const { data: xUser } = (await userRes.json()) as XUserResponse
    if (!xUser?.id) return errorResponse('user_info_failed')

    const avatar = xUser.profile_image_url?.replace('_normal', '_400x400') ?? null
    const [firstName = '', ...rest] = (xUser.name || xUser.username || '')
      .trim()
      .split(/\s+/)
    const lastName = rest.join(' ')

    const existing = await query(
      `SELECT id, profile_complete, is_active, deleted_at FROM users WHERE x_id = $1 LIMIT 1`,
      [xUser.id],
    )

    let userId: string
    let profileComplete = false

    if (existing.rows.length > 0) {
      const row = existing.rows[0] as {
        id: string
        profile_complete: boolean | null
        is_active: boolean | null
        deleted_at: string | null
      }
      if (row.is_active === false || row.deleted_at != null) {
        return errorResponse('account_suspended')
      }
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
      const inserted = await query(
        `INSERT INTO users (
           id, email, first_name, last_name,
           x_id, x_username, avatar_url,
           email_verified, profile_complete, role
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, 'user')
         ON CONFLICT (x_id) DO UPDATE
           SET x_username = EXCLUDED.x_username,
               updated_at = NOW()
         RETURNING id, profile_complete`,
        [
          userId,
          xPlaceholderEmail(xUser.id),
          firstName || xUser.username || 'Dermaspace',
          lastName,
          xUser.id,
          xUser.username,
          avatar,
        ],
      )
      const row = inserted.rows[0] as {
        id: string
        profile_complete: boolean | null
      }
      userId = row.id
      profileComplete = Boolean(row.profile_complete)
    }

    const sessionToken = await createSession(
      userId,
      request.headers.get('user-agent') || '',
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
    )

    const targetPath = profileComplete
      ? serverState?.redirectTo || '/dashboard'
      : '/complete-profile'
    const absoluteTarget = `${appUrl}${targetPath}`

    // Issue a short-lived, single-use handoff code so the iframe opener
    // can stamp `session_id` inside its own iframe context via
    // POST /api/auth/x/handoff.
    const handoff = crypto.randomBytes(24).toString('base64url')
    await setJson(
      `x_handoff:${handoff}`,
      { sessionToken, redirectTo: targetPath },
      60,
    )

    await publishPoll({
      status: 'success',
      handoff,
      redirectTo: targetPath,
    })

    const html = buildCallbackHtml({
      type: 'X_OAUTH_SUCCESS',
      redirectTo: absoluteTarget,
      isPopup,
      handoff,
      title: 'Signed in with X',
      subtitle: isPopup
        ? 'You are signed in. You can close this window to return to Dermaspace.'
        : 'Completing sign-in and returning to Dermaspace…',
    })

    const res = clearPkceCookies(
      new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    )
    res.cookies.set(
      'session_id',
      sessionToken,
      getAuthCookieOptions({ maxAge: 60 * 60 * 24 * 30 }, request),
    )
    return res
  } catch (err) {
    console.error('X auth error:', err)
    return errorResponse('auth_failed')
  }
}
