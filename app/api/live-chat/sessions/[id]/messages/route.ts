import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  addMessage,
  getMessages,
  getSessionById,
  markStaffMessagesRead,
} from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET    → poll messages (optionally `?since=<iso>` for incremental fetch).
// POST   → user sends a message body to the staff member.
// Both endpoints scoped to the SESSION OWNER. Staff routes live elsewhere
// at /api/staff/live-chat/sessions/[id]/messages.
// ---------------------------------------------------------------------------

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const session = await getSessionById(id)
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const url = new URL(req.url)
  const since = url.searchParams.get('since') || undefined
  const messages = await getMessages(id, since)

  // Mark all staff replies as read by the user side. Powers the unread
  // badge on the staff dashboard.
  await markStaffMessagesRead(id)

  return NextResponse.json({ messages })
}

export async function POST(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const session = await getSessionById(id)
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (session.status !== 'waiting' && session.status !== 'active') {
    return NextResponse.json(
      { error: 'This chat has already ended.' },
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
  if (!text) {
    return NextResponse.json({ error: 'empty message' }, { status: 400 })
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'message too long' }, { status: 400 })
  }

  const message = await addMessage(id, 'user', user.id, text)
  return NextResponse.json({ message })
}
