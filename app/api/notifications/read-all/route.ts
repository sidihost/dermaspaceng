import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Column is named `read` (a SQL keyword) — has to be quoted. See
  // lib/notifications.ts for the read-side alias.
  await sql`UPDATE user_notifications SET "read" = TRUE WHERE user_id = ${user.id} AND "read" = FALSE`
  return NextResponse.json({ ok: true })
}
