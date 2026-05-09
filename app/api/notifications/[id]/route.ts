import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'
import { resolveReadColumn } from '@/lib/notifications-column'

// The physical "read" column on `user_notifications` may be named
// either `read` (canonical, scripts 350 + full-migration) or `is_read`
// (legacy, script 028). We resolve the actual name at runtime via
// resolveReadColumn() so the same code works on every deployed schema.
// See lib/notifications-column.ts for the full rationale.

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

  try {
    const col = await resolveReadColumn()
    await query(
      `UPDATE user_notifications SET "${col}" = $1
       WHERE id = $2 AND user_id = $3`,
      [nextRead, id, user.id],
    )
  } catch (err) {
    console.error('[notifications/PATCH] failed', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  try {
    await query(
      `DELETE FROM user_notifications WHERE id = $1 AND user_id = $2`,
      [id, user.id],
    )
  } catch (err) {
    console.error('[notifications/DELETE] failed', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
