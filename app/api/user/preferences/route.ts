import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { randomUUID } from 'crypto'

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

    // Helper to ensure we always return an array (PostgreSQL may return string or array)
    const parseArray = (value: unknown): string[] => {
      if (Array.isArray(value)) return value
      if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
        // PostgreSQL array format: {item1,item2,item3}
        return value.slice(1, -1).split(',').filter(Boolean).map(s => s.replace(/^"|"$/g, ''))
      }
      return []
    }

    return NextResponse.json({
      preferences: {
        skinType: preferences[0].skin_type || '',
        concerns: parseArray(preferences[0].concerns),
        preferredServices: parseArray(preferences[0].preferred_services),
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

    // Ensure arrays are properly formatted for PostgreSQL
    const concernsArray = Array.isArray(concerns) ? concerns : []
    const servicesArray = Array.isArray(preferredServices) ? preferredServices : []

    if (skipped) {
      // User skipped preferences - save welcome_dismissed flag
      const prefId = randomUUID()
      await sql`
        INSERT INTO user_preferences (id, user_id, notifications, welcome_dismissed)
        VALUES (${prefId}, ${userId}, true, true)
        ON CONFLICT (user_id) DO UPDATE SET
          welcome_dismissed = true,
          updated_at = NOW()
      `
    } else {
      // Save full preferences - Neon serverless driver handles arrays natively
      const prefId = randomUUID()
      await sql`
        INSERT INTO user_preferences (id, user_id, skin_type, concerns, preferred_services, preferred_location, notifications, welcome_dismissed)
        VALUES (
          ${prefId},
          ${userId}, 
          ${skinType || null}, 
          ${concernsArray}, 
          ${servicesArray}, 
          ${preferredLocation || null}, 
          ${notifications ?? true}, 
          true
        )
        ON CONFLICT (user_id) DO UPDATE SET
          skin_type = ${skinType || null},
          concerns = ${concernsArray},
          preferred_services = ${servicesArray},
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
