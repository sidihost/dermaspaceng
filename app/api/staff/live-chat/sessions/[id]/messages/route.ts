import { NextResponse } from 'next/server'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  addMessage,
  getMessages,
  getSessionById,
  markUserMessagesRead,
} from '@/lib/live-chat'
import { notifyUser } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// Staff-side messages endpoint. Same shape as the user-facing one but with
// staff permission rules.
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

  // Staff can read messages for sessions assigned to them OR sessions in
  // the waiting queue. Admins can read anything.
  if (user.role !== 'admin') {
    const assigned = session.assigned_staff_id
    if (assigned && assigned !== user.id) {
      return NextResponse.json({ error: 'not yours' }, { status: 403 })
    }
    if (!assigned && session.status !== 'waiting') {
      return NextResponse.json({ error: 'not yours' }, { status: 403 })
    }
  }

  const url = new URL(req.url)
  const since = url.searchParams.get('since') || undefined
  const messages = await getMessages(id, since)

  // Bump read state on the user's messages so the staff queue badge clears.
  await markUserMessagesRead(id)

  return NextResponse.json({ messages })
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

  // Only the assigned staff member (or an admin) can post into a session.
  // Staff must accept first — there's no posting from the queue.
  if (user.role !== 'admin' && session.assigned_staff_id !== user.id) {
    return NextResponse.json(
      { error: 'Accept the chat before sending a message.' },
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

  const message = await addMessage(id, 'staff', user.id, text)

  // Fire a notification for the customer so the header bell counter
  // increments even when they've navigated away from the live-chat
  // overlay. Skipped for guest sessions (no associated user row).
  if (session.user_id) {
    try {
      const repName =
        [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Support'
      const preview = text.length > 120 ? `${text.slice(0, 117)}…` : text
      await notifyUser({
        userId: session.user_id,
        title: `${repName} replied in live chat`,
        message: preview,
        type: 'reply',
        referenceType: 'live_chat',
        referenceId: id,
        actionUrl: '/dashboard/notifications',
        priority: 'normal',
      })
    } catch (err) {
      console.error('[v0] live-chat notify failed:', err)
    }
  }

  return NextResponse.json({ message })
}
