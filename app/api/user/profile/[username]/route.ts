import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    if (!username || username.trim() === '') {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase()

    // Exact case-insensitive match on username
    let users = await sql`
      SELECT
        id,
        first_name,
        last_name,
        username,
        avatar_url,
        created_at,
        preferred_location
      FROM users
      WHERE LOWER(username) = ${cleanUsername}
      LIMIT 1
    `

    // Fallback: allow looking up by user id (supports profile links for users
    // who haven't picked a username yet).
    if (users.length === 0) {
      users = await sql`
        SELECT
          id,
          first_name,
          last_name,
          username,
          avatar_url,
          created_at,
          preferred_location
        FROM users
        WHERE id::text = ${username}
        LIMIT 1
      `
    }

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = users[0]

    // Public bookings count (only real confirmed/completed ones)
    let totalBookings = 0
    try {
      const bookings = await sql`
        SELECT COUNT(*)::int AS count
        FROM bookings
        WHERE user_id = ${user.id}
          AND status IN ('confirmed', 'completed')
      `
      totalBookings = bookings[0]?.count ?? 0
    } catch {
      totalBookings = 0
    }

    // Favourite services from user preferences (optional table)
    let favoriteServices: string[] = []
    try {
      const prefs = await sql`
        SELECT interested_services
        FROM user_preferences
        WHERE user_id = ${user.id}
        LIMIT 1
      `
      const raw = prefs[0]?.interested_services
      if (Array.isArray(raw)) {
        favoriteServices = raw.slice(0, 6)
      } else if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
          favoriteServices = (JSON.parse(raw) as string[]).slice(0, 6)
        } catch {
          favoriteServices = []
        }
      }
    } catch {
      favoriteServices = []
    }

    return NextResponse.json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      avatarUrl: user.avatar_url || undefined,
      memberSince: user.created_at,
      preferredLocation: user.preferred_location || undefined,
      totalBookings,
      favoriteServices,
    })
  } catch (error) {
    console.error('Public profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
