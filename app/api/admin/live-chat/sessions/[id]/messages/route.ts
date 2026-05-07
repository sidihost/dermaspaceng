import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import {
  addMessage,
  ensureStaffProfile,
  getSessionById,
  pickDefaultAvatarSlug,
} from '@/lib/live-chat'
import { notifyUser } from '@/lib/notifications'

// ---------------------------------------------------------------------------
// POST /api/admin/live-chat/sessions/[id]/messages
//
// Lets an admin reply directly inside any waiting/active live-chat session
// — the team flagged that admins were stuck in read-only mode and could
// only "peek". On first send the admin picks a public-facing display name
// (Juwon / Itunu / Franca per the brief, or any custom string) and the
// route:
//
//   1. Lazy-creates a `staff_profiles` row for the admin so the chat
//      framework treats them like any other front-desk rep.
//   2. Updates that row's `display_name` to the admin's chosen alias so
//      the customer-facing header, the "X joined the chat" system event,
//      and every subsequent message all read the same name.
//   3. If the session isn't already assigned to this admin, takes it
//      over: sets `assigned_staff_id`, flips the status to `active`
//      (covers both fresh `waiting` chats and admin handovers from
//      another rep), and inserts a "{display name} joined the chat"
//      system event so the customer sees the handoff. If the session
//      had a different rep assigned we also drop a "{previous name}
//      left the chat" event so the transcript reads naturally.
//   4. Posts the actual message as `'staff'` role from the admin's
//      user_id — same shape the staff endpoint uses, so the customer
//      overlay and staff queue see it identically.
//
// Body shape: `{ body: string, displayName?: string }`. `displayName`
// is required the first time an admin posts (the client picks one of
// the curated aliases). On subsequent sends the persisted name is
// reused, but the client may still pass a fresh value to change the
// alias mid-session.
// ---------------------------------------------------------------------------

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params) {
  let user
  try {
    user = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionById(id)
  if (!session) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (session.status === 'closed' || session.status === 'abandoned') {
    return NextResponse.json(
      { error: 'This chat is no longer active.' },
      { status: 409 },
    )
  }

  let body: { body?: unknown; displayName?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (!text) return NextResponse.json({ error: 'empty message' }, { status: 400 })
  if (text.length > 2000) {
    return NextResponse.json({ error: 'message too long' }, { status: 400 })
  }
  const requestedName =
    typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 60) : ''

  // ---- Resolve the admin's display name + ensure staff_profiles row -----
  await ensureStaffProfile(
    user.id,
    `${user.first_name} ${user.last_name}`.trim(),
  )

  const profileRows = (await sql`
    SELECT display_name, avatar_slug FROM staff_profiles WHERE user_id = ${user.id}
  `) as Array<{ display_name: string | null; avatar_slug: string | null }>
  const currentDisplay = profileRows[0]?.display_name?.trim() || ''
  const finalDisplay = requestedName || currentDisplay
  if (!finalDisplay) {
    // First-time admin send with no displayName posted — the client
    // forgot to render the picker. We refuse politely so the UI knows
    // to show the picker, rather than silently posting under the
    // admin's real legal name (which is what would happen if we
    // fell back on `${user.first_name} ${user.last_name}`).
    return NextResponse.json(
      {
        error: 'displayNameRequired',
        message: 'Pick a display name before replying.',
      },
      { status: 400 },
    )
  }
  if (finalDisplay !== currentDisplay) {
    await sql`
      UPDATE staff_profiles
         SET display_name = ${finalDisplay}, updated_at = NOW()
       WHERE user_id = ${user.id}
    `
  }

  // ---- Take over the session if it isn't already ours -------------------
  const previousAssigned = session.assigned_staff_id
  const isFirstAdminMessage = previousAssigned !== user.id
  if (isFirstAdminMessage) {
    // If a different rep currently owns this chat, drop a "{name}
    // left the chat" event for them first. This mirrors what
    // `closeSession` does in the staff route so the transcript
    // tells a coherent story when admin overrides a stuck chat.
    if (previousAssigned && previousAssigned !== user.id) {
      const prev = (await sql`
        SELECT u.first_name, u.last_name, sp.display_name
          FROM users u
          LEFT JOIN staff_profiles sp ON sp.user_id = u.id
         WHERE u.id = ${previousAssigned}
         LIMIT 1
      `) as Array<{
        first_name: string | null
        last_name: string | null
        display_name: string | null
      }>
      const prevName =
        (prev[0]?.display_name && prev[0].display_name.trim()) ||
        [prev[0]?.first_name, prev[0]?.last_name].filter(Boolean).join(' ').trim() ||
        'A representative'
      await addMessage(id, 'system', null, `${prevName} left the chat`)
    }

    await sql`
      UPDATE live_chat_sessions
         SET assigned_staff_id = ${user.id},
             status = 'active',
             accepted_at = COALESCE(accepted_at, NOW()),
             last_activity_at = NOW()
       WHERE id = ${id}
    `

    // System "joined" event using the admin's chosen alias. The
    // customer-side overlay renders this with a centred avatar +
    // name, matching the existing handoff treatment.
    await addMessage(id, 'system', null, `${finalDisplay} joined the chat`)
  }

  // ---- Post the actual message as 'staff' from the admin ----------------
  const message = await addMessage(id, 'staff', user.id, text)

  // Touch last_activity so the queue ordering reflects the freshly
  // active conversation.
  await sql`
    UPDATE live_chat_sessions
       SET last_activity_at = NOW()
     WHERE id = ${id}
  `

  // Drop a user-facing notification so the bell counter increments and
  // the customer sees a reply landed even if they've closed the live
  // chat overlay or navigated away from the page. We deliberately skip
  // guest sessions (no `user_id`) — there's no row in `users` to notify.
  if (session.user_id) {
    try {
      const preview = text.length > 120 ? `${text.slice(0, 117)}…` : text
      await notifyUser({
        userId: session.user_id,
        title: `${finalDisplay} replied in live chat`,
        message: preview,
        type: 'reply',
        referenceType: 'live_chat',
        referenceId: id,
        actionUrl: '/dashboard/notifications',
        priority: 'normal',
      })
    } catch (err) {
      // Notification failures must never block the reply itself.
      console.error('[v0] live-chat notify failed:', err)
    }
  }

  return NextResponse.json({
    message,
    displayName: finalDisplay,
    avatarSlug: profileRows[0]?.avatar_slug || pickDefaultAvatarSlug(user.id),
    tookOver: isFirstAdminMessage,
  })
}
