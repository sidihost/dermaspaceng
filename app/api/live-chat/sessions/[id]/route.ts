import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  closeSession,
  getSessionById,
  rateSession,
} from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET / PATCH on a single live-chat session, restricted to the OWNING user.
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
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const session = await getSessionById(id)
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json({ session })
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const session = await getSessionById(id)
  if (!session || session.user_id !== user.id) {
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
    return NextResponse.json({ success: true })
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
