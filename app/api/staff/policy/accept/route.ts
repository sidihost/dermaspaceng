import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import { invalidateUserMe } from '@/lib/redis'

/**
 * POST /api/staff/policy/accept
 * --------------------------------------------------------------
 * Records that the calling staff/admin user has acknowledged the
 * short staff console policy. Intentionally tiny — one row update,
 * one cache bust, one log line.
 */
export async function POST(req: Request) {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { version?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const version = typeof body.version === 'string' && body.version.trim().length > 0
    ? body.version.trim().slice(0, 32)
    : null
  if (!version) {
    return NextResponse.json({ error: 'missing version' }, { status: 400 })
  }

  await sql`
    UPDATE users
       SET staff_policy_accepted_version = ${version},
           staff_policy_accepted_at      = NOW(),
           updated_at                    = NOW()
     WHERE id = ${user.id}
  `

  // Best-effort audit row — if the table or row insert fails (older
  // env without activity_log) we still consider the acceptance saved.
  try {
    await sql`
      INSERT INTO activity_log (user_id, action, action_type, entity_type, entity_id, description)
      VALUES (
        ${user.id},
        'staff_policy_accept',
        'staff_policy_accept',
        'user',
        ${user.id},
        ${'Accepted staff console policy ' + version}
      )
    `
  } catch {
    /* never block on audit */
  }

  // Invalidate the cached /api/auth/me payload so the next call by
  // this user reflects the new acceptance and the gate disappears.
  try {
    await invalidateUserMe(user.id)
  } catch {
    /* cache best-effort */
  }

  return NextResponse.json({ success: true, version })
}
