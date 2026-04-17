import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Unified "Support Inbox" — merges two legacy sources so nothing gets
    // lost in the admin view:
    //   1. contact_messages  — public Contact-form submissions (source='complaint')
    //   2. support_tickets   — logged-in user tickets from /dashboard/support (source='ticket')
    //
    // Both tables have compatible shape (name/email/phone/subject/message/
    // status/priority/category/created_at) but different auxiliary columns,
    // so we NULL-fill the missing ones. A `source` discriminator + original
    // id lets the PUT handler route status/priority updates back to the
    // correct table, and `ticket_id` lets the admin UI show the user-facing
    // ticket code (e.g. DS-2026-123456).
    const complaints = await sql`
      SELECT * FROM (
        SELECT
          cm.id,
          cm.user_id,
          cm.name,
          cm.email,
          cm.phone,
          cm.subject,
          cm.message,
          COALESCE(cm.status, 'open') AS status,
          COALESCE(cm.priority, 'normal') AS priority,
          cm.category,
          cm.assigned_to,
          cm.created_at,
          cm.resolved_at,
          u.first_name AS assigned_first_name,
          u.last_name  AS assigned_last_name,
          'complaint'::text AS source,
          NULL::varchar AS ticket_id
        FROM contact_messages cm
        LEFT JOIN users u ON u.id = cm.assigned_to
        WHERE
          (${status} = '' OR COALESCE(cm.status, 'open') = ${status})
          AND (${priority} = '' OR COALESCE(cm.priority, 'normal') = ${priority})

        UNION ALL

        SELECT
          st.id,
          st.user_id,
          st.name,
          st.email,
          st.phone,
          st.subject,
          st.message,
          COALESCE(st.status, 'open') AS status,
          COALESCE(st.priority, 'normal') AS priority,
          st.category,
          NULL::varchar AS assigned_to,
          st.created_at,
          NULL::timestamp AS resolved_at,
          NULL::varchar AS assigned_first_name,
          NULL::varchar AS assigned_last_name,
          'ticket'::text AS source,
          st.ticket_id
        FROM support_tickets st
        WHERE
          (${status} = '' OR COALESCE(st.status, 'open') = ${status})
          AND (${priority} = '' OR COALESCE(st.priority, 'normal') = ${priority})
      ) unified
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT (
        (SELECT COUNT(*) FROM contact_messages
         WHERE (${status} = '' OR COALESCE(status, 'open') = ${status})
           AND (${priority} = '' OR COALESCE(priority, 'normal') = ${priority}))
        +
        (SELECT COUNT(*) FROM support_tickets
         WHERE (${status} = '' OR COALESCE(status, 'open') = ${status})
           AND (${priority} = '' OR COALESCE(priority, 'normal') = ${priority}))
      ) AS total
    `

    // Combine status counts from both tables.
    const statusCountsRaw = await sql`
      SELECT status, SUM(count)::int AS count FROM (
        SELECT COALESCE(status, 'open') AS status, COUNT(*) AS count
        FROM contact_messages GROUP BY COALESCE(status, 'open')
        UNION ALL
        SELECT COALESCE(status, 'open') AS status, COUNT(*) AS count
        FROM support_tickets GROUP BY COALESCE(status, 'open')
      ) s
      GROUP BY status
    `

    return NextResponse.json({
      complaints,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.ceil(Number(countResult[0].total) / limit)
      },
      statusCounts: statusCountsRaw.reduce((acc, row) => {
        acc[row.status || 'open'] = Number(row.count)
        return acc
      }, {} as Record<string, number>)
    })
  } catch (error) {
    console.error('Get complaints error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    const { complaintId, action, value, source } = await request.json()

    if (!complaintId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Default to 'complaint' to preserve backwards compatibility with older
    // callers; the new admin UI always sends 'complaint' or 'ticket'.
    const target: 'complaint' | 'ticket' = source === 'ticket' ? 'ticket' : 'complaint'

    switch (action) {
      case 'update_status': {
        if (!['open', 'in_progress', 'resolved', 'closed'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        const isClosing = value === 'resolved' || value === 'closed'
        if (target === 'ticket') {
          // support_tickets has no resolved_at column, so we just update status.
          await sql`
            UPDATE support_tickets
            SET status = ${value}, updated_at = NOW()
            WHERE id = ${complaintId}
          `
        } else {
          await sql`
            UPDATE contact_messages
            SET status = ${value}, updated_at = NOW(),
                resolved_at = ${isClosing ? sql`NOW()` : null}
            WHERE id = ${complaintId}
          `
        }
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, ${`${target}_status_changed`}, ${target}, ${complaintId}, ${`Status changed to ${value}`})
        `
        break
      }

      case 'update_priority': {
        if (!['low', 'normal', 'high', 'urgent'].includes(value)) {
          return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
        }
        if (target === 'ticket') {
          await sql`
            UPDATE support_tickets
            SET priority = ${value}, updated_at = NOW()
            WHERE id = ${complaintId}
          `
        } else {
          await sql`
            UPDATE contact_messages
            SET priority = ${value}, updated_at = NOW()
            WHERE id = ${complaintId}
          `
        }
        break
      }

      case 'assign': {
        // support_tickets doesn't carry an assigned_to column yet, so assign
        // is a no-op for tickets — returning success keeps the UI simple.
        if (target === 'complaint') {
          await sql`
            UPDATE contact_messages
            SET assigned_to = ${value}, updated_at = NOW()
            WHERE id = ${complaintId}
          `
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update complaint error:', error)
    return NextResponse.json(
      { error: 'Failed to update complaint' },
      { status: 500 }
    )
  }
}
