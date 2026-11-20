import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import {
  addMessage,
  ensureStaffProfile,
  getSessionById,
  pickDefaultAvatarSlug,
} from '@/lib/live-chat'
import { invalidateAdminStats } from '@/lib/stats-cache'
import { logStaffActivity } from '@/lib/activity-log'

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

  const previousAssigned = session.assigned_staff_id
  const isFirstAdminMessage = previousAssigned !== user.id
  if (isFirstAdminMessage) {
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
      await addMessage(session.id, 'system', null, `${prevName} left the chat`)
    }

    await sql`
      UPDATE live_chat_sessions
         SET assigned_staff_id = ${user.id},
             status = 'active',
             accepted_at = COALESCE(accepted_at, NOW()),
             last_activity_at = NOW()
       WHERE id = ${session.id}
    `

    await addMessage(session.id, 'system', null, `${finalDisplay} joined the chat`)
    await invalidateAdminStats().catch(() => {})
    await logStaffActivity({
      staffId: user.id,
      userId: session.user_id,
      actionType: 'live_chat_takeover',
      entityType: 'live_chat_session',
      entityId: session.id,
      description: `Joined live chat as ${finalDisplay}${session.guest_name ? ` (${session.guest_name})` : ''}`,
    })
  }

  const message = await addMessage(session.id, 'staff', user.id, text)

  await sql`
    UPDATE live_chat_sessions
       SET last_activity_at = NOW()
     WHERE id = ${session.id}
  `

  return NextResponse.json({
    message,
    displayName: finalDisplay,
    avatarSlug: profileRows[0]?.avatar_slug || pickDefaultAvatarSlug(user.id),
    tookOver: isFirstAdminMessage,
  })
}
