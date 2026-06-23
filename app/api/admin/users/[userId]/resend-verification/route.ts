import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { sendOnboardingReminderEmail } from '@/lib/email'

/**
 * POST /api/admin/users/[id]/resend-verification
 *
 * Admin-triggered "resend verification code" for any account that hasn't
 * verified its email yet — regular users who never finished signup AND
 * staff/admins who were promoted before verifying.
 *
 * It emails a link-only verification nudge (no inline code) whose button
 * points at the verify-email page with ?send=1, so a fresh code is auto-issued
 * the moment the recipient lands there — nothing to expire in transit.
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
      // Link-only email: a single "Complete my verification" button pointing
      // at the verify page with ?send=1, which auto-issues a fresh code on
      // arrival. No inline OTP here — the recipient gets the code on the page
      // they land on, so there's nothing to expire in transit.
      await sendOnboardingReminderEmail({
        email: user.email,
        firstName: user.first_name || 'there',
        stage: 'verify',
        overrides: {
          headline: 'Complete your email verification',
          eyebrow: 'Complete your verification',
          ctaLabel: 'Complete my verification',
          subject: 'Complete your Dermaspace email verification',
          preheader: 'Tap the button to verify your email and activate your Dermaspace account.',
          body: `Your Dermaspace account isn't active yet because your email
                 hasn't been verified. Tap the button below to verify your
                 email and finish setting up your account.`,
        },
      })
    } catch (sendErr) {
      console.error('[v0] Admin resend verification email failed:', sendErr)
      return NextResponse.json(
        { error: 'We could not send the verification email right now. Please try again.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Verification link sent to ${user.email}`,
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
