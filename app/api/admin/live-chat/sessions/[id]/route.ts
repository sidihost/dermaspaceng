import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import {
  acceptSession,
  addMessage,
  closeSession,
  dispatchLiveChatTranscriptEmail,
  ensureStaffProfile,
  getFullSessionView,
  getSessionById,
  resolveSupportId,
  staffDisplayName,
  takeoverSession,
} from '@/lib/live-chat'
import { logStaffActivity } from '@/lib/activity-log'
import { getVisitorPresence, isTypingActive } from '@/lib/visitor-telemetry'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params) {
  let admin
  try {
    admin = await requireAdmin()
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
      currentUserId: admin.id,
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

  const supportCode = resolveSupportId(session.support_code, session.id)

  if (body.action === 'accept') {
    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: 'This chat is no longer waiting. Use Take over to join the conversation.' },
        { status: 409 },
      )
    }
    await ensureStaffProfile(
      admin.id,
      `${admin.first_name} ${admin.last_name}`.trim(),
    )
    const accepted = await acceptSession(session.id, admin.id)
    if (!accepted) {
      return NextResponse.json(
        { error: 'This chat has already been picked up.' },
        { status: 409 },
      )
    }
    const profileRows = await sql`
      SELECT display_name FROM staff_profiles WHERE user_id = ${admin.id} LIMIT 1
    `
    const dn = staffDisplayName({
      display_name: (profileRows[0]?.display_name as string | null) || null,
      first_name: admin.first_name,
      last_name: admin.last_name,
    })
    await addMessage(session.id, 'system', null, `${dn} joined the chat`)
    await logStaffActivity({
      staffId: admin.id,
      userId: session.user_id,
      actionType: 'live_chat_accepted',
      entityType: 'live_chat_session',
      entityId: session.id,
      description: `Admin accepted live chat ${supportCode}${session.guest_name ? ` with ${session.guest_name}` : ''}`,
    })
    return NextResponse.json({ success: true, supportCode })
  }

  if (body.action === 'takeover') {
    const result = await takeoverSession(session.id, admin.id)
    if (!result) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    if (!result.alreadyAssigned) {
      await logStaffActivity({
        staffId: admin.id,
        userId: session.user_id,
        actionType: 'live_chat_takeover',
        entityType: 'live_chat_session',
        entityId: session.id,
        description: result.previousStaffName
          ? `Admin took over live chat ${result.supportCode} from ${result.previousStaffName}`
          : `Admin joined live chat ${result.supportCode}`,
      })
    }
    return NextResponse.json({
      success: true,
      supportCode: result.supportCode,
      previousStaffName: result.previousStaffName,
      staff: result.staff,
    })
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
