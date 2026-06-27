// ---------------------------------------------------------------------------
// app/api/blog/personalized/route.ts
//
// Single endpoint that powers every logged-in rail on /blog:
//   * greeting    — first name + time-of-day, so the journal feels personal
//   * recommended — posts matched to the member's skin type + concerns
//   * recent      — "Continue reading" (their most recently opened posts)
//   * saved       — posts they've hearted (user_favorites, item_type='post')
//
// One round-trip keeps the blog island fast on Lagos mobile. Guests get a
// 200 with `{ isLoggedIn: false }` (NOT a 401) so the public page renders
// without any error noise in the SWR cache — identical to the favorites
// route's guest behaviour.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import {
  getRecommendedPosts,
  getRecentlyViewedPosts,
  getSavedPosts,
  type BlogPost,
} from '@/lib/blog'

// Trim the heavy BlogPost row down to just what the card needs on the
// client — keeps the JSON small and avoids leaking draft-only columns.
function toCardPost(p: BlogPost) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover_image_url: p.cover_image_url,
    cover_image_alt: p.cover_image_alt,
    category_slug: p.category_slug ?? null,
    category_name: p.category_name ?? null,
    category_accent: p.category_accent ?? null,
    author_name: p.author_name,
    author_avatar_url: p.author_avatar_url ?? null,
    published_at: p.published_at,
    reading_minutes: p.reading_minutes,
  }
}

interface SessionPrefs {
  user_id: string
  first_name: string | null
  skin_type: string | null
  concerns: unknown
}

// Postgres may hand back text[] as a real array or as the `{a,b}` literal.
function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value.slice(1, -1).split(',').filter(Boolean).map((s) => s.replace(/^"|"$/g, ''))
  }
  return []
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value
    if (!sessionId) return NextResponse.json({ isLoggedIn: false })

    const rows = (await sql`
      SELECT u.id AS user_id, u.first_name, p.skin_type, p.concerns
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN user_preferences p ON p.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
      LIMIT 1
    `) as SessionPrefs[]

    if (rows.length === 0) return NextResponse.json({ isLoggedIn: false })

    const me = rows[0]
    const concerns = parseArray(me.concerns)

    // Recently viewed + saved first, so we can exclude them from the
    // recommendations and keep the three rails showing distinct posts.
    const [recent, saved] = await Promise.all([
      getRecentlyViewedPosts(me.user_id, 4),
      getSavedPosts(me.user_id, 6),
    ])

    const excludeSlugs = Array.from(
      new Set([...recent.map((p) => p.slug), ...saved.map((p) => p.slug)]),
    )

    const recommended = await getRecommendedPosts({
      skinType: me.skin_type,
      concerns,
      excludeSlugs,
      limit: 4,
    })

    // Time-of-day greeting computed server-side off the member's first
    // name. (The client re-derives the time word too, but sending it
    // here means the rail's first paint is already correct.)
    const hour = new Date().getHours()
    const timeWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    return NextResponse.json({
      isLoggedIn: true,
      firstName: me.first_name ?? null,
      greeting: timeWord,
      skinType: me.skin_type ?? null,
      concerns,
      recommended: recommended.map(toCardPost),
      recent: recent.map(toCardPost),
      saved: saved.map(toCardPost),
    })
  } catch (error) {
    console.error('[blog personalized GET]', error)
    // Fail soft — the public blog must still render even if this errors.
    return NextResponse.json({ isLoggedIn: false })
  }
}
