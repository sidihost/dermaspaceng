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
    // NOTE: `preferred_location` was removed because it isn't a column
    // on the `users` table (it lives on `user_preferences` instead),
    // and selecting it was throwing a 500 that surfaced to end users
    // as the "Something went wrong" profile error card. The profile
    // payload below already returns `preferredLocation: undefined`,
    // so no downstream consumers need to change.
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
        bio,
        website,
        instagram,
        twitter,
        tiktok,
        facebook,
        linkedin,
        youtube,
        is_public,
        cover_style
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
          bio,
          website,
          instagram,
          twitter,
          tiktok,
          facebook,
          linkedin,
          youtube,
          is_public,
          cover_style
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

    // Recent published blog articles authored by this user. Powers
    // the "Articles" section on /[username] so any reader who taps a
    // commenter's name (or the byline on a blog post) can see what
    // else they've written for Dermaspace. Wrapped in try/catch so a
    // missing blog_posts table on a fresh DB never tanks the whole
    // profile response — we just degrade to no-articles in that case.
    type RecentArticle = {
      id: string
      slug: string
      title: string
      excerpt: string | null
      coverImageUrl: string | null
      publishedAt: string | null
      readingMinutes: number
      categoryName: string | null
      categorySlug: string | null
      categoryAccent: string | null
    }
    let recentArticles: RecentArticle[] = []
    let articleCount = 0
    try {
      const counts = await sql`
        SELECT COUNT(*)::int AS n
        FROM blog_posts
        WHERE author_id = ${String(user.id)}
          AND status = 'published'
          AND published_at <= NOW()
      `
      articleCount = counts[0]?.n ?? 0
      if (articleCount > 0) {
        const rows = await sql`
          SELECT
            p.id,
            p.slug,
            p.title,
            p.excerpt,
            p.cover_image_url,
            p.published_at,
            p.reading_minutes,
            c.name        AS category_name,
            c.slug        AS category_slug,
            c.accent_hex  AS category_accent
          FROM blog_posts p
          LEFT JOIN blog_categories c ON c.id = p.category_id
          WHERE p.author_id = ${String(user.id)}
            AND p.status = 'published'
            AND p.published_at <= NOW()
          ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
          LIMIT 6
        `
        recentArticles = rows.map((r) => ({
          id: String(r.id),
          slug: String(r.slug),
          title: String(r.title),
          excerpt: r.excerpt ? String(r.excerpt) : null,
          coverImageUrl: r.cover_image_url ? String(r.cover_image_url) : null,
          publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
          readingMinutes: Number(r.reading_minutes ?? 5),
          categoryName: r.category_name ? String(r.category_name) : null,
          categorySlug: r.category_slug ? String(r.category_slug) : null,
          categoryAccent: r.category_accent ? String(r.category_accent) : null,
        }))
      }
    } catch (err) {
      console.warn('[profile] recentArticles lookup failed:', err)
      recentArticles = []
      articleCount = 0
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
      // Preset slug for the profile cover. The client resolves a
      // deterministic fallback when this is null, so every profile
      // gets a lovely cover even if the owner hasn't picked one.
      coverStyle:
        typeof user.cover_style === 'string' && user.cover_style !== ''
          ? user.cover_style
          : null,
      memberSince: user.created_at,
      // `preferredLocation` is intentionally omitted from the SELECT now
      // (the column lives on `user_preferences`, not `users`). Leaving
      // the key undefined preserves the public response shape for any
      // consumer that was reading it.
      preferredLocation: undefined,
      totalBookings,
      favoriteServices,
      // Public author surface — the count powers a header chip
      // ("3 articles") and the array drives the "Articles by …"
      // section on /[username]. Both are empty for non-authors,
      // which the UI hides automatically.
      articleCount,
      recentArticles,
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
