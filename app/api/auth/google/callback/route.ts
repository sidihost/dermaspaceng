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

interface GoogleTokenResponse {
  access_token: string
  id_token: string
  expires_in: number
  token_type: string
}

interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=google_auth_failed`)
  }
  
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=no_code`)
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    
    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=token_exchange_failed`)
    }
    
    const tokens: GoogleTokenResponse = await tokenResponse.json()
    
    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    
    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=user_info_failed`)
    }
    
    const googleUser: GoogleUserInfo = await userInfoResponse.json()

    if (googleUser.verified_email === false || !googleUser.email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=user_info_failed`)
    }
    
    // Check if user exists by google_id or email (case-insensitive)
    const existingUserResult = await query(
      `SELECT id, email, first_name, google_id, profile_complete, role, is_active
       FROM users
       WHERE google_id = $1 OR LOWER(email) = LOWER($2)
       LIMIT 1`,
      [googleUser.id, googleUser.email.trim()]
    )
    
    let userId: string
    let profileComplete: boolean = false
    let userRole: string = 'user'
    let userEmail: string = googleUser.email
    let userFirstName: string = googleUser.given_name || googleUser.name || 'there'
    
    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0]
      
      // Check if account is active
      if (!existingUser.is_active) {
        const suspendedEmail = String(existingUser.email || googleUser.email || '').trim().toLowerCase()
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
          console.error('[google-auth] failed to create appeal token:', tokenErr)
        }
        const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/+$/, '')
        return NextResponse.redirect(
          `${appOrigin}${buildSuspendedSignInPath({ token: appealToken, email: suspendedEmail })}`,
        )
      }
      
      userId = existingUser.id
      profileComplete = Boolean(existingUser.profile_complete)
      userRole = existingUser.role || 'user'
      userEmail = existingUser.email || googleUser.email
      userFirstName = existingUser.first_name || userFirstName
      
      // Update google_id if user signed up with email but now using Google
      if (!existingUser.google_id) {
        await query(
          `UPDATE users SET google_id = $1, avatar_url = $2, email_verified = true, updated_at = NOW() WHERE id = $3`,
          [googleUser.id, googleUser.picture, userId]
        )
        // We just refreshed avatar_url for an account that may already
        // have a warm /api/auth/me cache from a prior email sign-in
        // — bust it so the new Google avatar shows immediately.
        invalidateUserMe(userId).catch(() => {})
      }
    } else {
      // Create new user with generated UUID
      const newUserId = uuidv4()
      
      const newUserResult = await query(
        `INSERT INTO users (id, email, first_name, last_name, google_id, avatar_url, email_verified, profile_complete, role)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, 'user')
         RETURNING id`,
        [newUserId, googleUser.email, googleUser.given_name || '', googleUser.family_name || '', googleUser.id, googleUser.picture]
      )

      userId = newUserResult.rows[0].id
      profileComplete = false

      await invalidateAfterSignup().catch(() => {})
      void notifyAdmins({
        title: 'New user registered',
        message: `${googleUser.given_name || googleUser.name || 'A new client'} (${googleUser.email}) signed up with Google.`,
        type: 'system',
        referenceType: 'user',
        referenceId: userId,
        actionUrl: `/admin/users/${userId}`,
        roles: ['admin'],
        push: false,
      }).catch(() => {})

      // Welcome email — Google signups bypass the email-verification
      // link entirely (Google has already verified ownership), so the
      // /api/auth/verify-email path that fires the welcome email for
      // password signups never runs for them. Send it here so every
      // brand-new account gets the same onboarding email regardless
      // of which provider they used. Best-effort only.
      try {
        await sendWelcomeEmail({
          email: googleUser.email,
          firstName: googleUser.given_name || googleUser.name || 'there',
        })
      } catch (welcomeErr) {
        console.error('welcome email (google signup) failed:', welcomeErr)
      }
    }
    
    const userAgent = request.headers.get('user-agent') || 'Unknown device'
    const ipAddress = extractClientIpFromHeaders(request.headers) || 'Unknown'
    const isNewDevice = await checkNewDevice(userId, userAgent)

    // Create session
    const sessionToken = await createSession(userId, userAgent, ipAddress)

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
          console.error('New-device alert failed (google):', alertErr)
        }
      })
    }
    
    // Redirect based on profile completion
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
    
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=auth_failed`)
  }
}
