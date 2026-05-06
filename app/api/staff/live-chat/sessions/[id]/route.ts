import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  acceptSession,
  closeSession,
  ensureStaffProfile,
  getSessionById,
  staffDisplayName,
  avatarUrlForSlug,
  addMessage,
} from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// Staff-side single session endpoint. Returns enough metadata for the
// conversation panel to render the customer header AND drive the "Accept",
// "Close chat" actions.
//
// PATCH actions:
//   { action: 'accept' }  → assign to caller, status → active, drop a
//                            "Sarah joined the chat" system message.
//   { action: 'close' }   → close the session. Admins can close anyone's,
//                            staff can only close one assigned to them.
// ---------------------------------------------------------------------------

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

  // Critical: LEFT JOIN — never INNER JOIN — on `users` for the customer.
  // Guest sessions (created via the pre-chat form) have `user_id IS NULL`
  // and therefore have no matching `users` row. An INNER JOIN here makes
  // every guest session 404 when staff click it from the queue, even
  // though the queue itself lists them (the queue uses LEFT JOIN). The
  // COALESCE / split_part pattern below mirrors `getStaffQueue` so the
  // staff console renders one unified "name + email" header regardless
  // of whether the customer is signed in.
  const rows = await sql`
    SELECT s.*,
           COALESCE(u.first_name, split_part(s.guest_name, ' ', 1), 'Guest')           AS user_first_name,
           COALESCE(u.last_name,
                    NULLIF(regexp_replace(s.guest_name, '^\S+\s*', ''), ''),
                    '')                                                                 AS user_last_name,
           COALESCE(u.email, s.guest_email)                                             AS user_email,
           COALESCE(u.phone, s.guest_phone)                                             AS user_phone,
           u.avatar_url                                                                 AS user_avatar_url,
           (s.user_id IS NULL)                                                          AS is_guest,
           st.first_name                                                                AS staff_first_name,
           st.last_name                                                                 AS staff_last_name,
           sp.display_name                                                              AS staff_display_name,
           sp.avatar_slug                                                               AS staff_avatar_slug
      FROM live_chat_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users st ON st.id = s.assigned_staff_id
      LEFT JOIN staff_profiles sp ON sp.user_id = s.assigned_staff_id
     WHERE s.id = ${id}
     LIMIT 1
  `
  if (rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const r = rows[0] as Record<string, unknown>

  // Staff can only see waiting sessions (anyone may pick up) and ones
  // assigned to them. Admins see everything.
  if (user.role !== 'admin') {
    const assigned = r.assigned_staff_id as string | null
    const status = r.status as string
    if (assigned && assigned !== user.id) {
      return NextResponse.json({ error: 'not yours' }, { status: 403 })
    }
    if (!assigned && status !== 'waiting') {
      return NextResponse.json({ error: 'not yours' }, { status: 403 })
    }
  }

  return NextResponse.json({
    session: {
      id: r.id,
      user_id: r.user_id,
      assigned_staff_id: r.assigned_staff_id,
      status: r.status,
      initial_topic: r.initial_topic,
      escalated_at: r.escalated_at,
      accepted_at: r.accepted_at,
      closed_at: r.closed_at,
      service_rating: r.service_rating,
      staff_rating: r.staff_rating,
      rating_comment: r.rating_comment,
      isGuest: Boolean(r.is_guest),
      user: {
        firstName: r.user_first_name,
        lastName: r.user_last_name,
        email: r.user_email,
        phone: r.user_phone,
        avatarUrl: r.user_avatar_url,
      },
      staff: r.assigned_staff_id
        ? {
            displayName: staffDisplayName({
              display_name: r.staff_display_name as string | null,
              first_name: r.staff_first_name as string | null,
              last_name: r.staff_last_name as string | null,
            }),
            avatarUrl: avatarUrlForSlug(r.staff_avatar_slug as string | null),
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

  if (body.action === 'accept') {
    if (session.status !== 'waiting') {
      return NextResponse.json(
        { error: 'This chat is no longer available.' },
        { status: 409 },
      )
    }
    await ensureStaffProfile(
      user.id,
      `${user.first_name} ${user.last_name}`.trim(),
    )
    await acceptSession(id, user.id)

    // Drop a "Sarah joined the chat" system message so the user sees the
    // handoff in their thread without us having to wire a separate event.
    const profileRows = await sql`
      SELECT display_name, avatar_slug FROM staff_profiles WHERE user_id = ${user.id}
    `
    const dn = staffDisplayName({
      display_name: (profileRows[0]?.display_name as string | null) || null,
      first_name: user.first_name,
      last_name: user.last_name,
    })
    await addMessage(id, 'system', null, `${dn} joined the chat`)
    return NextResponse.json({ success: true })
  }

  if (body.action === 'close') {
    // Staff can only close their own active chats; admins can close any.
    if (
      user.role !== 'admin' &&
      session.assigned_staff_id !== user.id
    ) {
      return NextResponse.json({ error: 'not yours' }, { status: 403 })
    }
    await closeSession(id, user.role === 'admin' ? 'admin' : 'staff')

    // Insert a "{Staff} left the chat" handoff event BEFORE the generic
    // "Chat ended" terminal so the transcript reads naturally — the
    // departure is rendered with the staff member's avatar / name in
    // the user-facing overlay (see MessageBubble's system event styling),
    // which matches what Namecheap and Intercom do when a rep drops.
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
        await addMessage(id, 'system', null, `${dn} left the chat`)
      }
    }
    await addMessage(id, 'system', null, 'Chat ended')
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
