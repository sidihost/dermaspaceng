// ---------------------------------------------------------------------------
// /api/blog/permissions
//
// Admin-only. Lets an admin grant / revoke the four blog capabilities
// for a single staff member: can_create, can_edit, can_publish, can_delete.
//
//   GET   ?staff=true   list all staff users with their current flags
//   POST  { user_id, can_create, can_edit, can_publish, can_delete }
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // Outer-join keeps staff who have never been granted any blog perms in
  // the result set so admins can opt them in from the UI.
  const rows = (await sql`
    SELECT
      u.id, u.first_name, u.last_name, u.email, u.role,
      COALESCE(bp.can_create, FALSE)  AS can_create,
      COALESCE(bp.can_edit, FALSE)    AS can_edit,
      COALESCE(bp.can_publish, FALSE) AS can_publish,
      COALESCE(bp.can_delete, FALSE)  AS can_delete
    FROM users u
    LEFT JOIN blog_permissions bp ON bp.user_id = u.id
    WHERE u.role = 'staff'
    ORDER BY u.first_name, u.last_name
  `) as Array<{
    id: string
    first_name: string
    last_name: string
    email: string
    role: string
    can_create: boolean
    can_edit: boolean
    can_publish: boolean
    can_delete: boolean
  }>
  return NextResponse.json({ staff: rows })
}

export async function POST(req: Request) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as Record<string, unknown>
  const userId = typeof body.user_id === 'string' ? body.user_id : ''
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const flags = {
    can_create: Boolean(body.can_create),
    can_edit: Boolean(body.can_edit),
    can_publish: Boolean(body.can_publish),
    can_delete: Boolean(body.can_delete),
  }

  // Upsert — first time we grant any cap to this staff member we insert,
  // subsequent edits update in place.
  await sql`
    INSERT INTO blog_permissions (user_id, can_create, can_edit, can_publish, can_delete, granted_by)
    VALUES (
      ${userId},
      ${flags.can_create},
      ${flags.can_edit},
      ${flags.can_publish},
      ${flags.can_delete},
      ${admin.id}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      can_create  = EXCLUDED.can_create,
      can_edit    = EXCLUDED.can_edit,
      can_publish = EXCLUDED.can_publish,
      can_delete  = EXCLUDED.can_delete,
      granted_by  = EXCLUDED.granted_by,
      updated_at  = NOW()
  `

  return NextResponse.json({ ok: true })
}
