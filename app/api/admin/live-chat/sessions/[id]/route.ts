import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import {
  addMessage,
  closeSession,
  dispatchLiveChatTranscriptEmail,
  getFullSessionView,
  getSessionById,
  staffDisplayName,
} from '@/lib/live-chat'
import { logStaffActivity } from '@/lib/activity-log'
import { getVisitorPresence, isTypingActive } from '@/lib/visitor-telemetry'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const view = await getFullSessionView(id)
  if (!view) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const presence = getVisitorPresence({
    status: view.session.status,
    lastSeenAt: view.session.customer_last_seen_at,
    lastActivityAt: view.session.last_activity_at,
  })
  const customerTyping = isTypingActive(view.session.customer_typing_at)

  return NextResponse.json(
    {
      ...view,
      customerTyping,
      customerLastSeenAt: view.session.customer_last_seen_at ?? null,
      presence,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function PATCH(req: Request, { params }: Params) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let body: { action?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  if (body.action === 'close') {
    if (session.status !== 'waiting' && session.status !== 'active') {
      return NextResponse.json({ success: true })
    }
    await closeSession(session.id, 'admin')
    if (session.assigned_staff_id) {
      const profileRows = await sql`
        SELECT u.first_name, u.last_name, sp.display_name
          FROM users u
          LEFT JOIN staff_profiles sp ON sp.user_id = u.id
         WHERE u.id = ${session.assigned_staff_id}
         LIMIT 1
      `
      const r = profileRows[0] as
        | { first_name: string | null; last_name: string | null; display_name: string | null }
        | undefined
      if (r) {
        const dn = staffDisplayName({
          display_name: r.display_name,
          first_name: r.first_name,
          last_name: r.last_name,
        })
        await addMessage(session.id, 'system', null, `${dn} left the chat`)
      }
    }
    await addMessage(session.id, 'system', null, 'Chat ended')
    const transcriptSent = await dispatchLiveChatTranscriptEmail(session.id)
    await logStaffActivity({
      staffId: admin.id,
      userId: session.user_id,
      actionType: 'live_chat_closed',
      entityType: 'live_chat_session',
      entityId: session.id,
      description: `Admin ended live chat session${session.guest_name ? ` with ${session.guest_name}` : ''}`,
    })
    return NextResponse.json({ success: true, transcriptSent })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

export async function DELETE(_req: Request, { params }: Params) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

  try {
    await sql`DELETE FROM live_chat_messages WHERE session_id = ${session.id}`
    await sql`DELETE FROM live_chat_sessions WHERE id = ${session.id}`
  } catch (err) {
    console.error('[admin/live-chat] Failed to delete session:', err)
    return NextResponse.json(
      { error: 'Could not delete live chat session. Please try again.' },
      { status: 500 },
    )
  }

  await logStaffActivity({
    staffId: admin.id,
    userId: session.user_id,
    actionType: 'live_chat_deleted',
    entityType: 'live_chat_session',
    entityId: session.id,
    description: `Admin deleted live chat session${session.support_code ? ` (${session.support_code})` : ''}${session.guest_name ? ` with ${session.guest_name}` : ''}`,
  }).catch(() => {})

  return NextResponse.json(
    { success: true, deletedId: session.id },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
