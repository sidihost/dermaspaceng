import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * Toggle a single staff permission.
 *
 * Only admins can grant perms — we deliberately don't let a staff
 * member with `can_manage_services` re-grant the perm to anyone
 * else, otherwise the perm becomes self-replicating and the admin
 * loses control of the catalog. The endpoint accepts a body of
 * `{ canManageServices: boolean }` and currently only writes that
 * one column; adding new perms is a single additional case here.
 *
 * The userId in the route is the target staff member's id, NOT the
 * caller's. Targeting yourself is allowed (useful for admins who
 * want to test the staff view) but downgrading the LAST admin is
 * blocked elsewhere — this endpoint never changes role.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await ctx.params
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  }

  let body: { canManageServices?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.canManageServices !== 'boolean') {
    return NextResponse.json(
      { error: 'canManageServices must be a boolean.' },
      { status: 400 },
    )
  }

  // Ensure the target is actually a staff/admin row — we won't grant
  // catalog perms to regular users by accident.
  const target = (await sql`
    SELECT id, role FROM users WHERE id = ${userId} LIMIT 1
  `) as unknown as Array<{ id: string; role: string }>
  if (!target.length) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }
  if (!['admin', 'staff'].includes(target[0].role)) {
    return NextResponse.json(
      { error: 'Only staff or admin accounts can hold this permission.' },
      { status: 400 },
    )
  }

  await sql`
    UPDATE users
    SET can_manage_services = ${body.canManageServices},
        updated_at = NOW()
    WHERE id = ${userId}
  `

  // Audit trail — useful when reviewing who granted catalog access.
  // We log to the same admin_replies table the rest of the app uses
  // for "who did what" notes? No: that table is purpose-built for
  // contact replies. We just rely on Postgres timestamps + the
  // updated_by column on services_ext rows for now. If a dedicated
  // audit log is added later, plug it in here.

  return NextResponse.json({
    ok: true,
    userId,
    canManageServices: body.canManageServices,
    grantedBy: admin.id,
  })
}
