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
import { requireAdmin, toggleUserActive } from '@/lib/auth'

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
  const ok = await toggleUserActive(userId, true)
  if (!ok) {
    return NextResponse.json({ error: 'Failed to reinstate user' }, { status: 500 })
  }
  console.info(`[moderation] admin ${admin.id} reinstated user ${userId}`)
  return NextResponse.json({ ok: true })
}
