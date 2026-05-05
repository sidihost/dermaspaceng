import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  closeSession,
  getSessionById,
  rateSession,
} from '@/lib/live-chat'
import {
  authoriseSessionAccess,
  clearGuestChatCookieOnResponse,
} from '@/lib/live-chat-guest'

// ---------------------------------------------------------------------------
// GET / PATCH on a single live-chat session, restricted to the OWNING
// party — either the logged-in customer or the guest browser holding
// the matching guest-chat cookie.
//
// PATCH accepts:
//   { action: 'close' }                              → user ends the chat
//   { action: 'rate', service, staff, comment? }     → user submits rating
// ---------------------------------------------------------------------------

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
    // If a guest closed their own chat, retire the cookie so a fresh
    // pre-chat form is shown the next time they hit the site instead
    // of trying to reattach to a closed session.
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
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
