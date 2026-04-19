import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.first_name, u.last_name,
             u.phone, u.avatar_url, u.username,
             /*
              * We return DOB as a plain YYYY-MM-DD string (CAST to TEXT) so
              * the client can do month/day comparisons in the user's local
              * timezone without worrying about Date-object timezone drift,
              * which is critical for the birthday celebration banner.
              */
             TO_CHAR(u.date_of_birth, 'YYYY-MM-DD') AS date_of_birth
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const session = sessions[0]

    // Fetch user preferences from database
    const preferences = await sql`
      SELECT skin_type, concerns, preferred_services, preferred_location, notifications, welcome_dismissed
      FROM user_preferences
      WHERE user_id = ${session.user_id}
    `

    // Helper to ensure we always return an array (PostgreSQL may return string or array)
    const parseArray = (value: unknown): string[] => {
      if (Array.isArray(value)) return value
      if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
        // PostgreSQL array format: {item1,item2,item3}
        return value.slice(1, -1).split(',').filter(Boolean).map(s => s.replace(/^"|"$/g, ''))
      }
      return []
    }

    const welcomeDismissed = preferences.length > 0 ? (preferences[0].welcome_dismissed || false) : false
    
    return NextResponse.json({
      user: {
        id: session.user_id,
        email: session.email,
        firstName: session.first_name,
        lastName: session.last_name,
        phone: session.phone,
        avatarUrl: session.avatar_url,
        username: session.username,
        dateOfBirth: session.date_of_birth || null,
      },
      preferences: preferences.length > 0 ? {
        skinType: preferences[0].skin_type || '',
        concerns: parseArray(preferences[0].concerns),
        preferredServices: parseArray(preferences[0].preferred_services),
        preferredLocation: preferences[0].preferred_location || '',
        notifications: preferences[0].notifications ?? true
      } : null,
      welcomeDismissed
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
