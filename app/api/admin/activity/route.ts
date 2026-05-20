import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/activity
 *
 * Returns rows from `activity_log` (admin/staff actions across the
 * platform — bookings, gift cards, complaints, replies, etc.).
 *
 * The shape returned here is normalised so the /admin/activity page
 * can render every row without having to know whether the call site
 * wrote `action` or `action_type`, etc. Older log rows will have
 * `action`; newer rows have `action_type`.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const sp = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const limitRaw = parseInt(sp.get('limit') || '50')
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200)
    const action = (sp.get('action') || sp.get('actionType') || '').trim()
    const entity = (sp.get('entity_type') || sp.get('entityType') || '').trim()
    const offset = (page - 1) * limit

    const rows = await sql`
      SELECT
        al.id,
        COALESCE(al.action_type, al.action)         AS action,
        al.entity_type,
        al.entity_id,
        COALESCE(al.description, al.details)        AS details,
        al.created_at,
        al.staff_id,
        al.user_id,
        s.first_name AS staff_first_name,
        s.last_name  AS staff_last_name,
        s.role       AS staff_role,
        u.first_name AS user_first_name,
        u.last_name  AS user_last_name,
        u.email      AS user_email
      FROM activity_log al
      LEFT JOIN users s ON s.id = al.staff_id
      LEFT JOIN users u ON u.id = al.user_id
      WHERE
        (${action} = '' OR al.action_type = ${action} OR al.action = ${action})
        AND (${entity} = '' OR al.entity_type = ${entity})
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*)::int AS total FROM activity_log al
      WHERE
        (${action} = '' OR al.action_type = ${action} OR al.action = ${action})
        AND (${entity} = '' OR al.entity_type = ${entity})
    `

    return NextResponse.json({
      success: true,
      activities: rows.map((r: any) => {
        const actor =
          [r.staff_first_name, r.staff_last_name].filter(Boolean).join(' ') ||
          [r.user_first_name, r.user_last_name].filter(Boolean).join(' ') ||
          r.user_email ||
          'System'
        // Bucket the raw action string into one of the broad action
        // groups the UI knows about (create / update / delete / reply
        // / status_change). Anything else falls through as 'update' so
        // we don't lose visibility on it.
        const raw: string = String(r.action || '').toLowerCase()
        let bucket = 'update'
        if (raw.includes('create') || raw.endsWith('_added')) bucket = 'create'
        else if (raw.includes('delete') || raw.includes('removed') || raw.includes('suspended'))
          bucket = 'delete'
        else if (raw.includes('reply') || raw.includes('note_added')) bucket = 'reply'
        else if (raw.includes('status') || raw.includes('changed')) bucket = 'status_change'
        else if (raw.includes('view')) bucket = 'view'
        return {
          id: r.id,
          actor_id: r.staff_id || r.user_id || null,
          actor_name: actor,
          actor_role: r.staff_role || 'system',
          // Keep the original verb visible too — useful in tooltips.
          action: bucket,
          action_raw: r.action,
          entity_type: r.entity_type || 'system',
          entity_id: r.entity_id,
          details: r.details || '',
          created_at: r.created_at,
        }
      }),
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.max(1, Math.ceil(Number(countResult[0].total) / limit)),
      },
      // Backwards compat key the old client also used:
      totalPages: Math.max(1, Math.ceil(Number(countResult[0].total) / limit)),
    })
  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    )
  }
}
