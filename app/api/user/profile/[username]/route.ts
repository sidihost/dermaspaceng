import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getCurrentUser } from '@/lib/auth'

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

    // Columns we read on both lookup paths. Extracted into a constant so
    // the two queries below stay in lockstep when we add new profile
    // fields (bio, social links, etc.) and we don't ship a bug where
    // one branch returns a richer payload than the other.
    //
    // Exact case-insensitive match on username first.
    let users = await sql`
      SELECT
        id,
        first_name,
        last_name,
        username,
        avatar_url,
        created_at,
        preferred_location,
        bio,
        website,
        instagram,
        twitter,
        tiktok,
        facebook,
        linkedin,
        youtube,
        is_public
      FROM users
      WHERE LOWER(username) = ${cleanUsername}
      LIMIT 1
    `

    // Fallback: allow looking up by user id (supports profile links for
    // users who haven't picked a username yet). Keep the column list in
    // sync with the block above.
    if (users.length === 0) {
      users = await sql`
        SELECT
          id,
          first_name,
          last_name,
          username,
          avatar_url,
          created_at,
          preferred_location,
          bio,
          website,
          instagram,
          twitter,
          tiktok,
          facebook,
          linkedin,
          youtube,
          is_public
        FROM users
        WHERE id::text = ${username}
        LIMIT 1
      `
    }

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = users[0]

    // Privacy gate — if the owner has set their profile to private,
    // only they can see it. We intentionally return the SAME 404
    // shape a non-existent user gets so we don't leak the existence
    // of the account to random visitors (prevents username
    // enumeration by polling /[username]). The owner themselves
    // always gets through so they can preview their own page.
    const isPrivate = user.is_public === false
    if (isPrivate) {
      let viewerId: string | null = null
      try {
        const viewer = await getCurrentUser()
        viewerId = viewer?.id ? String(viewer.id) : null
      } catch {
        viewerId = null
      }
      if (!viewerId || viewerId !== String(user.id)) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
    }

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

    // Normalise a social handle / url input for display. We store
    // whatever the user typed, but the profile view should always
    // produce a tappable URL, so turn bare handles like "@sidi" or
    // "sidi" into full URLs pointing at the right network. Any full
    // URL (http[s]://…) is passed through untouched.
    const socialUrl = (raw: unknown, base: string) => {
      if (typeof raw !== 'string') return null
      const value = raw.trim()
      if (!value) return null
      if (/^https?:\/\//i.test(value)) return value
      const handle = value.replace(/^@+/, '')
      if (!handle) return null
      return `${base}${handle}`
    }

    // Website can be entered without a scheme; always return a
    // navigable https URL (or null if the field is empty).
    const normaliseWebsite = (raw: unknown) => {
      if (typeof raw !== 'string') return null
      const value = raw.trim()
      if (!value) return null
      if (/^https?:\/\//i.test(value)) return value
      return `https://${value}`
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
      bio: user.bio || undefined,
      isPublic: user.is_public === false ? false : true,
      socials: {
        website: normaliseWebsite(user.website),
        instagram: socialUrl(user.instagram, 'https://instagram.com/'),
        twitter: socialUrl(user.twitter, 'https://twitter.com/'),
        tiktok: socialUrl(user.tiktok, 'https://tiktok.com/@'),
        facebook: socialUrl(user.facebook, 'https://facebook.com/'),
        linkedin: socialUrl(user.linkedin, 'https://linkedin.com/in/'),
        youtube: socialUrl(user.youtube, 'https://youtube.com/@'),
      },
    })
  } catch (error) {
    console.error('Public profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
