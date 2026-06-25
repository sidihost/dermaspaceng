import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/*
 * GET /api/admin/newsletter/audience-counts
 *
 * Returns the live size of each campaign audience so the composer can
 * show the admin exactly how many people a "Send to all" will reach
 * before they commit:
 *
 *   subscribers — active rows on the marketing newsletter list.
 *   customers   — active, non-deleted registered accounts with an
 *                 email, MINUS anyone who opted out of promotional
 *                 email. This mirrors the recipient query in the
 *                 send route so the preview count matches reality.
 */

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subRows = await sql`
      SELECT COUNT(*)::int AS count
      FROM newsletter_subscribers
      WHERE COALESCE(status, 'active') = 'active'
        AND email IS NOT NULL
        AND email <> ''
    `

    const custRows = await sql`
      SELECT COUNT(DISTINCT lower(u.email))::int AS count
      FROM users u
      LEFT JOIN user_preferences p ON p.user_id = u.id
      WHERE u.email IS NOT NULL
        AND u.email <> ''
        AND COALESCE(u.is_active, true) = true
        AND u.deleted_at IS NULL
        AND COALESCE(p.notification_promotions, true) = true
    `

    return NextResponse.json({
      subscribers: Number(subRows[0]?.count ?? 0),
      customers: Number(custRows[0]?.count ?? 0),
    })
  } catch (error) {
    console.error('[newsletter/audience-counts GET] failed', error)
    return NextResponse.json(
      { error: 'Failed to load audience counts' },
      { status: 500 },
    )
  }
}
