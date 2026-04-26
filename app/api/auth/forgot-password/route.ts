import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { randomBytes } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimit } from '@/lib/redis'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Rate limit at TWO levels: per IP (catches form-spam) and per email
    // (caps the inbox-bombing risk where someone repeatedly hits this
    // endpoint with a victim's address). Cap is intentionally tight on
    // the per-email side because a real user only needs ONE reset email
    // every few minutes.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const emailLower = String(email).toLowerCase().slice(0, 254)
    const ipLimit = await rateLimit('forgot:ip', ip, 10, 600)
    const mailLimit = await rateLimit('forgot:mail', emailLower, 3, 600)
    if (!ipLimit.ok || !mailLimit.ok) {
      // Same generic response we use on the success path so an attacker
      // can't infer rate-limit state to enumerate emails.
      return NextResponse.json({
        success: true,
        message:
          'If an account with that email exists, we sent a password reset link.',
      })
    }

    // Find user by email
    const users = await sql`
      SELECT id, email, first_name 
      FROM users 
      WHERE LOWER(email) = LOWER(${email})
    `

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we sent a password reset link.'
      })
    }

    const user = users[0]

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Save reset token to database
    await sql`
      UPDATE users 
      SET password_reset_token = ${resetToken},
          password_reset_expires = ${resetExpires.toISOString()}
      WHERE id = ${user.id}
    `

    // Send password reset email
    await sendPasswordResetEmail(user.email, user.first_name, resetToken)

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we sent a password reset link.'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
