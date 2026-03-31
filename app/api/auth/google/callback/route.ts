import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

interface GoogleTokenResponse {
  access_token: string
  id_token: string
  expires_in: number
  token_type: string
}

interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=google_auth_failed`)
  }
  
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=no_code`)
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    
    if (!tokenResponse.ok) {
      console.error('[v0] Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=token_exchange_failed`)
    }
    
    const tokens: GoogleTokenResponse = await tokenResponse.json()
    
    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    
    if (!userInfoResponse.ok) {
      console.error('[v0] User info fetch failed')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=user_info_failed`)
    }
    
    const googleUser: GoogleUserInfo = await userInfoResponse.json()
    console.log('[v0] Google user retrieved:', googleUser.email)
    
    // Check if user exists by google_id or email
    console.log('[v0] Checking existing user...')
    const existingUserResult = await query(
      `SELECT id, email, google_id, profile_complete, role, is_active 
       FROM users 
       WHERE google_id = $1 OR email = $2 
       LIMIT 1`,
      [googleUser.id, googleUser.email]
    )
    
    console.log('[v0] Existing user result:', existingUserResult)
    
    let userId: string
    let profileComplete: boolean = false
    
    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0]
      console.log('[v0] User exists:', existingUser)
      
      // Check if account is active
      if (!existingUser.is_active) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=account_suspended`)
      }
      
      userId = existingUser.id
      profileComplete = existingUser.profile_complete || false
      
      // Update google_id if user signed up with email but now using Google
      if (!existingUser.google_id) {
        console.log('[v0] Updating google_id for existing user')
        await query(
          `UPDATE users SET google_id = $1, avatar_url = $2, email_verified = true, updated_at = NOW() WHERE id = $3`,
          [googleUser.id, googleUser.picture, userId]
        )
      }
    } else {
      console.log('[v0] Creating new user...')
      // Create new user with generated UUID
      const newUserId = uuidv4()
      console.log('[v0] Generated user ID:', newUserId)
      
      const newUserResult = await query(
        `INSERT INTO users (id, email, first_name, last_name, google_id, avatar_url, email_verified, profile_complete, role)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, 'user')
         RETURNING id`,
        [newUserId, googleUser.email, googleUser.given_name || '', googleUser.family_name || '', googleUser.id, googleUser.picture]
      )
      
      console.log('[v0] New user created:', newUserResult)
      userId = newUserResult.rows[0].id
      profileComplete = false
    }
    
    // Create session
    console.log('[v0] Creating session for user:', userId)
    const sessionToken = await createSession(userId, request.headers.get('user-agent') || '', request.headers.get('x-forwarded-for') || '')
    console.log('[v0] Session created:', sessionToken)
    
    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session_id', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    
    // Redirect based on profile completion
    if (!profileComplete) {
      console.log('[v0] Redirecting to complete-profile')
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/complete-profile`)
    }
    
    console.log('[v0] Redirecting to dashboard')
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
    
  } catch (error) {
    console.error('[v0] Google auth error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=auth_failed`)
  }
}
