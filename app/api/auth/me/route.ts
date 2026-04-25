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
             TO_CHAR(u.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
             /*
              * Profile-page extras. /dashboard/settings hydrates its bio
              * and social inputs from THIS endpoint (via AuthContext), so
              * if we don't return these columns the form always appears
              * blank on reload even though /api/auth/profile saved them
              * successfully — that was the root cause of the "bio/socials
              * aren't showing in account settings" bug.
              */
             u.bio,
             u.website,
             u.instagram,
             u.twitter,
             u.tiktok,
             u.facebook,
             u.linkedin,
             u.youtube,
             u.is_public,
             u.gender,
             u.cover_style
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
      SELECT skin_type, concerns, preferred_services, preferred_location, notifications, welcome_dismissed, avatar_intro_dismissed
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
    // Whether the user has already seen + dismissed the curated-avatar
    // intro modal. The dashboard reads this on first load to decide
    // whether the tour pops up — null/missing rows count as "not seen".
    const avatarIntroDismissed = preferences.length > 0 ? (preferences[0].avatar_intro_dismissed || false) : false

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
        // Profile-page extras (see SELECT comment above). The settings
        // form reads these keys verbatim (authData.user.bio, .instagram,
        // etc.) so the camelCase shape here has to mirror the PUT
        // response in /api/auth/profile exactly.
        bio: session.bio || null,
        website: session.website || null,
        instagram: session.instagram || null,
        twitter: session.twitter || null,
        tiktok: session.tiktok || null,
        facebook: session.facebook || null,
        linkedin: session.linkedin || null,
        youtube: session.youtube || null,
        // Coerce to a real boolean — Postgres returns `true`/`false`
        // but some driver wrappers hand it back as a string. Legacy
        // rows default to TRUE via the migration's column default.
        isPublic: session.is_public === false ? false : true,
        // Gender is used by the client to filter the avatar picker
        // (male users only see male avatars, and vice versa). Null
        // for legacy accounts that signed up before gender existed —
        // those users are prompted to pick one in settings.
        gender: (session.gender === 'male' || session.gender === 'female') ? session.gender : null,
        // Preset slug for the profile cover. Null means "no explicit
        // pick" — the client falls back to a deterministic preset
        // derived from the user id so every profile still looks
        // intentional out of the box.
        coverStyle:
          typeof session.cover_style === 'string' && session.cover_style !== ''
            ? session.cover_style
            : null,
      },
      preferences: preferences.length > 0 ? {
        skinType: preferences[0].skin_type || '',
        concerns: parseArray(preferences[0].concerns),
        preferredServices: parseArray(preferences[0].preferred_services),
        preferredLocation: preferences[0].preferred_location || '',
        notifications: preferences[0].notifications ?? true
      } : null,
      welcomeDismissed,
      avatarIntroDismissed,
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
