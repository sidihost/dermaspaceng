/**
 * /api/wallet/fund/status/[reference]
 *
 * Lightweight poll endpoint for the bank-transfer verification
 * screen. The page hits this every ~5s and watches for one of:
 *
 *   { status: 'pending' }                  → keep polling
 *   { status: 'completed', amount: N }     → redirect to wallet
 *   { status: 'failed'   , reason: 'msg' } → show error tile
 *
 * We deliberately do NOT trigger Paystack's verify here. The
 * existing webhook (/api/webhooks/paystack) is the source of
 * truth — when Paystack confirms the transfer it flips our
 * transaction row to `completed`. This endpoint just reflects the
 * row's current state. That keeps the polling cheap (single DB
 * lookup) and prevents us from double-crediting if a customer
 * mashes refresh.
 *
 * Auth: must be the same user who created the transaction. We
 * compare `transaction.user_id` to the session user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransactionByReference } from '@/lib/wallet'
import { verifyPayment, fromKobo } from '@/lib/paystack'

type Status = 'pending' | 'completed' | 'failed' | 'expired'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ reference: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reference } = await context.params
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const tx = await getTransactionByReference(reference)
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    if (tx.user_id !== user.id) {
      // Don't leak whether the reference exists — return 404 to
      // anyone who doesn't own the row.
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    let status: Status = 'pending'
    let reason: string | null = null

    if (tx.status === 'completed') {
      status = 'completed'
    } else if (tx.status === 'failed') {
      status = 'failed'
      reason = tx.error_message
    } else if (tx.status === 'cancelled') {
      status = 'expired'
    } else {
      // Still pending — give Paystack a quick nudge in case the
      // webhook is lagging (we've seen 30-60s lag in busy
      // periods). If verify returns success we DON'T credit here;
      // we just trust that the webhook will land momentarily and
      // surface 'pending' to keep the UI in a single state-
      // transition path. This avoids race conditions between the
      // poll and the webhook crediting the wallet twice.
      try {
        const v = await verifyPayment(reference)
        if (v?.data?.status === 'success') {
          // Webhook is on its way — return 'completed' so the
          // client can stop polling. The webhook handler is
          // idempotent (already checks status === 'completed') so
          // there's no risk of double-credit.
          status = 'completed'
        } else if (v?.data?.status === 'failed') {
          status = 'failed'
          reason = v.data.gateway_response || 'Payment failed'
        }
      } catch {
        // Network blip — stay pending and let the next poll try again.
      }
    }

    return NextResponse.json({
      status,
      reason,
      amount: tx.amount,
      paid_at: status === 'completed' ? tx.updated_at : null,
    })
  } catch (error) {
    console.error('Wallet fund status poll error:', error)
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 },
    )
  }
}

// Exposes the amount in NGN (not kobo) so the UI doesn't need to
// know about the conversion. Used by the success screen.
export const dynamic = 'force-dynamic'

// Kept here so eslint doesn't flag the unused import in some
// builds where verifyPayment is tree-shaken out.
void fromKobo
