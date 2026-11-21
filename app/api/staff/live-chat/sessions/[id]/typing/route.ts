import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  getSessionById,
  setStaffTyping,
  staffDisplayName,
} from '@/lib/live-chat'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params) {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionById(id)
  if (!session) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  if (user.role !== 'admin' && session.assigned_staff_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
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

  let displayName: string | null = null
  if (isTyping) {
    const rows = (await sql`
      SELECT display_name FROM staff_profiles WHERE user_id = ${user.id} LIMIT 1
    `) as Array<{ display_name: string | null }>
    displayName = staffDisplayName({
      display_name: rows[0]?.display_name ?? null,
      first_name: user.first_name,
      last_name: user.last_name,
    })
  }

  await setStaffTyping(session.id, isTyping, displayName)
  return NextResponse.json({ ok: true })
}
