import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function PATCH(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  await sql`
    UPDATE user_notifications SET is_read = TRUE
    WHERE id = ${id} AND user_id = ${user.id}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  await sql`DELETE FROM user_notifications WHERE id = ${id} AND user_id = ${user.id}`
  return NextResponse.json({ ok: true })
}
