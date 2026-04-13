import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    if (!username || username.trim() === '') {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase()
    
    console.log('[v0] Profile API - Looking for username:', cleanUsername)

    // Log all usernames to debug
    const allUsernames = await sql`SELECT id, username FROM users WHERE username IS NOT NULL LIMIT 10`
    console.log('[v0] Profile API - Sample usernames in DB:', JSON.stringify(allUsernames.map(u => ({ id: u.id, username: u.username }))))

    // First try exact case-insensitive match on username
    let users = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        username,
        created_at,
        preferred_location
      FROM users 
      WHERE LOWER(username) = ${cleanUsername}
      LIMIT 1
    `
    
    console.log('[v0] Profile API - Found by username:', users.length, 'users')

    // If not found by username, try to find by user ID (for users without usernames)
    if (users.length === 0) {
      console.log('[v0] Profile API - Not found by username, trying ID lookup')
      users = await sql`
        SELECT 
          id,
          first_name,
          last_name,
          username,
          created_at,
          preferred_location
        FROM users 
        WHERE id = ${username}
        LIMIT 1
      `
      console.log('[v0] Profile API - Found by ID:', users.length, 'users')
    }

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = users[0]

    // Get booking count (if bookings table exists)
    let totalBookings = 0
    try {
      const bookings = await sql`
        SELECT COUNT(*) as count FROM bookings WHERE user_id = ${user.id}
      `
      totalBookings = parseInt(bookings[0]?.count || '0')
    } catch {
      // Bookings table may not exist yet
    }

    // Get favorite services from user preferences (if available)
    let favoriteServices: string[] = []
    try {
      const prefs = await sql`
        SELECT interested_services FROM user_preferences WHERE user_id = ${user.id}
      `
      if (prefs[0]?.interested_services) {
        favoriteServices = prefs[0].interested_services
      }
    } catch {
      // Preferences may not exist
    }

    return NextResponse.json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      memberSince: user.created_at,
      preferredLocation: user.preferred_location,
      totalBookings,
      favoriteServices
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
