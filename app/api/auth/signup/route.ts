import { NextResponse } from 'next/server'
import { createUser, verifyHCaptcha } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, password, captchaToken, dateOfBirth } = body

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // DOB is optional, but if supplied validate it: must be a real date, not
    // in the future, and the user must be at least 13 (standard COPPA floor).
    let normalizedDob: string | null = null
    if (dateOfBirth && typeof dateOfBirth === 'string' && dateOfBirth.trim() !== '') {
      const d = new Date(dateOfBirth)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
      }
      const now = new Date()
      if (d > now) {
        return NextResponse.json({ error: 'Date of birth cannot be in the future' }, { status: 400 })
      }
      const thirteenYearsAgo = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate())
      if (d > thirteenYearsAgo) {
        return NextResponse.json({ error: 'You must be at least 13 years old to sign up' }, { status: 400 })
      }
      normalizedDob = dateOfBirth
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
      phone,
      dateOfBirth: normalizedDob,
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
