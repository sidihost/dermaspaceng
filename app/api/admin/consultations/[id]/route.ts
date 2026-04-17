import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'

/**
 * Admin consultation detail API.
 *
 * Powers /admin/consultations/[id]. Status updates and notes still
 * go through the existing PUT on /api/admin/consultations; replies
 * use /api/admin/reply. This is read-only.
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
        c.*,
        u.first_name AS assigned_first_name,
        u.last_name AS assigned_last_name
      FROM consultations c
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.id = ${id}
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }
    return NextResponse.json({ consultation: rows[0] })
  } catch (error) {
    console.error('[v0] Get consultation detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch consultation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
