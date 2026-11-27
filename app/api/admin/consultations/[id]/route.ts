import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'
import { getAdminPermissions } from '@/lib/admin-permissions'
import { invalidateAfterQueueWrite } from '@/lib/stats-cache'

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
    const me = await requireAdminOrStaff()
    if (me.role === 'admin' && !getAdminPermissions(me).canSeeConsultations) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    // The consultations table stores names as `first_name` / `last_name`
    // and the scheduled slot as the date+time pair `appointment_date` /
    // `appointment_time` — but the detail UI was authored against a
    // legacy shape with single `name`, `message`, and `scheduled_at`
    // columns. Reading `c.*` left those fields undefined and the page
    // crashed on `consultation.name.split(' ')`. We compose the legacy
    // shape here so the UI keeps working without a migration.
    const rows = await sql`
      SELECT
        c.*,
        TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) AS name,
        c.notes AS message,
        CASE
          WHEN c.appointment_date IS NOT NULL AND c.appointment_time IS NOT NULL
            THEN (c.appointment_date::text || ' ' || c.appointment_time)
          WHEN c.appointment_date IS NOT NULL
            THEN c.appointment_date::text
          ELSE NULL
        END AS scheduled_at,
        u.first_name AS assigned_first_name,
        u.last_name AS assigned_last_name,
        u.avatar_url AS assigned_avatar_url,
        u.role AS assigned_role,
        u.gender AS assigned_gender,
        cu.avatar_url AS customer_avatar_url,
        cu.role AS customer_role,
        cu.gender AS customer_gender,
        cu.id AS customer_user_id
      FROM consultations c
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(c.assigned_to AS TEXT)
      LEFT JOIN LATERAL (
        SELECT id, avatar_url, role, gender
        FROM users
        WHERE (c.user_id IS NOT NULL AND CAST(id AS TEXT) = CAST(c.user_id AS TEXT))
           OR (c.email IS NOT NULL AND TRIM(LOWER(email)) = TRIM(LOWER(c.email)))
        ORDER BY
          CASE WHEN c.user_id IS NOT NULL AND CAST(id AS TEXT) = CAST(c.user_id AS TEXT) THEN 0 ELSE 1 END,
          CASE WHEN avatar_url IS NOT NULL AND TRIM(avatar_url) <> '' THEN 0 ELSE 1 END
        LIMIT 1
      ) cu ON TRUE
      WHERE c.id = ${id}
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }
    return NextResponse.json({ consultation: rows[0] })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Get consultation detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch consultation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/consultations/[id]
 *
 * Admin-only hard delete. Staff can update status but only admin
 * can purge a record outright. We log the deletion to `activity_log`
 * (best-effort) so audits still see who removed it and when.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireAdminOrStaff()
    if (me.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete consultations.' },
        { status: 403 },
      )
    }
    const { id } = await params
    const existing = await sql`
      SELECT id, email, first_name, last_name
        FROM consultations
       WHERE id = ${id}
       LIMIT 1
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }
    await sql`DELETE FROM consultations WHERE id = ${id}`
    try {
      await sql`
        INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
        VALUES (
          ${me.id},
          'consultation_delete',
          'consultation',
          ${id},
          ${'Admin deleted consultation for ' + (existing[0].email || 'unknown')}
        )
      `
    } catch {
      /* logging never blocks */
    }
    await invalidateAfterQueueWrite()
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Delete consultation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
