import { NextResponse } from 'next/server'
import { createUser, verifyHCaptcha } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, password, captchaToken } = body

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
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

    // Create user
    const { user, error } = await createUser({
      email,
      password,
      firstName,
      lastName,
      phone
    })

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Failed to create account' },
        { status: 400 }
      )
    }

    // Get verification token
    const users = await sql`SELECT verification_token FROM users WHERE id = ${user.id}`
    const verificationToken = users[0]?.verification_token

    // Send verification email
    if (verificationToken) {
      await sendVerificationEmail(email, firstName, verificationToken)
    }

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify.'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
