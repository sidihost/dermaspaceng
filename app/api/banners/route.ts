import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

/**
 * Returns the currently-active banners for a given scope.
 * `scope` query param: 'site' (default), 'dashboard', 'admin'.
 * Only banners marked is_active and within their schedule window are returned.
 */
export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get('scope') || 'site'
  try {
    const banners = await sql`
      SELECT id, message, link_url, link_text, variant, scope, dismissible
      FROM notification_banners
      WHERE is_active = TRUE
        AND (scope = ${scope} OR scope = 'all')
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at   IS NULL OR ends_at   >= NOW())
      ORDER BY created_at DESC
    `
    return NextResponse.json({ banners }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json({ banners: [] })
  }
}
