import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { sql } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'
import { verifyOtp } from '@/lib/signup-otp'
import { createSession } from '@/lib/auth'
import { appendAuditEvent } from '@/lib/auth-audit'

// ---------------------------------------------------------------------------
// Email verification — OTP flow.
//
// The signup wizard POSTs { email, code } here. We:
//   1. validate the 6-digit code against the Redis-stored OTP (fails closed
//      on missing/expired/too-many-attempts)
//   2. flip `email_verified = true` on the matching user row
//   3. send the welcome email (best-effort, first verification only)
//   4. create a session + set the cookie so the user is logged straight in
//
// The response carries the basic user shape so the client can route to the
// dashboard immediately without a second /api/auth/me round-trip.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 },
      )
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    // ── Verify the OTP ────────────────────────────────────────────
    const result = await verifyOtp(normalizedEmail, String(code))
    if (!result.ok) {
      const message =
        result.reason === 'expired'
          ? 'This code has expired. Request a new one to continue.'
          : result.reason === 'too_many_attempts'
            ? 'Too many incorrect attempts. Request a new code to continue.'
            : 'That code is incorrect. Please check and try again.'
      return NextResponse.json({ error: message, reason: result.reason }, { status: 400 })
    }

    // Look up the user this email belongs to. The account was created
    // by the signup route just moments ago (unverified). We grab the
    // fields we need to flip verification, send the welcome mail, and
    // mint a session.
    const candidates = (await sql`
      SELECT id, email, first_name, last_name, email_verified, is_active
        FROM users
       WHERE email = ${normalizedEmail}
       LIMIT 1
    `) as Array<{
      id: string
      email: string
      first_name: string
      last_name: string
      email_verified: boolean
      is_active: boolean | null
    }>
    const user = candidates[0] ?? null

    if (!user) {
      return NextResponse.json(
        { error: 'We could not find an account for this email.' },
        { status: 400 },
      )
    }

    // Guard against a suspended account slipping through to a session.
    if (user.is_active === false) {
      return NextResponse.json(
        { error: 'This account has been suspended. Please contact support.' },
        { status: 403 },
      )
    }

    const wasAlreadyVerified = user.email_verified === true

    // Flip verification + clear the legacy link token. Idempotent — a
    // re-verify is harmless.
    await sql`
      UPDATE users
         SET email_verified = true, verification_token = null
       WHERE id = ${user.id}
    `

    // Welcome email — best-effort, only on the FIRST verification so a
    // re-submitted code doesn't spam a duplicate.
    if (!wasAlreadyVerified) {
      try {
        await sendWelcomeEmail({
          email: user.email,
          firstName: user.first_name,
        })
      } catch (welcomeErr) {
        console.error('[v0] welcome email failed:', welcomeErr)
      }
    }

    // ── Auto-login: create a session + set the cookie ─────────────
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'Unknown device'
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0] || 'Unknown'

    const sessionId = await createSession(user.id, userAgent, ipAddress)

    const cookieStore = await cookies()
    cookieStore.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    // Audit ledger — record the verified signup as a sign-in event so
    // the tamper-evident chain captures the auto-login. Best-effort.
    try {
      await appendAuditEvent({
        eventType: 'signin',
        userId: user.id,
        ipAddress,
        userAgent,
        eventData: { method: 'email_otp_signup', newDevice: true },
      })
    } catch (auditErr) {
      console.error('[v0] verify-email audit append failed:', auditErr)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 },
    )
  }
}
