import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/complaints
 *
 * Unified "Support" view: combines contact-form complaints and logged-in
 * user support tickets into a single list.
 *
 * Why two queries + JS merge instead of a SQL UNION?
 *   - The two tables were added by different migrations that used
 *     different column types (e.g. VARCHAR(36) vs UUID for assigned_to,
 *     VARCHAR(255) vs VARCHAR(36) for user_id). A strict UNION fails with
 *     "UNION types do not match" when any column type drifts, which
 *     silently produced an empty inbox for the admin.
 *   - Keeping them separate also means one table being malformed only
 *     hides its own rows rather than wiping the whole page.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Fetch both sources in parallel, each wrapped in try/catch so one
    // failure doesn't nuke the whole response.
    const [complaintsRows, ticketsRows] = await Promise.all([
      (async () => {
        try {
          return await sql`
            SELECT
              cm.id,
              cm.name,
              cm.email,
              cm.phone,
              cm.subject,
              cm.message,
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
            WHERE
              (${status} = '' OR COALESCE(cm.status, 'open') = ${status})
              AND (${priority} = '' OR COALESCE(cm.priority, 'normal') = ${priority})
            ORDER BY cm.created_at DESC
          `
        } catch (err) {
          console.error('[v0] Failed to load contact_messages:', err)
          return [] as Record<string, unknown>[]
        }
      })(),
      (async () => {
        try {
          return await sql`
            SELECT
              st.id,
              st.name,
              st.email,
              st.phone,
              st.subject,
              st.message,
              COALESCE(st.status, 'open')     AS status,
              COALESCE(st.priority, 'normal') AS priority,
              st.category,
              st.ticket_id,
              st.created_at
            FROM support_tickets st
            WHERE
              (${status} = '' OR COALESCE(st.status, 'open') = ${status})
              AND (${priority} = '' OR COALESCE(st.priority, 'normal') = ${priority})
            ORDER BY st.created_at DESC
          `
        } catch (err) {
          console.error('[v0] Failed to load support_tickets:', err)
          return [] as Record<string, unknown>[]
        }
      })(),
    ])

    type Row = {
      id: number | string
      name: string
      email: string
      phone: string | null
      subject: string | null
      message: string
      status: string
      priority: string
      category: string | null
      assigned_to?: string | null
      assigned_first_name?: string | null
      assigned_last_name?: string | null
      created_at: string
      resolved_at?: string | null
      ticket_id?: string | null
      source: 'complaint' | 'ticket'
    }

    const complaints: Row[] = (complaintsRows as Record<string, unknown>[]).map((r) => ({
      id: r.id as number | string,
      name: (r.name as string) || '',
      email: (r.email as string) || '',
      phone: (r.phone as string | null) ?? null,
      subject: (r.subject as string | null) ?? null,
      message: (r.message as string) || '',
      status: (r.status as string) || 'open',
      priority: (r.priority as string) || 'normal',
      category: (r.category as string | null) ?? null,
      assigned_to: (r.assigned_to as string | null) ?? null,
      assigned_first_name: (r.assigned_first_name as string | null) ?? null,
      assigned_last_name: (r.assigned_last_name as string | null) ?? null,
      created_at: r.created_at as string,
      resolved_at: (r.resolved_at as string | null) ?? null,
      ticket_id: null,
      source: 'complaint',
    }))

    const tickets: Row[] = (ticketsRows as Record<string, unknown>[]).map((r) => ({
      id: r.id as number | string,
      name: (r.name as string) || '',
      email: (r.email as string) || '',
      phone: (r.phone as string | null) ?? null,
      subject: (r.subject as string | null) ?? null,
      message: (r.message as string) || '',
      status: (r.status as string) || 'open',
      priority: (r.priority as string) || 'normal',
      category: (r.category as string | null) ?? null,
      assigned_to: null,
      assigned_first_name: null,
      assigned_last_name: null,
      created_at: r.created_at as string,
      resolved_at: null,
      ticket_id: (r.ticket_id as string | null) ?? null,
      source: 'ticket',
    }))

    // Merge, sort by priority then created_at desc, then paginate in JS.
    const priorityRank: Record<string, number> = { urgent: 1, high: 2, normal: 3, low: 4 }
    const merged = [...complaints, ...tickets].sort((a, b) => {
      const ap = priorityRank[a.priority] ?? 5
      const bp = priorityRank[b.priority] ?? 5
      if (ap !== bp) return ap - bp
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const total = merged.length
    const paged = merged.slice(offset, offset + limit)

    // Aggregate status counts across both sources.
    const statusCounts: Record<string, number> = {}
    for (const row of merged) {
      const key = row.status || 'open'
      statusCounts[key] = (statusCounts[key] || 0) + 1
    }

    return NextResponse.json({
      complaints: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      statusCounts,
      // Useful diagnostic that the admin can glance at to confirm both
      // sources are reachable — avoids the "silent empty inbox" problem.
      sourceCounts: {
        complaints: complaints.length,
        tickets: tickets.length,
      },
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

    // Default to 'complaint' for backwards compatibility. The UI always
    // sends one of 'complaint' | 'ticket' now.
    const target: 'complaint' | 'ticket' = source === 'ticket' ? 'ticket' : 'complaint'
    const targetId = Number(complaintId)

    switch (action) {
      case 'update_status': {
        if (!['open', 'in_progress', 'resolved', 'closed'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        const isClosing = value === 'resolved' || value === 'closed'
        if (target === 'ticket') {
          await sql`
            UPDATE support_tickets
            SET status = ${value}, updated_at = NOW()
            WHERE id = ${targetId}
          `
        } else {
          // Some legacy migrations didn't add updated_at/resolved_at. We
          // try the full update first and fall back to the minimal form.
          try {
            await sql`
              UPDATE contact_messages
              SET status = ${value}, updated_at = NOW(),
                  resolved_at = ${isClosing ? sql`NOW()` : null}
              WHERE id = ${targetId}
            `
          } catch {
            await sql`
              UPDATE contact_messages
              SET status = ${value}
              WHERE id = ${targetId}
            `
          }
        }
        try {
          await sql`
            INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
            VALUES (${user.id}, ${`${target}_status_changed`}, ${target}, ${targetId.toString()}, ${`Status changed to ${value}`})
          `
        } catch (err) {
          console.error('[v0] Activity log insert failed:', err)
        }
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
            WHERE id = ${targetId}
          `
        } else {
          try {
            await sql`
              UPDATE contact_messages
              SET priority = ${value}, updated_at = NOW()
              WHERE id = ${targetId}
            `
          } catch {
            await sql`
              UPDATE contact_messages
              SET priority = ${value}
              WHERE id = ${targetId}
            `
          }
        }
        break
      }

      case 'assign': {
        // support_tickets has no assigned_to column; assigning a ticket is
        // a no-op for now (admin UI still returns success).
        if (target === 'complaint') {
          try {
            await sql`
              UPDATE contact_messages
              SET assigned_to = ${value}, updated_at = NOW()
              WHERE id = ${targetId}
            `
          } catch {
            await sql`
              UPDATE contact_messages
              SET assigned_to = ${value}
              WHERE id = ${targetId}
            `
          }
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
