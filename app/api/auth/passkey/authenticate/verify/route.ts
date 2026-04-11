import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { verifyPasskeyAuth } from '@/lib/passkey'
import { sql } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { sign } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, credential, challengeId } = body

    console.log('[v0] Passkey verify - email:', email || 'not provided')
    console.log('[v0] Passkey verify - challengeId:', challengeId)
    console.log('[v0] Passkey verify - credential.id:', credential?.id?.substring(0, 30) + '...')

    if (!credential) {
      console.log('[v0] Passkey verify - No credential provided')
      return NextResponse.json({ error: 'Credential is required' }, { status: 400 })
    }

    if (!challengeId) {
      console.log('[v0] Passkey verify - No challengeId provided')
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 })
    }

    // Use the challengeId directly - it was stored during options generation
    // For discoverable credentials, this is a UUID; for email-based, it might be the user ID
    console.log('[v0] Passkey verify - Calling verifyPasskeyAuth...')
    let result = await verifyPasskeyAuth(challengeId, credential)
    console.log('[v0] Passkey verify - Initial result:', JSON.stringify(result))
    
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
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE id = ${result.userId}
    `
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult[0]

    // Check if 2FA is required
    const twoFAResult = await sql`
      SELECT totp_enabled FROM user_2fa_settings 
      WHERE user_id = ${user.id} AND totp_enabled = true
    `

    if (twoFAResult.length > 0) {
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

    // Get device info and IP
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'Unknown device'
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0] || 'Unknown'

    // Create session using the same pattern as regular signin
    const sessionId = await createSession(user.id, userAgent, ipAddress)

    // Set session cookie (same as regular signin)
    const cookieStore = await cookies()
    cookieStore.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.first_name,
        lastName: user.last_name
      }
    })
  } catch (error) {
    console.error('Error verifying authentication:', error)
    return NextResponse.json({ error: 'Failed to verify authentication' }, { status: 500 })
  }
}
