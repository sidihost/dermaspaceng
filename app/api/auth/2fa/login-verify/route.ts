import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { sql } from '@/lib/db'
import { verifyTOTPCode } from '@/lib/totp'
import { verify, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'
import { createSession, checkNewDevice } from '@/lib/auth'
import { sendNewDeviceAlert } from '@/lib/email'
import { shouldRequireProfileCompletion } from '@/lib/auth-onboarding'
import { rateLimit } from '@/lib/redis'
import { getSigningSecret, isValidPublicIpForGeo } from '@/lib/server-secrets'
import { applyAuthUidCookie } from '@/lib/auth-cache-cookie'
import { getAuthCookieOptions } from '@/lib/cookie-options'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { partialToken, code } = body

    if (!partialToken || !code) {
      return NextResponse.json({ error: 'Token and code are required' }, { status: 400 })
    }

    // Verify the partial token.
    //
    // The previous implementation collapsed every JWT failure into a
    // generic "Invalid or expired token" string, which is why users who
    // took a moment to open their authenticator app would type a
    // perfectly correct 6-digit code and still see "Invalid token" —
    // the token, not the code, had expired. We now split those cases
    // so the UI can show a clear "session expired" message and bounce
    // the user back to /signin to request a fresh 2FA challenge.
    let decoded: { userId: string; email: string; requires2FA: boolean }
    try {
      decoded = verify(partialToken, getSigningSecret('2fa-partial'), {
        algorithms: ['HS256'],
      }) as typeof decoded
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return NextResponse.json(
          {
            error: 'Your sign-in session expired. Please sign in again.',
            code: 'SESSION_EXPIRED',
          },
          { status: 401 },
        )
      }
      if (err instanceof JsonWebTokenError) {
        return NextResponse.json(
          {
            error: 'Your sign-in session is no longer valid. Please sign in again.',
            code: 'SESSION_INVALID',
          },
          { status: 401 },
        )
      }
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'SESSION_INVALID' },
        { status: 401 },
      )
    }

    if (!decoded.requires2FA || typeof decoded.userId !== 'string' || !decoded.userId.trim()) {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const [ipLimit, userLimit] = await Promise.all([
      rateLimit('2fa:login:ip', ip, 30, 300),
      rateLimit('2fa:login:user', decoded.userId, 10, 300),
    ])
    if (!ipLimit.ok || !userLimit.ok) {
      return NextResponse.json(
        {
          error: 'Too many verification attempts. Please wait a few minutes and try again.',
        },
        { status: 429 },
      )
    }

    // Verify the TOTP code
    const isValid = await verifyTOTPCode(decoded.userId, code)

    if (!isValid) {
      // `INVALID_CODE` lets the client distinguish a wrong code (keep
      // the user on the page, let them retry) from an expired session
      // (bounce back to /signin). See the 2FA page error handler.
      return NextResponse.json(
        {
          error: 'That code didn\u2019t match. Check your authenticator app and try again.',
          code: 'INVALID_CODE',
        },
        { status: 400 },
      )
    }

    // Get user details
    const userResult = await sql`
      SELECT id, email, first_name, last_name, role,
             avatar_url, gender, username,
             COALESCE(is_active, TRUE) AS is_active,
             COALESCE(profile_complete, FALSE) AS profile_complete,
             (google_id IS NOT NULL OR microsoft_id IS NOT NULL OR x_id IS NOT NULL) AS has_social_auth
      FROM users WHERE id = ${decoded.userId}
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult[0]
    if (user.is_active === false) {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact support.' },
        { status: 403 },
      )
    }

    // Get device info and IP for session creation
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'Unknown device'
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0] || 'Unknown'

    // Check for new device
    const isNewDevice = await checkNewDevice(user.id, userAgent)

    // Create session (same as regular signin)
    const sessionId = await createSession(user.id, userAgent, ipAddress)

    // Send new device alert if needed
    if (isNewDevice) {
      let location = 'Unknown location'
      if (isValidPublicIpForGeo(ipAddress)) {
        try {
          const geoRes = await fetch(`https://ipapi.co/${encodeURIComponent(ipAddress.trim())}/json/`)
          const geoData = await geoRes.json()
          location = `${geoData.city || 'Unknown'}, ${geoData.country_name || 'Unknown'}`
        } catch {
          // Ignore geo lookup errors
        }
      }

      await sendNewDeviceAlert({
        email: user.email,
        firstName: user.first_name,
        deviceInfo: userAgent,
        ipAddress,
        location
      })
    }

    // Set session cookie (same cookie as regular signin uses)
    const cookieStore = await cookies()
    cookieStore.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    const needsProfileCompletion = shouldRequireProfileCompletion({
      role: user.role || 'user',
      profileComplete: user.profile_complete === true,
      hasSocialAuth: user.has_social_auth === true,
      email: user.email,
    })

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role || 'user',
          avatarUrl: user.avatar_url ?? null,
          gender:
            user.gender === 'male' || user.gender === 'female' ? user.gender : null,
          username: user.username ?? null,
          needsProfileCompletion,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
    response.cookies.set(
      'session_id',
      sessionId,
      getAuthCookieOptions({ maxAge: 30 * 24 * 60 * 60 }, request),
    )
    applyAuthUidCookie(response, user.id, request)
    return response
  } catch (error) {
    console.error('Error verifying 2FA login:', error)
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 })
  }
}
