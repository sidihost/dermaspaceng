import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { neon } from '@neondatabase/serverless'
import { verify } from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL!)

// Check if username is available
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username must be 3-30 characters, letters, numbers, and underscores only' 
      })
    }

    // Check reserved usernames
    const reserved = ['admin', 'dashboard', 'settings', 'api', 'booking', 'services', 'about', 'contact', 'signin', 'signup', 'profile', 'user', 'dermaspace', 'dermaspaceng']
    if (reserved.includes(username.toLowerCase())) {
      return NextResponse.json({ available: false, error: 'This username is reserved' })
    }

    // Check if username exists
    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username})`
    
    return NextResponse.json({ available: existing.length === 0 })
  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json({ error: 'Failed to check username' }, { status: 500 })
  }
}

// Set/update username
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string }
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-30 characters, letters, numbers, and underscores only' 
      }, { status: 400 })
    }

    // Check reserved usernames
    const reserved = ['admin', 'dashboard', 'settings', 'api', 'booking', 'services', 'about', 'contact', 'signin', 'signup', 'profile', 'user', 'dermaspace', 'dermaspaceng']
    if (reserved.includes(username.toLowerCase())) {
      return NextResponse.json({ error: 'This username is reserved' }, { status: 400 })
    }

    // Check if username is taken by another user
    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username}) AND id != ${decoded.userId}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // Update username
    await sql`UPDATE users SET username = ${username} WHERE id = ${decoded.userId}`

    return NextResponse.json({ success: true, username })
  } catch (error) {
    console.error('Username update error:', error)
    return NextResponse.json({ error: 'Failed to update username' }, { status: 500 })
  }
}
