import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await sql`UPDATE user_notifications SET is_read = TRUE WHERE user_id = ${user.id} AND is_read = FALSE`
  return NextResponse.json({ ok: true })
}
