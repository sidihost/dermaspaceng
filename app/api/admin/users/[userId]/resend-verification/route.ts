import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sendSignupOtpEmail } from '@/lib/email'
import { generateOtp, storeOtp } from '@/lib/signup-otp'

/**
 * POST /api/admin/users/[id]/resend-verification
 *
 * Admin-triggered "resend verification code" for any account that hasn't
 * verified its email yet — regular users who never finished signup AND
 * staff/admins who were promoted before verifying.
 *
 * It re-issues a fresh signup OTP (resetting the attempt counter) and emails
 * it via the same `sendSignupOtpEmail` path the signup wizard uses, so the
 * recipient can verify from the normal verify-email screen.
 *
 * Guards: caller must be an admin, the target must exist, and the target
 * must still be unverified (a 409 otherwise so the UI can explain why the
 * button did nothing).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await requireAdmin()
    const { userId: id } = await params

    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 })
    }

    const rows = (await sql`
      SELECT id, email, first_name, email_verified
        FROM users
       WHERE id = ${id}
       LIMIT 1
    `) as Array<{
      id: string
      email: string
      first_name: string | null
      email_verified: boolean
    }>
    const user = rows[0] ?? null

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (user.email_verified === true) {
      return NextResponse.json(
        { error: 'This account is already verified.' },
        { status: 409 },
      )
    }

    try {
      const otp = generateOtp()
      await storeOtp(user.email, otp)
      await sendSignupOtpEmail(user.email, user.first_name || 'there', otp)
    } catch (sendErr) {
      console.error('[v0] Admin resend verification email failed:', sendErr)
      return NextResponse.json(
        { error: 'We could not send the verification email right now. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${user.email}`,
    })
  } catch (error) {
    console.error('[v0] Admin resend verification error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to resend verification: ${message}` },
      { status: 500 },
    )
  }
}
