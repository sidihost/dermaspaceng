import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { cached, KEYS } from '@/lib/redis'

/*
 * /api/auth/me — hydrates the signed-in user for the client.
 *
 * Two-stage design (perf-critical, called on every navigation by the
 * mobile-nav profile slot, dashboard widgets, etc.):
 *
 *   1. Quick Postgres lookup of `sessions` to resolve the cookie
 *      session-id → user-id. This MUST be live (not cached) because
 *      it's the security-relevant step — if the row was deleted by
 *      a logout/expiry we have to honour that immediately.
 *
 *   2. Redis-cached read of the much heavier
 *      users LEFT JOIN user_preferences blob. Keyed by USER ID (not
 *      session id) so a profile update on any device invalidates the
 *      cache for ALL of that user's logged-in sessions in a single
 *      `invalidateUserMe(userId)` call from
 *      /api/auth/profile, /api/auth/password, etc.
 *
 * On a Redis hit the route is roughly 10–20ms end-to-end (one quick
 * `SELECT user_id FROM sessions WHERE id = $1` + one Redis GET) vs.
 * the previous ~250–400ms join-on-every-call. A 60s TTL bounds
 * staleness in case someone forgets to invalidate.
 */

interface CachedUserRow {
  user_id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  username: string | null
  date_of_birth: string | null
  bio: string | null
  website: string | null
  instagram: string | null
  twitter: string | null
  tiktok: string | null
  facebook: string | null
  linkedin: string | null
  youtube: string | null
  is_public: boolean | null
  gender: string | null
  cover_style: string | null
  legal_accepted_version: string | null
  legal_accepted_at: string | null
  p_skin_type: string | null
  p_concerns: unknown
  p_preferred_services: unknown
  p_preferred_location: string | null
  p_notifications: boolean | null
  p_welcome_dismissed: boolean | null
  p_avatar_intro_dismissed: boolean | null
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // STAGE 1 — live session check. Tiny single-row PK lookup; can't
    // be cached because logout/expiry must take effect instantly.
    const sessionRows = await sql`
      SELECT user_id
      FROM sessions
      WHERE id = ${sessionId} AND expires_at > NOW()
      LIMIT 1
    `
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }
    const userId = sessionRows[0].user_id as string

    // STAGE 2 — heavy join, served from Redis when warm. Cache key is
    // `user:me:<userId>`; 60s TTL; producer runs the JOIN against
    // Postgres exactly the way it used to.
    const session = await cached<CachedUserRow | null>(
      `${KEYS.userMe}:${userId}`,
      60,
      async () => {
        const rows = await sql`
          SELECT
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
            u.legal_accepted_version,
            u.legal_accepted_at,
            /* user_preferences (nullable — LEFT JOIN). */
            p.skin_type            AS p_skin_type,
            p.concerns             AS p_concerns,
            p.preferred_services   AS p_preferred_services,
            p.preferred_location   AS p_preferred_location,
            p.notifications        AS p_notifications,
            p.welcome_dismissed    AS p_welcome_dismissed,
            p.avatar_intro_dismissed AS p_avatar_intro_dismissed
          FROM users u
          LEFT JOIN user_preferences p ON p.user_id = u.id
          WHERE u.id = ${userId}
          LIMIT 1
        `
        return (rows[0] as CachedUserRow | undefined) ?? null
      },
    )

    if (!session) {
      // Defensive — session row pointed at a missing user. Treat as
      // expired so the client clears its state.
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Re-shape preferences for the response. We keep the legacy
    // `preferences[0]` access pattern below so the JSON output matches
    // what every existing consumer already expects.
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
        gender: (session.gender === 'male' || session.gender === 'female') ? session.gender : null,
        coverStyle:
          typeof session.cover_style === 'string' && session.cover_style !== ''
            ? session.cover_style
            : null,
        /*
         * Legal-pack acceptance — null/null for legacy users. The
         * client compares `legalAcceptedVersion` to
         * `CURRENT_LEGAL_VERSION` from `lib/legal.ts`; any mismatch
         * (including null) triggers the dashboard gate.
         */
        legalAcceptedVersion:
          typeof session.legal_accepted_version === 'string' &&
          session.legal_accepted_version !== ''
            ? session.legal_accepted_version
            : null,
        legalAcceptedAt: session.legal_accepted_at
          ? new Date(session.legal_accepted_at).toISOString()
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

    // Browser-side private cache — within the same tab the response
    // can be reused for ~30 seconds without re-hitting the origin.
    // Different users never share a cache entry because the body is
    // gated by the HttpOnly `session_id` cookie. The 'user-updated'
    // event in the client forces SWR to refetch with a cache-busting
    // request when the user themselves edits their profile.
    response.headers.set('Cache-Control', 'private, max-age=30, must-revalidate')
    return response
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
