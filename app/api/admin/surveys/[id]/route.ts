import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

/**
 * Admin survey detail API.
 *
 * Backs /admin/surveys/[id] — the dedicated page that replaces the old
 * centered modal. We pull the single row joined against the users
 * table so the detail page can show who submitted it (if logged in).
 */
const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const rows = await sql`
      SELECT sr.*, u.first_name, u.last_name
      FROM survey_responses sr
      LEFT JOIN users u ON u.id = sr.user_id
      WHERE sr.id = ${id}
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }
    return NextResponse.json({ survey: rows[0] })
  } catch (error) {
    console.error('[v0] Get survey detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch survey'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
