import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyPasskeyAuth } from '@/lib/passkey'
import { sql } from '@/lib/db'
import { sign } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, credential, challengeId } = body

    if (!credential) {
      return NextResponse.json({ error: 'Credential is required' }, { status: 400 })
    }

    if (!challengeId) {
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 })
    }

    // Use the challengeId directly - it was stored during options generation
    // For discoverable credentials, this is a UUID; for email-based, it might be the user ID
    let result = await verifyPasskeyAuth(challengeId, credential)
    
    // If verification failed and we have email, try to find user and verify with their passkey
    if (!result.success && email) {
      // Get user by email
      const users = await sql`
        SELECT id FROM users WHERE email = ${email.toLowerCase()}
      `
      
      if (users.length > 0) {
        const userId = users[0].id
        
        // Get user's passkey credentials
        const credentials = await sql`
          SELECT * FROM passkey_credentials WHERE user_id = ${userId}
        `
        
        if (credentials.length > 0) {
          // Use the first credential's ID as challengeId to verify
          // The verifyPasskeyAuth will look up credentials by credential ID
          result = await verifyPasskeyAuth(userId, credential)
        }
      }
    }
    
    if (!result.success || !result.userId) {
      return NextResponse.json({ error: result.error || 'Authentication failed' }, { status: 401 })
    }

    // Get user details
    const userResult = await sql`
      SELECT id, email, name, role, requires_2fa 
      FROM users 
      WHERE id = ${result.userId}
    `
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult[0]

    // Check if 2FA is required
    if (user.requires_2fa) {
      // Check if 2FA is set up
      const twoFaResult = await sql`
        SELECT id FROM user_2fa_settings 
        WHERE user_id = ${user.id} AND is_enabled = true
      `
      
      if (twoFaResult.length > 0) {
        // Return partial auth token for 2FA verification
        const partialToken = sign(
          { userId: user.id, email: user.email, requires2FA: true },
          JWT_SECRET,
          { expiresIn: '5m' }
        )
        
        return NextResponse.json({ 
          requires2FA: true, 
          partialToken,
          message: 'Please complete 2FA verification' 
        })
      }
    }

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
    console.error('Error verifying authentication:', error)
    return NextResponse.json({ error: 'Failed to verify authentication' }, { status: 500 })
  }
}
