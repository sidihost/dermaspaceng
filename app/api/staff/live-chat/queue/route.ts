import { NextResponse } from 'next/server'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  ensureStaffProfile,
  getStaffQueue,
  touchStaffPresence,
} from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET /api/staff/live-chat/queue
// ---------------------------------------------------------------------------
// Returns:
//   { waiting: QueueItem[]; mine: QueueItem[] }
// `waiting` is the global queue any staff member can pick up.
// `mine` is the current user's accepted/active sessions.
//
// Side-effects: ensures the staff member has a `staff_profiles` row (so a
// brand-new staff hire shows up correctly the first time they open the
// queue) and bumps their presence so admins see them as online.
// ---------------------------------------------------------------------------
export async function GET() {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  await ensureStaffProfile(user.id, `${user.first_name} ${user.last_name}`.trim())
  await touchStaffPresence(user.id, 'online')

  const { waiting, mine } = await getStaffQueue(user.id)

  return NextResponse.json({ waiting, mine })
}
