import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendAbandonedPaymentReminder } from '@/lib/wallet-emails'
import { verifyQStash } from '@/lib/qstash'

// ---------------------------------------------------------------------------
// /api/cron/abandoned-payments
//
// Hourly job (now via QStash, see lib/qstash-schedules.ts) that emails
// recovery links for pending payments. Vercel Hobby couldn't actually
// run this hourly — only daily — which left the recovery funnel mostly
// inactive. QStash gives us the cadence we always wanted.
//
// Reminder rules:
//   * payment is 'pending'
//   * created > 30 minutes ago (give the user a chance to finish first)
//   * not yet expired
//   * never reminded, OR last reminder > 24 hours ago
//   * fewer than 3 prior reminders
// At the end we also purge any abandoned_payments rows that expired
// > 7 days ago and weren't recovered — keeps the table from growing
// unbounded.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

type RunResult = { candidates: number; sent: number; failed: number }

async function runJob(): Promise<RunResult> {
  const abandonedPayments = await sql`
    SELECT
      ap.*,
      u.email,
      u.first_name
    FROM abandoned_payments ap
    JOIN users u ON ap.user_id = u.id
    WHERE ap.status = 'pending'
      AND ap.expires_at > NOW()
      AND ap.created_at < NOW() - INTERVAL '30 minutes'
      AND (
        ap.reminder_sent_at IS NULL
        OR ap.reminder_sent_at < NOW() - INTERVAL '24 hours'
      )
      AND ap.reminder_count < 3
    ORDER BY ap.created_at ASC
    LIMIT 50
  `

  let sent = 0
  let failed = 0

  for (const payment of abandonedPayments) {
    try {
      const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/continue-payment?token=${payment.recovery_token}`

      let itemDescription = 'your purchase'
      if (payment.payment_type === 'booking' && payment.item_details?.serviceName) {
        itemDescription = `your ${payment.item_details.serviceName} booking`
      } else if (payment.payment_type === 'gift_card') {
        itemDescription = 'your gift card purchase'
      } else if (payment.payment_type === 'wallet_funding') {
        itemDescription = 'your wallet top-up'
      }

      await sendAbandonedPaymentReminder({
        email: payment.email,
        firstName: payment.first_name,
        paymentType: payment.payment_type,
        amount: payment.amount,
        itemDetails: payment.item_details || {},
        recoveryUrl,
      })

      await sql`
        UPDATE abandoned_payments
        SET reminder_sent_at = NOW(),
            reminder_count = reminder_count + 1
        WHERE id = ${payment.id}
      `
      sent++
    } catch (error) {
      console.error(`[abandoned-payments] failed for ${payment.id}:`, error)
      failed++
    }
  }

  // Weekly housekeeping — runs on every invocation but only matches
  // long-expired rows, so it's a cheap idempotent cleanup.
  await sql`
    DELETE FROM abandoned_payments
    WHERE expires_at < NOW() - INTERVAL '7 days'
      AND status NOT IN ('recovered', 'completed')
  `

  return { candidates: abandonedPayments.length, sent, failed }
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
    console.error('[abandoned-payments] qstash run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  try {
    const r = await runJob()
    return NextResponse.json({ success: true, source: 'manual', ...r })
  } catch (error) {
    console.error('[abandoned-payments] manual run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
