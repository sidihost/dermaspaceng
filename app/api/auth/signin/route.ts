import { NextResponse, after } from 'next/server'
import { headers } from 'next/headers'
import { authenticateUser, createSession, checkNewDevice, verifyHCaptcha } from '@/lib/auth'
import { sendNewDeviceAlert } from '@/lib/email'
import { sql } from '@/lib/db'
import { sign } from 'jsonwebtoken'
import { appendAuditEvent } from '@/lib/auth-audit'
import { rateLimit } from '@/lib/redis'
import { shouldRequireProfileCompletion, isPlaceholderEmail } from '@/lib/auth-onboarding'
import { getSigningSecret } from '@/lib/server-secrets'
import { extractClientIpFromHeaders, resolveLoginLocation } from '@/lib/geolocation'
import { applyAuthUidCookie } from '@/lib/auth-cache-cookie'
import { getAuthCookieOptions } from '@/lib/cookie-options'
import { createAppealToken } from '@/lib/suspension-appeals'

export async function POST(request: Request) {
  try {
const body = await request.json()
    const { email: identifier, password, captchaToken } = body

    // Validate input
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/username and password are required' },
        { status: 400 }
      )
    }

    // ── Rate limiting (Upstash Redis) ─────────────────────────────
    // Two stacked limits:
    //   • Per-IP: 20 attempts / 5 min — blocks distributed brute force
    //     against a wide net of accounts from one origin.
    //   • Per-identifier: 10 attempts / 15 min — blocks a focused
    //     attack against one specific email/username, even when the
    //     attacker rotates IPs.
    // Both fail-open if Redis is unreachable so a transient outage
    // doesn't lock real users out.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const ipLimit = await rateLimit('signin:ip', ip, 20, 300)
    const idLimit = await rateLimit(
      'signin:id',
      String(identifier).toLowerCase().slice(0, 254),
      10,
      900,
    )
    if (!ipLimit.ok || !idLimit.ok) {
      return NextResponse.json(
        {
          error:
            'Too many sign-in attempts. Please wait a few minutes and try again, or use "Forgot password" if you\'re locked out.',
        },
        { status: 429 },
      )
    }

    // Verify hCaptcha
    if (process.env.HCAPTCHA_SECRET_KEY) {
      const captchaValid = await verifyHCaptcha(captchaToken)
      if (!captchaValid) {
        return NextResponse.json(
          { error: 'Captcha verification failed' },
          { status: 400 }
        )
      }
    }

    // Capture device info up-front — needed for both the audit
    // ledger and the new-device email alert further down.
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'Unknown device'
    const ipAddress = extractClientIpFromHeaders(headersList) || 'Unknown'

    // Authenticate user (supports email or username)
    const { user, error, suspendedUser } = await authenticateUser(identifier, password)

    if (error || !user) {
      // Append a `signin_failed` event so brute-force attempts show
      // up in the tamper-evident ledger. We deliberately don't link
      // a user_id (we may not have one), but we keep the identifier
      // so admins can trace activity per-account.
      try {
        await appendAuditEvent({
          eventType: 'signin_failed',
          userId: null,
          ipAddress,
          userAgent,
          eventData: { identifier: String(identifier).slice(0, 254) },
        })
      } catch (auditErr) {
        console.error('signin_failed audit append failed:', auditErr)
      }
      if (suspendedUser && suspendedUser.email) {
        let appealToken: string | undefined
        try {
          appealToken = createAppealToken({
            userId: suspendedUser.id,
            email: suspendedUser.email,
            role: suspendedUser.role,
          })
        } catch (tokenErr) {
          console.error('[signin] failed to create appeal token:', tokenErr)
        }
        return NextResponse.json(
          {
            error: error || 'Your account has been suspended. Please contact support.',
            appealToken,
            suspendedEmail: !isPlaceholderEmail(suspendedUser.email)
              ? suspendedUser.email
              : undefined,
          },
          { status: 401 },
        )
      }
      return NextResponse.json(
        { error: error || 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user has 2FA enabled (cast to UUID since user_2fa_settings.user_id is UUID type)
    const twoFAResult = await sql`
      SELECT totp_enabled FROM user_2fa_settings 
      WHERE user_id = ${user.id}::uuid AND totp_enabled = true
    `

    if (twoFAResult.length > 0) {
      // User has 2FA enabled, return partial token
      const partialToken = sign(
        { userId: user.id, email: user.email, requires2FA: true },
        getSigningSecret('2fa-partial'),
        { algorithm: 'HS256', expiresIn: '5m' }
      )

      return NextResponse.json({
        requires2FA: true,
        partialToken,
        message: 'Please complete 2FA verification'
      })
    }

    // (device info already captured at top of handler)

    // Check for new device
    const isNewDevice = await checkNewDevice(user.id, userAgent)
    
    // Create session
    const sessionId = await createSession(user.id, userAgent, ipAddress)

    // Dispatch new-device geo lookup & email alert off the critical path so
    // sign-in responds immediately without blocking on external ipapi/SMTP latency.
    if (isNewDevice && user.email && !isPlaceholderEmail(user.email)) {
      const alertEmail = user.email
      const alertFirstName = user.first_name
      after(async () => {
        try {
          const location = await resolveLoginLocation(headersList, ipAddress)

          await sendNewDeviceAlert({
            email: alertEmail,
            firstName: alertFirstName,
            deviceInfo: userAgent,
            ipAddress,
            location,
          })
        } catch (alertErr) {
          console.error('New-device alert failed:', alertErr)
        }
      })
    }

    // ── Audit ledger: append successful sign-in ────────────────────
    // Records device, IP, and whether this was a recognised device
    // so admins (and the user, via /dashboard/security) can audit
    // every authenticated session against a tamper-evident chain.
    try {
      await appendAuditEvent({
        eventType: 'signin',
        userId: user.id,
        ipAddress,
        userAgent,
        eventData: { method: 'password', newDevice: isNewDevice },
      })
    } catch (auditErr) {
      console.error('signin audit append failed:', auditErr)
    }

    const onboardingRows = await sql`
      SELECT
        COALESCE(profile_complete, FALSE) AS profile_complete,
        (google_id IS NOT NULL OR microsoft_id IS NOT NULL OR x_id IS NOT NULL) AS has_social_auth
      FROM users WHERE id = ${user.id} LIMIT 1
    `
    const ob = onboardingRows[0] as
      | { profile_complete?: boolean; has_social_auth?: boolean }
      | undefined
    const needsProfileCompletion = shouldRequireProfileCompletion({
      role: user.role,
      profileComplete: ob?.profile_complete === true,
      hasSocialAuth: ob?.has_social_auth === true,
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
          role: user.role,
          avatarUrl: user.avatar_url ?? null,
          gender: user.gender ?? null,
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
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
