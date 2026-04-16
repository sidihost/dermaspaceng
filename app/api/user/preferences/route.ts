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
    
    // Convert arrays to PostgreSQL array literal format: {"item1","item2"}
    const toPostgresArray = (arr: string[]): string => {
      if (arr.length === 0) return '{}'
      return '{' + arr.map(item => `"${item.replace(/"/g, '\\"')}"`).join(',') + '}'
    }
    
    const concernsLiteral = toPostgresArray(concernsArray)
    const servicesLiteral = toPostgresArray(servicesArray)

    console.log('[v0] Saving preferences for user:', userId)
    console.log('[v0] skinType:', skinType)
    console.log('[v0] concernsLiteral:', concernsLiteral)
    console.log('[v0] servicesLiteral:', servicesLiteral)
    console.log('[v0] preferredLocation:', preferredLocation)
    console.log('[v0] notifications:', notifications)
    console.log('[v0] skipped:', skipped)

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
      // Cast the array literals to text[] type
      await sql`
        INSERT INTO user_preferences (user_id, skin_type, concerns, preferred_services, preferred_location, notifications, welcome_dismissed)
        VALUES (
          ${userId}, 
          ${skinType || null}, 
          ${concernsLiteral}::text[], 
          ${servicesLiteral}::text[], 
          ${preferredLocation || null}, 
          ${notifications ?? true}, 
          true
        )
        ON CONFLICT (user_id) DO UPDATE SET
          skin_type = ${skinType || null},
          concerns = ${concernsLiteral}::text[],
          preferred_services = ${servicesLiteral}::text[],
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
