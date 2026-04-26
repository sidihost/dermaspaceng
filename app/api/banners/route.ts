import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cached, KEYS } from '@/lib/redis'

/**
 * Returns the currently-active banners for a given scope.
 *
 * `scope` query param: 'site' (default), 'dashboard', 'admin'.
 * Only banners marked is_active and within their schedule window are returned.
 *
 * Caching
 * -------
 * Banner data changes rarely (an admin toggles a banner once a day at
 * most), and this endpoint is hit on virtually every page render. We
 * back it with Upstash Redis at a 30-second TTL so:
 *
 *   • Postgres only sees one read per cache window per scope.
 *   • Browsers still see a 2-minute stale-while-revalidate window via
 *     the Cache-Control header, so warm caches stay warm even when
 *     Redis is down.
 *
 * The cache is busted from `/api/admin/banners` on every write — see
 * `invalidateBannerCache()` below.
 */
export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope') || 'site'
  const cacheKey = `${KEYS.banners}:${scope}`

  try {
    const banners = await cached(cacheKey, 30, async () => {
      const rows = await sql`
        SELECT id, message, link_url, link_text, variant, scope, dismissible
        FROM notification_banners
        WHERE is_active = TRUE
          AND (scope = ${scope} OR scope = 'all')
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at   IS NULL OR ends_at   >= NOW())
        ORDER BY created_at DESC
      `
      return rows
    })

    return NextResponse.json(
      { banners },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      },
    )
  } catch {
    // Banners are decorative — never let them take a page down.
    return NextResponse.json({ banners: [] })
  }
}
