import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

// Get current user's preferences
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessions = await sql`
      SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const userId = sessions[0].user_id

    const preferences = await sql`
      SELECT skin_type, concerns, preferred_services, preferred_location, notifications, welcome_dismissed
      FROM user_preferences
      WHERE user_id = ${userId}
    `

    if (preferences.length === 0) {
      return NextResponse.json({ preferences: null, welcomeDismissed: false })
    }

    return NextResponse.json({
      preferences: {
        skinType: preferences[0].skin_type || '',
        concerns: preferences[0].concerns || [],
        preferredServices: preferences[0].preferred_services || [],
        preferredLocation: preferences[0].preferred_location || '',
        notifications: preferences[0].notifications ?? true
      },
      welcomeDismissed: preferences[0].welcome_dismissed || false
    })
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Save or update user preferences
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessions = await sql`
      SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const userId = sessions[0].user_id
    const body = await request.json()
    const { skinType, concerns, preferredServices, preferredLocation, notifications, skipped } = body

    if (skipped) {
      // User skipped preferences - save welcome_dismissed flag
      await sql`
        INSERT INTO user_preferences (user_id, notifications, welcome_dismissed)
        VALUES (${userId}, true, true)
        ON CONFLICT (user_id) DO UPDATE SET
          welcome_dismissed = true,
          updated_at = NOW()
      `
    } else {
      // Save full preferences - also mark welcome_dismissed as true since user is interacting with preferences
      await sql`
        INSERT INTO user_preferences (user_id, skin_type, concerns, preferred_services, preferred_location, notifications, welcome_dismissed)
        VALUES (${userId}, ${skinType || null}, ${concerns || []}, ${preferredServices || []}, ${preferredLocation || null}, ${notifications ?? true}, true)
        ON CONFLICT (user_id) DO UPDATE SET
          skin_type = ${skinType || null},
          concerns = ${concerns || []},
          preferred_services = ${preferredServices || []},
          preferred_location = ${preferredLocation || null},
          notifications = ${notifications ?? true},
          welcome_dismissed = true,
          updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save preferences error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
