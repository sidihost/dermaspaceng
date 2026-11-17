import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/activity
 *
 * Returns rows from `activity_log` (admin/staff actions across the
 * platform — bookings, gift cards, complaints, live chats, emails,
 * payment cancellations, replies, etc.).
 *
 * Supports query params:
 *   ?page=1&limit=20
 *   ?action=all|create|update|delete|reply|status_change|email|payment|view
 *   ?entity_type=all|user|booking|gift_card|complaint|consultation|survey|transaction|live_chat|email
 *   ?role=all|staff|admin
 *   ?staff_id=<uuid>
 *   ?q=<search>
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const sp = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1') || 1)
    const limitRaw = parseInt(sp.get('limit') || '50')
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200)
    const action = (sp.get('action') || sp.get('actionType') || '').trim().toLowerCase()
    const entity = (sp.get('entity_type') || sp.get('entityType') || '').trim().toLowerCase()
    const roleRaw = (sp.get('role') || '').trim().toLowerCase()
    const role = roleRaw === 'staff' || roleRaw === 'admin' ? roleRaw : ''
    const staffId = (sp.get('staff_id') || sp.get('staffId') || '').trim()
    const q = (sp.get('q') || '').trim().toLowerCase()
    const qLike = q ? `%${q}%` : ''
    const offset = (page - 1) * limit

    const rows = await sql`
      WITH tagged AS (
        SELECT
          al.id,
          COALESCE(al.action_type, al.action) AS raw_action,
          CASE
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%create%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%_added' THEN 'create'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%delete%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%removed%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%suspended%' THEN 'delete'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%reply%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%note_added%' THEN 'reply'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%status%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%changed%' THEN 'status_change'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%email%' THEN 'email'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%payment%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%refund%' THEN 'payment'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%view%' THEN 'view'
            ELSE 'update'
          END AS action_bucket,
          al.entity_type,
          al.entity_id,
          COALESCE(al.description, al.details) AS details,
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
      )
      SELECT *
      FROM tagged
      WHERE (${action} = '' OR action_bucket = ${action} OR LOWER(COALESCE(raw_action, '')) = ${action})
        AND (${entity} = '' OR LOWER(COALESCE(entity_type, '')) = ${entity})
        AND (${role} = '' OR LOWER(COALESCE(staff_role, 'system')) = ${role})
        AND (${staffId} = '' OR staff_id::text = ${staffId})
        AND (
          ${qLike} = ''
          OR LOWER(
            COALESCE(staff_first_name, '') || ' ' ||
            COALESCE(staff_last_name, '') || ' ' ||
            COALESCE(user_first_name, '') || ' ' ||
            COALESCE(user_last_name, '') || ' ' ||
            COALESCE(details, '') || ' ' ||
            COALESCE(raw_action, '') || ' ' ||
            COALESCE(entity_type, '')
          ) LIKE ${qLike}
        )
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      WITH tagged AS (
        SELECT
          al.id,
          COALESCE(al.action_type, al.action) AS raw_action,
          CASE
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%create%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%_added' THEN 'create'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%delete%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%removed%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%suspended%' THEN 'delete'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%reply%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%note_added%' THEN 'reply'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%status%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%changed%' THEN 'status_change'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%email%' THEN 'email'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%payment%'
              OR LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%refund%' THEN 'payment'
            WHEN LOWER(COALESCE(al.action_type, al.action, '')) LIKE '%view%' THEN 'view'
            ELSE 'update'
          END AS action_bucket,
          al.entity_type,
          COALESCE(al.description, al.details) AS details,
          al.staff_id,
          s.first_name AS staff_first_name,
          s.last_name  AS staff_last_name,
          s.role       AS staff_role,
          u.first_name AS user_first_name,
          u.last_name  AS user_last_name
        FROM activity_log al
        LEFT JOIN users s ON s.id = al.staff_id
        LEFT JOIN users u ON u.id = al.user_id
      )
      SELECT COUNT(*)::int AS total
      FROM tagged
      WHERE (${action} = '' OR action_bucket = ${action} OR LOWER(COALESCE(raw_action, '')) = ${action})
        AND (${entity} = '' OR LOWER(COALESCE(entity_type, '')) = ${entity})
        AND (${role} = '' OR LOWER(COALESCE(staff_role, 'system')) = ${role})
        AND (${staffId} = '' OR staff_id::text = ${staffId})
        AND (
          ${qLike} = ''
          OR LOWER(
            COALESCE(staff_first_name, '') || ' ' ||
            COALESCE(staff_last_name, '') || ' ' ||
            COALESCE(user_first_name, '') || ' ' ||
            COALESCE(user_last_name, '') || ' ' ||
            COALESCE(details, '') || ' ' ||
            COALESCE(raw_action, '') || ' ' ||
            COALESCE(entity_type, '')
          ) LIKE ${qLike}
        )
    `

    let staffMembers: Array<{ id: string; name: string; role: string }> = []
    try {
      const teamRows = await sql`
        SELECT id, first_name, last_name, email, role
        FROM users
        WHERE role IN ('staff', 'admin')
        ORDER BY CASE WHEN role = 'staff' THEN 0 ELSE 1 END, first_name ASC NULLS LAST
      `
      staffMembers = teamRows.map((m: any) => ({
        id: String(m.id),
        name:
          [m.first_name, m.last_name].filter(Boolean).join(' ').trim() ||
          String(m.email || 'Team member'),
        role: String(m.role || 'staff'),
      }))
    } catch {
      staffMembers = []
    }

    const total = Number(countResult[0]?.total ?? 0)

    return NextResponse.json({
      success: true,
      activities: rows.map((r: any) => {
        const actor =
          [r.staff_first_name, r.staff_last_name].filter(Boolean).join(' ') ||
          [r.user_first_name, r.user_last_name].filter(Boolean).join(' ') ||
          r.user_email ||
          'System'
        return {
          id: r.id,
          actor_id: r.staff_id || r.user_id || null,
          staff_id: r.staff_id || null,
          actor_name: actor,
          actor_role: r.staff_role || 'system',
          action: String(r.action_bucket || 'update'),
          action_raw: r.raw_action,
          entity_type: r.entity_type || 'system',
          entity_id: r.entity_id,
          details: r.details || '',
          created_at: r.created_at,
        }
      }),
      staffMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 },
    )
  }
}
