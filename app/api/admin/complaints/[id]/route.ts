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
          id, name, email, phone, subject, message,
          COALESCE(status, 'open')     AS status,
          COALESCE(priority, 'normal') AS priority,
          category, ticket_id, created_at
        FROM support_tickets
        WHERE id = ${numericId}
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
        u.last_name                     AS assigned_last_name
      FROM contact_messages cm
      LEFT JOIN users u ON u.id::text = cm.assigned_to::text
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
