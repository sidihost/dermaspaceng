/**
 * /api/cron/broadcasts
 *
 * Picks up every `notification_broadcasts` row whose `status` is
 * `scheduled` and `scheduled_at` has passed, then dispatches it. Now
 * scheduled by QStash (see lib/qstash-schedules.ts) at 5-minute
 * resolution — Vercel Hobby cron forced daily cadence, which made
 * "schedule a broadcast for 9:05" silently land 24h later.
 *
 * The route is fully idempotent: dispatchDueBroadcasts() updates each
 * broadcast's status to `sent` inside a transaction, so retries from
 * QStash on transient failures only re-deliver the broadcasts that
 * didn't successfully send the first time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { dispatchDueBroadcasts } from '@/lib/broadcast-dispatcher'
import { verifyQStash } from '@/lib/qstash'

export const dynamic = 'force-dynamic'

async function runJob() {
  const r = await dispatchDueBroadcasts()
  return { dispatched: r.count }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const ok = await verifyQStash(request, rawBody)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }
  try {
    const r = await runJob()
    return NextResponse.json({ ok: true, source: 'qstash', ...r })
  } catch (err) {
    console.error('[cron/broadcasts] qstash', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  try {
    const r = await runJob()
    return NextResponse.json({ ok: true, source: 'manual', ...r })
  } catch (err) {
    console.error('[cron/broadcasts] manual', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
