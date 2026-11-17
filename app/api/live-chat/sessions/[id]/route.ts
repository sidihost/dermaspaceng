import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  closeSession,
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

export async function PATCH(req: Request, { params }: Params) {
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

  let body: { action?: string; service?: number; staff?: number; comment?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  if (body.action === 'close') {
    await closeSession(id, 'user')
    const response = NextResponse.json({ success: true })
    if (role === 'guest') {
      clearGuestChatCookieOnResponse(response)
    }
    return response
  }

  if (body.action === 'skip_rating') {
    await skipSessionRating(id)
    const response = NextResponse.json({ success: true })
    if (role === 'guest') {
      clearGuestChatCookieOnResponse(response)
    }
    return response
  }

  if (body.action === 'rate') {
    const service = Number(body.service)
    const staff = Number(body.staff)
    if (
      !Number.isFinite(service) ||
      !Number.isFinite(staff) ||
      service < 1 ||
      service > 5 ||
      staff < 1 ||
      staff > 5
    ) {
      return NextResponse.json({ error: 'ratings must be 1-5' }, { status: 400 })
    }
    const comment =
      typeof body.comment === 'string' ? body.comment.slice(0, 500) : null
    await rateSession(id, service, staff, comment)
    const response = NextResponse.json({ success: true })
    if (role === 'guest') {
      clearGuestChatCookieOnResponse(response)
    }
    return response
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
