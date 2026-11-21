import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  closeSession,
  dispatchLiveChatTranscriptEmail,
  getSessionById,
  rateSession,
  skipSessionRating,
} from '@/lib/live-chat'
import {
  authoriseSessionAccess,
  clearGuestChatCookieOnResponse,
} from '@/lib/live-chat-guest'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  const { id } = await params
  const session = await getSessionById(id)
  if (!session) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const role = await authoriseSessionAccess(session, user?.id || null)
  if (!role) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json({ session })
}

async function handleSessionAction(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  const { id } = await params
  const session = await getSessionById(id)
  if (!session) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const role = await authoriseSessionAccess(session, user?.id || null)
  if (!role) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  let body: {
    action?: string
    service?: number
    staff?: number
    serviceRating?: number
    staffRating?: number
    comment?: string
  } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  if (body.action === 'close') {
    const wasOpen = session.status === 'waiting' || session.status === 'active'
    await closeSession(session.id, 'user')

    if (wasOpen) {
      const { addMessage, getMessages, staffDisplayName } = await import('@/lib/live-chat')
      const { sql } = await import('@/lib/db')
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
      const messages = await getMessages(session.id)
      return NextResponse.json({ success: true, transcriptSent, messages })
    }

    const transcriptSent = await dispatchLiveChatTranscriptEmail(session.id)
    // Keep the guest session cookie intact after closing so the visitor can
    // submit their post-chat rating or resend their transcript. The cookie is
    // cleared once they submit or skip the rating (or after the 30-min window).
    return NextResponse.json({ success: true, transcriptSent })
  }

  if (body.action === 'email_transcript') {
    const transcriptSent = await dispatchLiveChatTranscriptEmail(session.id, {
      force: true,
    })
    return NextResponse.json({ success: true, transcriptSent })
  }

  if (body.action === 'skip_rating') {
    await skipSessionRating(session.id)
    const response = NextResponse.json({ success: true })
    if (role === 'guest') {
      clearGuestChatCookieOnResponse(response)
    }
    return response
  }

  if (body.action === 'rate') {
    const rawService = body.service ?? body.serviceRating
    const rawStaff = body.staff ?? body.staffRating
    const service = Number(rawService)
    // Support neutral review cards (overall support + issue resolution) by
    // defaulting staff rating cleanly to the overall support rating when
    // omitted rather than exposing or requiring representative-named rows.
    const staff =
      rawStaff !== undefined && rawStaff !== null && Number(rawStaff) > 0
        ? Number(rawStaff)
        : service

    if (
      !Number.isFinite(service) ||
      !Number.isFinite(staff) ||
      service < 1 ||
      service > 5 ||
      staff < 1 ||
      staff > 5
    ) {
      return NextResponse.json(
        { error: 'Please select a rating from 1 to 5 stars.' },
        { status: 400 },
      )
    }
    const comment =
      typeof body.comment === 'string' && body.comment.trim()
        ? body.comment.trim().slice(0, 500)
        : null
    await rateSession(session.id, Math.round(service), Math.round(staff), comment)
    const response = NextResponse.json({ success: true })
    if (role === 'guest') {
      clearGuestChatCookieOnResponse(response)
    }
    return response
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

export async function PATCH(req: Request, context: Params) {
  return handleSessionAction(req, context)
}

export async function POST(req: Request, context: Params) {
  return handleSessionAction(req, context)
}
