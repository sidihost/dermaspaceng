import { NextResponse } from 'next/server'
import { verifyEmail } from '@/lib/auth'
import { sql } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Look up which user this token belongs to BEFORE we consume it,
    // so we can send the welcome email after a successful flip. We
    // also check `email_verified` so a re-tapped link from an already
    // verified account doesn't trigger a duplicate welcome email.
    const candidates = (await sql`
      SELECT id, email, first_name, email_verified
        FROM users
       WHERE verification_token = ${token}
       LIMIT 1
    `) as Array<{
      id: string
      email: string
      first_name: string
      email_verified: boolean
    }>
    const candidate = candidates[0] ?? null

    const success = await verifyEmail(token)

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Welcome email — best-effort. We deliberately fire it only on the
    // first successful verification (i.e. the candidate row was still
    // unverified at lookup time) so users who re-click an old link
    // from their inbox don't get spammed with duplicates. Failures
    // here never roll back verification — the account is already
    // good, the email is just a courtesy.
    if (candidate && !candidate.email_verified) {
      try {
        await sendWelcomeEmail({
          email: candidate.email,
          firstName: candidate.first_name,
        })
      } catch (welcomeErr) {
        console.error('[v0] welcome email failed:', welcomeErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
