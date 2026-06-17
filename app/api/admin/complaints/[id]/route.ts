import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/complaints/[id]?source=ticket|complaint
 *
 * Returns the single support record for the admin detail page. We accept
 * either a `support_tickets` row (when source=ticket) or a
 * `contact_messages` row (when source=complaint, the default). This lets
 * the admin navigate to `/admin/complaints/<id>?source=<kind>` and render
 * the full conversation as a full page instead of a centered modal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrStaff()
    const { id } = await params
    const numericId = Number(id)
    if (!Number.isFinite(numericId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const source = (request.nextUrl.searchParams.get('source') || 'complaint') as
      | 'ticket'
      | 'complaint'

    if (source === 'ticket') {
      const rows = await sql`
        SELECT
          st.id, st.name, st.email, st.phone, st.subject, st.message,
          COALESCE(st.status, 'open')     AS status,
          COALESCE(st.priority, 'normal') AS priority,
          st.category, st.ticket_id, st.created_at,
          cu.avatar_url                   AS customer_avatar_url
        FROM support_tickets st
        LEFT JOIN users cu ON LOWER(cu.email) = LOWER(st.email)
        WHERE st.id = ${numericId}
        LIMIT 1
      `
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      }
      return NextResponse.json({
        complaint: {
          ...rows[0],
          source: 'ticket',
          assigned_to: null,
          assigned_first_name: null,
          assigned_last_name: null,
          resolved_at: null,
        },
      })
    }

    const rows = await sql`
      SELECT
        cm.id, cm.name, cm.email, cm.phone, cm.subject, cm.message,
        COALESCE(cm.status, 'open')     AS status,
        COALESCE(cm.priority, 'normal') AS priority,
        cm.category,
        cm.assigned_to::text            AS assigned_to,
        cm.created_at,
        cm.resolved_at,
        u.first_name                    AS assigned_first_name,
        u.last_name                     AS assigned_last_name,
        cu.avatar_url                   AS customer_avatar_url
      FROM contact_messages cm
      LEFT JOIN users u ON u.id::text = cm.assigned_to::text
      LEFT JOIN users cu ON LOWER(cu.email) = LOWER(cm.email)
      WHERE cm.id = ${numericId}
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }
    return NextResponse.json({
      complaint: {
        ...rows[0],
        source: 'complaint',
        ticket_id: null,
      },
    })
  } catch (error) {
    console.error('[v0] Get complaint detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/complaints/[id]?source=ticket|complaint
 *
 * Admin-only hard delete for support records. Staff can resolve and
 * reply but only admin can purge. The audit log records who deleted
 * what, including the source table.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireAdminOrStaff()
    if (me.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete support records.' },
        { status: 403 },
      )
    }
    const { id } = await params
    const numericId = Number(id)
    if (!Number.isFinite(numericId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const source = (request.nextUrl.searchParams.get('source') || 'complaint') as
      | 'ticket'
      | 'complaint'

    if (source === 'ticket') {
      const existing = await sql`
        SELECT id, email, ticket_id FROM support_tickets WHERE id = ${numericId} LIMIT 1
      `
      if (existing.length === 0) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      }
      await sql`DELETE FROM support_tickets WHERE id = ${numericId}`
      try {
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (
            ${me.id},
            'ticket_delete',
            'ticket',
            ${String(numericId)},
            ${'Admin deleted ticket ' + (existing[0].ticket_id || numericId)}
          )
        `
      } catch {
        /* logging never blocks */
      }
      return NextResponse.json({ ok: true })
    }

    const existing = await sql`
      SELECT id, email, subject FROM contact_messages WHERE id = ${numericId} LIMIT 1
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }
    await sql`DELETE FROM contact_messages WHERE id = ${numericId}`
    try {
      await sql`
        INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
        VALUES (
          ${me.id},
          'complaint_delete',
          'complaint',
          ${String(numericId)},
          ${'Admin deleted complaint: ' + (existing[0].subject || existing[0].email || 'unknown')}
        )
      `
    } catch {
      /* logging never blocks */
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] Delete complaint error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
