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
      SELECT s.*, u.id as user_id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url
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
      SELECT skin_type, concerns, preferred_services, preferred_location, notifications
      FROM user_preferences
      WHERE user_id = ${session.user_id}
    `

    return NextResponse.json({
      user: {
        id: session.user_id,
        email: session.email,
        firstName: session.first_name,
        lastName: session.last_name,
        phone: session.phone,
        avatarUrl: session.avatar_url
      },
      preferences: preferences.length > 0 ? {
        skinType: preferences[0].skin_type || '',
        concerns: preferences[0].concerns || [],
        preferredServices: preferences[0].preferred_services || [],
        preferredLocation: preferences[0].preferred_location || '',
        notifications: preferences[0].notifications ?? true
      } : null
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
