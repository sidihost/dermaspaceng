import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

/**
 * Canonical origins we accept push subscriptions from.
 *
 * Browser notifications carry the SW's origin in the OS notification
 * UI ("from dermaspaceng.com"). If we let users subscribe on a Vercel
 * preview URL, the OS shows "from dermaspace-xyz.vercel.app" forever
 * — which was happening on the brand's phones. Subscriptions are now
 * rejected unless they come from the canonical apex domain or localhost.
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  try {
    const host = new URL(origin).hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.local')) return true
    const allowed = new Set<string>([
      'dermaspaceng.com',
      'www.dermaspaceng.com',
    ])
    const configured = process.env.NEXT_PUBLIC_APP_URL
    if (configured) {
      try { allowed.add(new URL(configured).hostname.toLowerCase()) } catch {}
    }
    return allowed.has(host)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const origin = request.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    console.warn('[push/subscribe] rejecting non-canonical origin', origin)
    return NextResponse.json(
      { error: 'Push notifications are only available on dermaspaceng.com' },
      { status: 403 },
    )
  }

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
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, origin)
      VALUES (${user.id}, ${endpoint}, ${p256dh}, ${auth}, ${ua}, ${origin})
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id      = EXCLUDED.user_id,
        p256dh       = EXCLUDED.p256dh,
        auth         = EXCLUDED.auth,
        user_agent   = EXCLUDED.user_agent,
        origin       = EXCLUDED.origin,
        last_used_at = NOW()
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe]', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}
