import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'

/**
 * Admin gift-card detail API.
 *
 * Powers /admin/gift-cards/[id]. Status updates still go through the
 * existing PUT on /api/admin/gift-cards; this route is read-only.
 */
const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrStaff()
    const { id } = await params
    const rows = await sql`
      SELECT
        gcr.*,
        u.first_name AS assigned_first_name,
        u.last_name AS assigned_last_name
      FROM gift_card_requests gcr
      LEFT JOIN users u ON u.id = gcr.assigned_to
      WHERE gcr.id = ${id}
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Gift card request not found' }, { status: 404 })
    }
    return NextResponse.json({ request: rows[0] })
  } catch (error) {
    console.error('[v0] Get gift-card detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch gift card'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
