import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'
import { invalidateUserMe } from '@/lib/redis'

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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=token_exchange_failed`)
    }
    
    const tokens: GoogleTokenResponse = await tokenResponse.json()
    
    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    
    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=user_info_failed`)
    }
    
    const googleUser: GoogleUserInfo = await userInfoResponse.json()
    
    // Check if user exists by google_id or email
    const existingUserResult = await query(
      `SELECT id, email, google_id, profile_complete, role, is_active 
       FROM users 
       WHERE google_id = $1 OR email = $2 
       LIMIT 1`,
      [googleUser.id, googleUser.email]
    )
    
    let userId: string
    let profileComplete: boolean = false
    
    if (existingUserResult.rows.length > 0) {
      const existingUser = existingUserResult.rows[0]
      
      // Check if account is active
      if (!existingUser.is_active) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=account_suspended`)
      }
      
      userId = existingUser.id
      profileComplete = existingUser.profile_complete || false
      
      // Update google_id if user signed up with email but now using Google
      if (!existingUser.google_id) {
        await query(
          `UPDATE users SET google_id = $1, avatar_url = $2, email_verified = true, updated_at = NOW() WHERE id = $3`,
          [googleUser.id, googleUser.picture, userId]
        )
        // We just refreshed avatar_url for an account that may already
        // have a warm /api/auth/me cache from a prior email sign-in
        // — bust it so the new Google avatar shows immediately.
        invalidateUserMe(userId).catch(() => {})
      }
    } else {
      // Create new user with generated UUID
      const newUserId = uuidv4()
      
      const newUserResult = await query(
        `INSERT INTO users (id, email, first_name, last_name, google_id, avatar_url, email_verified, profile_complete, role)
         VALUES ($1, $2, $3, $4, $5, $6, true, false, 'user')
         RETURNING id`,
        [newUserId, googleUser.email, googleUser.given_name || '', googleUser.family_name || '', googleUser.id, googleUser.picture]
      )
      
      userId = newUserResult.rows[0].id
      profileComplete = false
    }
    
    // Create session
    const sessionToken = await createSession(userId, request.headers.get('user-agent') || '', request.headers.get('x-forwarded-for') || '')
    
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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/complete-profile`)
    }
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
    
  } catch (error) {
    console.error('Google auth error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/signin?error=auth_failed`)
  }
}
