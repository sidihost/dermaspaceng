import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Find user with valid reset token
    const users = await sql`
      SELECT id, email, first_name, password_reset_expires
      FROM users 
      WHERE password_reset_token = ${token}
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      )
    }

    const user = users[0]

    // Check if token has expired
    const expiresAt = new Date(user.password_reset_expires)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)

    // Update password and clear reset token
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash},
          password_reset_token = NULL,
          password_reset_expires = NULL,
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    // Optionally invalidate all existing sessions for security
    await sql`
      DELETE FROM sessions WHERE user_id = ${user.id}
    `

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in.'
    })

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
