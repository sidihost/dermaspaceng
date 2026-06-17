import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendSignupOtpEmail } from '@/lib/email'
import { generateOtp, storeOtp } from '@/lib/signup-otp'
import { rateLimit } from '@/lib/redis'

// ---------------------------------------------------------------------------
// Resend signup verification code.
//
// Called from the "Resend code" affordance on the signup wizard's verify
// step. We re-issue a fresh OTP (which also resets the attempt counter) and
// email it. To avoid this becoming a free email-spam cannon, it's tightly
// rate-limited per email AND per IP.
//
// We deliberately return a generic success even when the email doesn't match
// an unverified account, so this endpoint can't be used to enumerate which
// emails are registered.
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    // Rate limits: 3 resends / 10 min per email, 10 / 10 min per IP.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const emailLimit = await rateLimit('otp:resend:email', normalizedEmail, 3, 600)
    const ipLimit = await rateLimit('otp:resend:ip', ip, 10, 600)
    if (!emailLimit.ok || !ipLimit.ok) {
      return NextResponse.json(
        { error: 'Too many code requests. Please wait a few minutes and try again.' },
        { status: 429 },
      )
    }

    // Only re-issue for a real, still-unverified account. We swallow the
    // "not found / already verified" cases into the same generic success
    // so we don't leak account existence.
    const rows = (await sql`
      SELECT first_name, email_verified
        FROM users
       WHERE email = ${normalizedEmail}
       LIMIT 1
    `) as Array<{ first_name: string; email_verified: boolean }>
    const user = rows[0] ?? null

    if (user && user.email_verified !== true) {
      try {
        const otp = generateOtp()
        await storeOtp(normalizedEmail, otp)
        await sendSignupOtpEmail(normalizedEmail, user.first_name, otp)
      } catch (sendErr) {
        console.error('[v0] resend OTP send failed:', sendErr)
        return NextResponse.json(
          { error: 'We could not send the code right now. Please try again.' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If your account needs verification, a new code is on its way.',
    })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
