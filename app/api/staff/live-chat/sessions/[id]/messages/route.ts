import { NextResponse, after } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  addMessage,
  getMessages,
  getSessionById,
  markUserMessagesRead,
  staffDisplayName,
} from '@/lib/live-chat'
import { sendLiveChatReplyPush } from '@/lib/notifications'
import { isCustomerInactiveForPush } from '@/lib/support-and-chat'
import { getVisitorPresence, isTypingActive } from '@/lib/visitor-telemetry'

// ---------------------------------------------------------------------------
// Staff-side messages endpoint.
// Any authenticated staff/admin can read the full transcript of a session
// (including chats currently handled by a colleague or looked up by Support ID)
// so handovers have full context. Only the assigned staff member (or admin)
// can send replies, and unread counters only clear when the assigned rep reads.
// ---------------------------------------------------------------------------

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: Params) {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const url = new URL(req.url)
  const since = url.searchParams.get('since') || undefined
  const messages = await getMessages(session.id, since)

  // Only clear unread badges when the assigned representative reads the thread
  // (so another rep peeking before takeover doesn't silently clear unread counts).
  if (session.assigned_staff_id === user.id || session.status === 'waiting') {
    await markUserMessagesRead(session.id)
  }

  return NextResponse.json({
    messages,
    sessionStatus: session.status,
    closedBy: session.closed_by ?? null,
    customerTyping: isTypingActive(session.customer_typing_at),
    presence: getVisitorPresence(
      session.customer_last_seen_at ?? session.last_activity_at,
      session.status,
    ),
  })
}

export async function POST(req: Request, { params }: Params) {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (user.role !== 'admin' && session.assigned_staff_id !== user.id) {
    return NextResponse.json(
      { error: 'Take over or accept this chat before sending a reply.' },
      { status: 403 },
    )
  }
  if (session.status !== 'active') {
    return NextResponse.json(
      { error: 'This chat is no longer active.' },
      { status: 409 },
    )
  }

  let body: { body?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const text = (body.body || '').toString().trim()
  if (!text) return NextResponse.json({ error: 'empty message' }, { status: 400 })
  if (text.length > 2000) {
    return NextResponse.json({ error: 'message too long' }, { status: 400 })
  }

  const message = await addMessage(session.id, 'staff', user.id, text)

  if (
    session.user_id &&
    isCustomerInactiveForPush(session.customer_last_seen_at)
  ) {
    const targetUserId = session.user_id
    after(async () => {
      const profileRows = (await sql`
        SELECT display_name FROM staff_profiles WHERE user_id = ${user.id} LIMIT 1
      `.catch(() => [])) as Array<{ display_name?: string | null }>
      const repName = staffDisplayName({
        display_name: profileRows[0]?.display_name ?? null,
        first_name: user.first_name,
        last_name: user.last_name,
      })
      await sendLiveChatReplyPush({
        userId: targetUserId,
        senderName: repName,
        body: text,
        sessionId: session.id,
        actionUrl: '/?openLiveChat=1',
      })
    })
  }

  return NextResponse.json({ message })
}
