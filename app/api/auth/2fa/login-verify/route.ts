import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { verifyTOTPCode } from '@/lib/totp'
import { verify, sign } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { partialToken, code } = body

    if (!partialToken || !code) {
      return NextResponse.json({ error: 'Token and code are required' }, { status: 400 })
    }

    // Verify the partial token
    let decoded: { userId: string; email: string; requires2FA: boolean }
    try {
      decoded = verify(partialToken, JWT_SECRET) as typeof decoded
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    if (!decoded.requires2FA) {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 })
    }

    // Verify the TOTP code
    const isValid = await verifyTOTPCode(decoded.userId, code)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Get user details
    const userResult = await sql`
      SELECT id, email, name, role FROM users WHERE id = ${decoded.userId}
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult[0]

    // Create full session token
    const token = sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Set auth cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Error verifying 2FA login:', error)
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 })
  }
}
