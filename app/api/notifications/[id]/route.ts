import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// The physical column on `user_notifications` is `read` (not
// `is_read`). It's a SQL-reserved word so every reference must be
// quoted — see lib/notifications.ts where the read query also aliases
// `"read" AS is_read` to keep the wire format stable for the inbox UI.

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  // The inbox page sends `{ is_read: true|false }` so users can flip
  // a row back to unread. Default to TRUE for older callers (the
  // bell, native fetch links) that don't pass a body.
  let nextRead = true
  try {
    const body = (await request.json().catch(() => null)) as { is_read?: boolean } | null
    if (body && typeof body.is_read === 'boolean') nextRead = body.is_read
  } catch {
    /* keep default */
  }

  await sql`
    UPDATE user_notifications SET "read" = ${nextRead}
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
