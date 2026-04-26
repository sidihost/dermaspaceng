import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const sub = body.subscription || body
    const endpoint: string | undefined = sub?.endpoint
    const p256dh: string | undefined = sub?.keys?.p256dh
    const auth: string | undefined = sub?.keys?.auth
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }
    const ua = request.headers.get('user-agent') || null

    await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
      VALUES (${user.id}, ${endpoint}, ${p256dh}, ${auth}, ${ua})
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id      = EXCLUDED.user_id,
        p256dh       = EXCLUDED.p256dh,
        auth         = EXCLUDED.auth,
        user_agent   = EXCLUDED.user_agent,
        last_used_at = NOW()
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe]', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}
