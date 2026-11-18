import { NextRequest, NextResponse } from 'next/server'
import { verifyQStash } from '@/lib/qstash'
import { reconcilePendingFundings } from '@/lib/reconcile-payments'
import { authorizeCronManualGet } from '@/lib/cron-auth'

// ---------------------------------------------------------------------------
// /api/cron/reconcile-payments
//
// Safety net for the payment pipeline. Webhooks are the primary signal
// that a Paystack charge succeeded, but they can be missed (URL not
// configured, delivery dropped, customer closed the tab before the
// browser redirect). This sweep asks Paystack the source-of-truth
// question for every stale pending wallet funding and reconciles our
// row to match — crediting successful payments, failing declined ones,
// and cancelling abandoned ones.
//
// Runs every few minutes via QStash (see lib/qstash-schedules.ts). All
// crediting goes through the idempotent finalizeWalletFunding, so this
// can never double-credit even if it races the live webhook.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

async function runJob() {
  // Re-check fundings that are at least a minute old (so we never race
  // a live checkout) and up to 30 days old so stranded pending payments
  // are never left behind. 200 per sweep keeps each run bounded.
  return reconcilePendingFundings({
    minAgeSeconds: 60,
    maxAgeHours: 24 * 30,
    limit: 200,
  })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const ok = await verifyQStash(request, rawBody)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }
  try {
    const r = await runJob()
    return NextResponse.json({ success: true, source: 'qstash', ...r })
  } catch (error) {
    console.error('[reconcile-payments] qstash run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!(await authorizeCronManualGet(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const r = await runJob()
    return NextResponse.json({ success: true, source: 'manual', ...r })
  } catch (error) {
    console.error('[reconcile-payments] manual run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
