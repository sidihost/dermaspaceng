// ---------------------------------------------------------------------------
// /api/admin/users/[userId]/reinstate
//
// POST — flip `users.is_active` back to TRUE for a previously-suspended
// user. Used by the comment-spam moderation panel in
// /admin/settings → Moderation. Admin-only.
//
// We deliberately keep this as a tiny dedicated endpoint (rather than
// extending the existing /api/admin/users/[userId] handler with a
// PATCH) because reinstatement is the only mutation the moderation
// surface needs, and the audit message ("admin <id> reinstated user
// <id>") fits cleanly here.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, toggleUserActive } from '@/lib/auth'
import { invalidateUserMe } from '@/lib/redis'
import { dispatchReinstatementNotification } from '@/lib/suspension-appeals-db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const rows = (await sql`
    SELECT id, deleted_at FROM users WHERE id = ${userId} LIMIT 1
  `) as Array<{ id: string; deleted_at: string | null }>

  if (!rows[0]) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  if (rows[0].deleted_at !== null) {
    return NextResponse.json(
      { error: 'Archived accounts must be restored from archive first.' },
      { status: 409 },
    )
  }

  const ok = await toggleUserActive(userId, true)
  if (!ok) {
    return NextResponse.json({ error: 'Failed to reinstate user' }, { status: 500 })
  }
  await invalidateUserMe(String(userId))
  await dispatchReinstatementNotification({ userId: String(userId) })
  console.info(`[moderation] admin ${admin.id} reinstated user ${userId}`)
  return NextResponse.json({ ok: true })
}
