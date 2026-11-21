import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  acceptSession,
  closeSession,
  dispatchLiveChatTranscriptEmail,
  ensureStaffProfile,
  getSessionById,
  resolveStaffAvatarUrl,
  resolveSupportId,
  staffDisplayName,
  takeoverSession,
  addMessage,
} from '@/lib/live-chat'
import { logStaffActivity } from '@/lib/activity-log'
import { parseVisitorUserAgent } from '@/lib/visitor-telemetry'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params) {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const resolved = await getSessionById(id)
  if (!resolved) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const rows = await sql`
    SELECT s.*,
           COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')           AS user_first_name,
           COALESCE(u.last_name,
                    NULLIF(regexp_replace(s.guest_name, '^\\S+\\s*', ''), ''),
                    '')                                                                 AS user_last_name,
           COALESCE(u.email, s.guest_email)                                             AS user_email,
           COALESCE(u.phone, s.guest_phone)                                             AS user_phone,
           u.avatar_url                                                                 AS user_avatar_url,
           (s.user_id IS NULL)                                                          AS is_guest,
           st.first_name                                                                AS staff_first_name,
           st.last_name                                                                 AS staff_last_name,
           st.avatar_url                                                                AS staff_user_avatar_url,
           sp.display_name                                                              AS staff_display_name,
           sp.avatar_slug                                                               AS staff_avatar_slug
      FROM live_chat_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users st ON st.id = s.assigned_staff_id
      LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
     WHERE s.id = ${resolved.id}
     LIMIT 1
  `
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const r = rows[0] as Record<string, unknown>
  const assignedStaffId = (r.assigned_staff_id as string | null) ?? null
  const supportCode = resolveSupportId(
    (r.support_code as string | null) ?? resolved.support_code,
    String(r.id),
  )

  const rawUa = (r.visitor_user_agent as string | null) ?? null
  const parsedUa = parseVisitorUserAgent(rawUa)

  return NextResponse.json({
    session: {
      id: r.id,
      supportCode,
      support_code: supportCode,
      user_id: r.user_id,
      assigned_staff_id: assignedStaffId,
      isAssignedToMe: assignedStaffId === user.id,
      status: r.status,
      initial_topic: r.initial_topic,
      escalated_at: r.escalated_at,
      accepted_at: r.accepted_at,
      closed_at: r.closed_at,
      service_rating: r.service_rating,
      staff_rating: r.staff_rating,
      rating_comment: r.rating_comment,
      isGuest: Boolean(r.is_guest),
      visitor: {
        location: (r.visitor_location as string | null) ?? null,
        ip: (r.visitor_ip as string | null) ?? null,
        browser: (r.visitor_browser as string | null) ?? parsedUa.browser,
        os: (r.visitor_os as string | null) ?? parsedUa.os,
        device: (r.visitor_device as string | null) ?? parsedUa.device,
        timezone: (r.visitor_timezone as string | null) ?? null,
        pageUrl: (r.visitor_page_url as string | null) ?? null,
        referrer: (r.visitor_referrer as string | null) ?? null,
        language: (r.visitor_language as string | null) ?? null,
        screen: (r.visitor_screen as string | null) ?? null,
        userAgent: rawUa,
      },
      user: {
        firstName: r.user_first_name,
        lastName: r.user_last_name,
        email: r.user_email,
        phone: r.user_phone,
        avatarUrl: r.user_avatar_url,
      },
      staff: assignedStaffId
        ? {
            id: assignedStaffId,
            displayName: staffDisplayName({
              display_name: r.staff_display_name as string | null,
              first_name: r.staff_first_name as string | null,
              last_name: r.staff_last_name as string | null,
            }),
            avatarUrl: resolveStaffAvatarUrl({
              avatarUrl: r.staff_user_avatar_url as string | null,
              avatarSlug: r.staff_avatar_slug as string | null,
              staffId: assignedStaffId,
            }),
          }
        : null,
    },
  })
}

export async function PATCH(req: Request, { params }: Params) {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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
        { error: 'This chat is no longer waiting. Use Take over to assume the conversation.' },
        { status: 409 },
      )
    }
    await ensureStaffProfile(
      user.id,
      `${user.first_name} ${user.last_name}`.trim(),
    )
    const accepted = await acceptSession(session.id, user.id)
    if (!accepted) {
      return NextResponse.json(
        { error: 'This chat has already been picked up.' },
        { status: 409 },
      )
    }

    const profileRows = await sql`
      SELECT display_name, avatar_slug FROM staff_profiles WHERE user_id = ${user.id}
    `
    const dn = staffDisplayName({
      display_name: (profileRows[0]?.display_name as string | null) || null,
      first_name: user.first_name,
      last_name: user.last_name,
    })
    await addMessage(session.id, 'system', null, `${dn} joined the chat`)
    await logStaffActivity({
      staffId: user.id,
      userId: session.user_id,
      actionType: 'live_chat_accepted',
      entityType: 'live_chat_session',
      entityId: session.id,
      description: `Accepted live chat ${supportCode}${session.guest_name ? ` with ${session.guest_name}` : ''}`,
    })
    return NextResponse.json({ success: true, supportCode })
  }

  if (body.action === 'takeover') {
    const result = await takeoverSession(session.id, user.id)
    if (!result) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }
    if (!result.alreadyAssigned) {
      await logStaffActivity({
        staffId: user.id,
        userId: session.user_id,
        actionType: 'live_chat_takeover',
        entityType: 'live_chat_session',
        entityId: session.id,
        description: result.previousStaffName
          ? `Took over live chat ${result.supportCode} from ${result.previousStaffName}`
          : `Joined live chat ${result.supportCode}`,
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
    if (
      user.role !== 'admin' &&
      session.assigned_staff_id !== user.id
    ) {
      return NextResponse.json({ error: 'not yours' }, { status: 403 })
    }
    await closeSession(session.id, user.role === 'admin' ? 'admin' : 'staff')

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
      staffId: user.id,
      userId: session.user_id,
      actionType: 'live_chat_closed',
      entityType: 'live_chat_session',
      entityId: session.id,
      description: `Ended live chat ${supportCode}${session.guest_name ? ` with ${session.guest_name}` : ''}`,
    })
    return NextResponse.json({ success: true, transcriptSent })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
