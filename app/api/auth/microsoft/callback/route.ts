import { NextRequest, NextResponse, after } from 'next/server'
import { query } from '@/lib/db'
import { checkNewDevice, createSession } from '@/lib/auth'
import { sendNewDeviceAlert, sendWelcomeEmail } from '@/lib/email'
import { v4 as uuidv4 } from 'uuid'
import { invalidateUserMe } from '@/lib/redis'
import { isPlaceholderEmail, shouldRequireProfileCompletion } from '@/lib/auth-onboarding'
import { extractClientIpFromHeaders, resolveLoginLocation } from '@/lib/geolocation'
import { applyAuthUidCookie } from '@/lib/auth-cache-cookie'
import { getAuthCookieOptions } from '@/lib/cookie-options'
import { invalidateAfterSignup } from '@/lib/stats-cache'
import { notifyAdmins } from '@/lib/notifications'
import { createAppealToken } from '@/lib/suspension-appeals'
import { buildSuspendedSignInPath } from '@/lib/suspension-appeal-constants'

interface MicrosoftTokenResponse {
  access_token: string
  id_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

// Shape returned by Microsoft Graph /me. We treat `id` as the stable
// identifier, and fall back across the various name/email fields
// Microsoft populates depending on whether the account is personal
// (Outlook/Hotmail) or Azure AD work/school.
interface MicrosoftUserInfo {
  id: string
  displayName?: string | null
  givenName?: string | null
  surname?: string | null
  mail?: string | null
  userPrincipalName?: string | null
  // not part of /me — we patch it on after fetching the photo blob
  picture?: string | null
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    const detail = errorDescription ? `&detail=${encodeURIComponent(errorDescription)}` : ''
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/signin?error=microsoft_auth_failed${detail}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=no_code`)
  }

  const tenant = process.env.MICROSOFT_TENANT_ID || 'common'

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/microsoft/callback`,
          grant_type: 'authorization_code',
          scope: 'openid profile email User.Read offline_access',
        }),
      }
    )

    if (!tokenResponse.ok) {
      let reason = ''
      let detail = ''
      try {
        const errBody = await tokenResponse.json()
        reason = errBody.error || ''
        detail = errBody.error_description || ''
      } catch {
        /* ignore */
      }
      const qs = new URLSearchParams({ error: 'token_exchange_failed' })
      if (reason) qs.set('reason', reason)
      if (detail) qs.set('detail', detail)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?${qs.toString()}`)
    }

    const tokens: MicrosoftTokenResponse = await tokenResponse.json()

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/signin?error=user_info_failed`
      )
    }

    const msUser: MicrosoftUserInfo = await userInfoResponse.json()

    // Microsoft Graph splits "real email" between `mail` (work/school,
    // proxy addresses) and `userPrincipalName` (sign-in name, often the
    // same as the email for personal accounts). Prefer `mail`, fall back
    // to UPN, and bail if we somehow got neither — we can't safely create
    // or match an account without an email.
    const email = (msUser.mail || msUser.userPrincipalName || '').toLowerCase().trim()
    if (!email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/signin?error=user_info_failed`
      )
    }

    // Best-effort avatar fetch. Many personal MS accounts don't have a
    // photo, and Graph returns 404 — we just leave avatar_url null in
    // that case instead of failing the whole sign-in.
    let avatarDataUrl: string | null = null
    try {
      const photoRes = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (photoRes.ok) {
        const contentType = photoRes.headers.get('content-type') || 'image/jpeg'
        const buf = Buffer.from(await photoRes.arrayBuffer())
        // Keep it cheap — only inline the photo if it's small enough to
        // be reasonable as a data URL. Larger photos are skipped.
        if (buf.byteLength > 0 && buf.byteLength < 200_000) {
          avatarDataUrl = `data:${contentType};base64,${buf.toString('base64')}`
        }
      }
    } catch {
      /* ignore — avatar is optional */
    }

    // Check if user exists by microsoft_id or email (case-insensitive)
    const existingUserResult = await query(
      `SELECT id, email, first_name, microsoft_id, profile_complete, role, is_active
       FROM users
       WHERE microsoft_id = $1 OR LOWER(email) = LOWER($2)
       LIMIT 1`,
      [msUser.id, email]
    )

    let userId: string
    let profileComplete: boolean = false
    let userRole: string = 'user'
    let userEmail: string = email
    let userFirstName: string = msUser.givenName || msUser.displayName?.split(' ')[0] || 'there'

    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0] as {
        id: string
        email: string
        first_name: string | null
        microsoft_id: string | null
        profile_complete: boolean | null
        role: string
        is_active: boolean
      }

      if (!existingUser.is_active) {
        const suspendedEmail = String(existingUser.email || email || '').trim().toLowerCase()
        let appealToken: string | null = null
        try {
          if (suspendedEmail) {
            appealToken = createAppealToken({
              userId: String(existingUser.id),
              email: suspendedEmail,
              role: existingUser.role || 'user',
            })
          }
        } catch (tokenErr) {
          console.error('[microsoft-auth] failed to create appeal token:', tokenErr)
        }
        const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/+$/, '')
        return NextResponse.redirect(
          `${appOrigin}${buildSuspendedSignInPath({ token: appealToken, email: suspendedEmail })}`,
        )
      }

      userId = existingUser.id
      profileComplete = Boolean(existingUser.profile_complete)
      userRole = existingUser.role || 'user'
      userEmail = existingUser.email || email
      userFirstName = existingUser.first_name || userFirstName

      // First time this account is signing in with Microsoft — link the
      // microsoft_id and refresh the avatar if we got one. Mirrors the
      // Google linking flow.
      if (!existingUser.microsoft_id) {
        if (avatarDataUrl) {
          await query(
            `UPDATE users
             SET microsoft_id = $1, avatar_url = $2, email_verified = true, updated_at = NOW()
             WHERE id = $3`,
            [msUser.id, avatarDataUrl, userId]
          )
        } else {
          await query(
            `UPDATE users
             SET microsoft_id = $1, email_verified = true, updated_at = NOW()
             WHERE id = $2`,
            [msUser.id, userId]
          )
        }
        // Bust the /api/auth/me cache so the linked account / new avatar
        // show up immediately on next request.
        invalidateUserMe(userId).catch(() => {})
      }
    } else {
      // Create new user
      const newUserId = uuidv4()
      const firstName = msUser.givenName || msUser.displayName?.split(' ')[0] || ''
      const lastName = msUser.surname || msUser.displayName?.split(' ').slice(1).join(' ') || ''

      const newUserResult = await query(
        `INSERT INTO users (id, email, first_name, last_name, microsoft_id, avatar_url, email_verified, profile_complete, role)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, 'user')
         RETURNING id`,
        [newUserId, email, firstName, lastName, msUser.id, avatarDataUrl]
      )

      userId = (newUserResult.rows[0] as { id: string }).id
      profileComplete = false

      await invalidateAfterSignup().catch(() => {})
      void notifyAdmins({
        title: 'New user registered',
        message: `${firstName || msUser.displayName || 'A new client'} (${email}) signed up with Microsoft.`,
        type: 'system',
        referenceType: 'user',
        referenceId: userId,
        actionUrl: `/admin/users/${userId}`,
        roles: ['admin'],
        push: false,
      }).catch(() => {})

      // Microsoft has verified the email for us, so we skip our own
      // verification email and go straight to the welcome email — same
      // behaviour as the Google signup path.
      try {
        await sendWelcomeEmail({
          email,
          firstName: firstName || msUser.displayName || 'there',
        })
      } catch (welcomeErr) {
        console.error('welcome email (microsoft signup) failed:', welcomeErr)
      }
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown device'
    const ipAddress = extractClientIpFromHeaders(request.headers) || 'Unknown'
    const isNewDevice = await checkNewDevice(userId, userAgent)

    // Create session
    const sessionToken = await createSession(
      userId,
      userAgent,
      ipAddress
    )

    if (isNewDevice && userEmail && !isPlaceholderEmail(userEmail)) {
      const alertEmail = userEmail
      const alertFirstName = userFirstName
      const reqHeaders = request.headers
      after(async () => {
        try {
          const location = await resolveLoginLocation(reqHeaders, ipAddress)
          await sendNewDeviceAlert({
            email: alertEmail,
            firstName: alertFirstName,
            deviceInfo: userAgent,
            ipAddress,
            location,
          })
        } catch (alertErr) {
          console.error('New-device alert failed (microsoft):', alertErr)
        }
      })
    }

    // Session cookie is set below on `redirectResponse` with getAuthCookieOptions()

    const needsProfile = shouldRequireProfileCompletion({
      role: userRole,
      profileComplete,
      hasSocialAuth: true,
      email: userEmail,
    })

    const destination = needsProfile
      ? `${process.env.NEXT_PUBLIC_APP_URL}/complete-profile`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`

    const redirectResponse = NextResponse.redirect(destination)
    redirectResponse.cookies.set(
      'session_id',
      sessionToken,
      getAuthCookieOptions({ maxAge: 60 * 60 * 24 * 7 }, request),
    )
    applyAuthUidCookie(redirectResponse, userId, request, 60 * 60 * 24 * 7)
    return redirectResponse
  } catch (err) {
    console.error('Microsoft auth error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=auth_failed`)
  }
}
