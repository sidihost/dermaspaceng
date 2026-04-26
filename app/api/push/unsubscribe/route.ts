import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { endpoint } = await request.json()
    if (endpoint) {
      await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND user_id = ${user.id}`
    } else {
      await sql`DELETE FROM push_subscriptions WHERE user_id = ${user.id}`
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
