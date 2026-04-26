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

    /*
     * PERFORMANCE — single round-trip
     * --------------------------------
     * This used to be TWO sequential queries (sessions+users JOIN, then
     * a separate user_preferences SELECT). On a Lagos→DB connection
     * each round-trip costs ~150–300ms, so logged-in users were paying
     * ~400ms before mobile-nav could render their name. We now LEFT
     * JOIN preferences in the same statement and unpack with prefixed
     * column aliases so the parsing below stays readable.
     *
     * `LEFT JOIN` (not INNER) is critical — most users don't have a
     * `user_preferences` row yet, and we MUST still return their auth
     * state in that case.
     */
    const rows = await sql`
      SELECT
        s.id          AS session_id,
        u.id          AS user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.avatar_url,
        u.username,
        /*
         * DOB as a plain YYYY-MM-DD string so the client can compare
         * month/day in the user's local timezone without Date-object
         * timezone drift (matters for the birthday banner).
         */
        TO_CHAR(u.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
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
        u.cover_style,
        /* user_preferences (nullable — LEFT JOIN). */
        p.skin_type            AS p_skin_type,
        p.concerns             AS p_concerns,
        p.preferred_services   AS p_preferred_services,
        p.preferred_location   AS p_preferred_location,
        p.notifications        AS p_notifications,
        p.welcome_dismissed    AS p_welcome_dismissed,
        p.avatar_intro_dismissed AS p_avatar_intro_dismissed
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN user_preferences p ON p.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const session = rows[0]
    // Re-shape for the rest of the handler — keeping the legacy
    // `preferences[0]` access pattern below means a tiny adapter
    // here is cheaper than rewriting the response section.
    const hasPrefs =
      session.p_skin_type !== null ||
      session.p_concerns !== null ||
      session.p_preferred_services !== null ||
      session.p_preferred_location !== null ||
      session.p_notifications !== null ||
      session.p_welcome_dismissed !== null ||
      session.p_avatar_intro_dismissed !== null
    const preferences = hasPrefs
      ? [{
          skin_type: session.p_skin_type,
          concerns: session.p_concerns,
          preferred_services: session.p_preferred_services,
          preferred_location: session.p_preferred_location,
          notifications: session.p_notifications,
          welcome_dismissed: session.p_welcome_dismissed,
          avatar_intro_dismissed: session.p_avatar_intro_dismissed,
        }]
      : []

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

    const response = NextResponse.json({
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
    // Tiny private cache — the browser may reuse this response for up
    // to 30s before re-hitting the origin. We're scoped to *this user*
    // because the response is keyed by the `session_id` HttpOnly cookie
    // (so different users will never share a cached body), and the
    // shape only changes when the user themselves updates their
    // profile. The client invalidates immediately on profile-edit by
    // dispatching the existing 'user-updated' event which forces a
    // fresh `mutate()` from the SWR-backed useAuth hook. Net effect:
    // bouncing between pages within the same tab no longer hits the
    // DB at all for the first ~30 seconds.
    response.headers.set('Cache-Control', 'private, max-age=30, must-revalidate')
    return response
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
