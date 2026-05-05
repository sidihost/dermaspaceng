import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getFullSessionView } from '@/lib/live-chat'

interface Params {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// Admin transcript view. Returns the full message thread plus the joined
// session metadata so the admin dashboard can render the complete chat
// without giving an admin live POST rights into the conversation.
// ---------------------------------------------------------------------------
export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const view = await getFullSessionView(id)
  if (!view) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json(view)
}
