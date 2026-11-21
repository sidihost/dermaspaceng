import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getSessionById, setCustomerTyping } from '@/lib/live-chat'
import { authoriseSessionAccess } from '@/lib/live-chat-guest'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params) {
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
  if (session.status !== 'waiting' && session.status !== 'active') {
    return NextResponse.json({ ok: true })
  }

  let isTyping = false
  try {
    const body = (await req.json()) as { isTyping?: unknown }
    isTyping = Boolean(body?.isTyping)
  } catch {
    isTyping = false
  }

  await setCustomerTyping(session.id, isTyping)
  return NextResponse.json({ ok: true })
}
