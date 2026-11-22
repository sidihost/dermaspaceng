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
    finalize?: boolean
    rating?: number
    service?: number
    staff?: number
    serviceRating?: number
    staffRating?: number
    comment?: string
    name?: string
    email?: string
  } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  if (body.action === 'update_contact') {
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : ''
    const rawName = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }
    const { sql } = await import('@/lib/db')
    const nextName = rawName || session.guest_name || null
    await sql`
      UPDATE live_chat_sessions
         SET guest_email = ${rawEmail.slice(0, 200)},
             guest_name = ${nextName},
             updated_at = NOW()
       WHERE id = ${session.id}
    `
    return NextResponse.json({
      success: true,
      guest: {
        name: nextName,
        email: rawEmail.slice(0, 200),
      },
    })
  }

  if (body.action === 'close') {
    const wasOpen = session.status === 'waiting' || session.status === 'active'
    if (wasOpen) {
      await closeSession(session.id, 'user')
    }

    let messages: Awaited<ReturnType<typeof import('@/lib/live-chat').getMessages>> | undefined
    if (wasOpen) {
      const { addMessage, getMessages } = await import('@/lib/live-chat')
      await addMessage(session.id, 'system', null, 'Customer ended the chat')
      messages = await getMessages(session.id)
    }

    const rawRating = body.rating ?? body.service ?? body.serviceRating
    const numericRating =
      rawRating !== undefined && rawRating !== null ? Number(rawRating) : NaN
    const hasValidRating =
      Number.isFinite(numericRating) && numericRating >= 1 && numericRating <= 5

    if (hasValidRating) {
      const rounded = Math.round(numericRating)
      const rawStaff = body.staff ?? body.staffRating
      const numericStaff =
        rawStaff !== undefined && rawStaff !== null ? Number(rawStaff) : NaN
      const roundedStaff =
        Number.isFinite(numericStaff) && numericStaff >= 1 && numericStaff <= 5
          ? Math.round(numericStaff)
          : rounded
      const comment =
        typeof body.comment === 'string' && body.comment.trim()
          ? body.comment.trim().slice(0, 500)
          : null
      await rateSession(session.id, rounded, roundedStaff, comment)
    } else if (body.finalize) {
      await skipSessionRating(session.id)
    }

    const transcriptSent = await dispatchLiveChatTranscriptEmail(session.id)
    const response = NextResponse.json({
      success: true,
      transcriptSent,
      ...(messages ? { messages } : {}),
    })
    if (role === 'guest' && (body.finalize || hasValidRating)) {
      clearGuestChatCookieOnResponse(response)
    }
    return response
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
