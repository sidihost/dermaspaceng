import { NextResponse } from 'next/server'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  ensureStaffProfile,
  getStaffQueue,
  getWaitingLiveChats,
  touchStaffPresence,
} from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET /api/staff/live-chat/queue?q=<optional Support ID or customer search>
// ---------------------------------------------------------------------------
// Returns:
//   {
//     waiting: QueueItem[],
//     mine: QueueItem[],
//     others: QueueItem[],
//     searchResults: QueueItem[],
//     currentUserId: string
//   }
// `waiting` is the global queue any staff member can pick up.
// `mine` is the current staff member's active sessions.
// `others` is active sessions currently handled by another representative so
//   colleagues can seamlessly inspect and take over a chat.
// `searchResults` returns matching chats when `?q=` (e.g. Support ID) is given.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const summaryOnly = url.searchParams.get('summary') === '1'
  if (summaryOnly) {
    const waiting = await getWaitingLiveChats()
    return NextResponse.json(
      {
        waiting,
        currentUserId: user.id,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  await ensureStaffProfile(user.id, `${user.first_name} ${user.last_name}`.trim())
  await touchStaffPresence(user.id, 'online')

  const q = url.searchParams.get('q')?.trim() || undefined

  const { waiting, mine, others, searchResults } = await getStaffQueue(user.id, q)

  return NextResponse.json(
    {
      waiting,
      mine,
      others,
      searchResults,
      currentUserId: user.id,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
