import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { username, token } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    if (!token) {
      return NextResponse.json({ error: 'Verification token required' }, { status: 400 })
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-30 characters, letters, numbers, and underscores only' 
      }, { status: 400 })
    }

    // Check reserved usernames
    const reserved = ['admin', 'dashboard', 'settings', 'api', 'booking', 'services', 'about', 'contact', 'signin', 'signup', 'profile', 'user', 'dermaspace', 'dermaspaceng', 'staff', 'blocked', 'consultation', 'feedback', 'gallery', 'membership', 'packages', 'survey', 'verify']
    if (reserved.includes(username.toLowerCase())) {
      return NextResponse.json({ error: 'This username is reserved' }, { status: 400 })
    }

    // Check if username is already taken
    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username})`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // Find user by verification token (we reuse this token briefly after verification)
    // Or find recently verified user by email from token
    const users = await sql`
      SELECT id FROM users 
      WHERE email_verified = true 
      AND username IS NULL
      AND updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (users.length === 0) {
      // Try to find by the token if it's still in the URL
      const usersByToken = await sql`
        SELECT id FROM users WHERE verification_token = ${token}
      `
      if (usersByToken.length === 0) {
        return NextResponse.json({ error: 'Session expired. Please sign in to set your username.' }, { status: 401 })
      }
      
      // Update username
      await sql`UPDATE users SET username = ${username} WHERE id = ${usersByToken[0].id}`
    } else {
      // Update username for recently verified user
      await sql`UPDATE users SET username = ${username} WHERE id = ${users[0].id}`
    }

    return NextResponse.json({ success: true, username })
  } catch (error) {
    console.error('Set username error:', error)
    return NextResponse.json({ error: 'Failed to set username' }, { status: 500 })
  }
}
