/**
 * /api/cron/broadcasts
 *
 * Wakes up once a minute (Vercel Cron — see `vercel.json`) and
 * dispatches every `notification_broadcasts` row whose `status` is
 * `scheduled` and `scheduled_at` has passed.
 *
 * Auth: Vercel Cron sets the Authorization header to `Bearer <CRON_SECRET>`
 * if the env var is set, otherwise the route is open. We check the
 * standard `x-vercel-cron` header as a defense-in-depth check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { dispatchDueBroadcasts } from '@/lib/broadcast-dispatcher'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const r = await dispatchDueBroadcasts()
    return NextResponse.json({ ok: true, dispatched: r.count })
  } catch (err) {
    console.error('[cron/broadcasts]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
