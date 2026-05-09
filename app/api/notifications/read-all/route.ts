import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'
import { resolveReadColumn } from '@/lib/notifications-column'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // The "read" column is named either `read` or `is_read` depending on
  // when the database was first set up — see lib/notifications-column.ts.
  try {
    const col = await resolveReadColumn()
    await query(
      `UPDATE user_notifications SET "${col}" = TRUE
       WHERE user_id = $1 AND "${col}" = FALSE`,
      [user.id],
    )
  } catch (err) {
    console.error('[notifications/read-all] failed', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
