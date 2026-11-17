import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'

/**
 * Survey detail API.
 *
 * Backs /admin/surveys/[id] and staff survey inspection. Pulls the single
 * row joined against the users table so the detail page can show who submitted it.
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
    console.error('Get survey detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch survey'
    const status = message.startsWith('Unauthorized') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
