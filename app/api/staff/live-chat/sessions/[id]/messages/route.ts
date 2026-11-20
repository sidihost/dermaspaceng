import { NextResponse } from 'next/server'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  addMessage,
  getMessages,
  getSessionById,
  markUserMessagesRead,
} from '@/lib/live-chat'

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
  return NextResponse.json({ message })
}
