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
import { finalizeWalletFunding } from '@/lib/wallet-funding'
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
    if (String(tx.user_id) !== String(user.id)) {
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
      // Still pending — actively confirm with Paystack instead of
      // waiting for the webhook. Bank-transfer funding used to rely
      // ENTIRELY on the webhook to credit the wallet, which meant a
      // missing/misconfigured webhook (or one Paystack never
      // delivered) left the customer's money in limbo: the transfer
      // succeeded but their balance never moved.
      //
      // Now, when Paystack's verify says the charge succeeded, we
      // credit the wallet right here via `finalizeWalletFunding`.
      // That helper is idempotent (it claims the pending row
      // atomically), so even if the webhook lands at the exact same
      // moment only ONE of them actually credits — no double-credit,
      // no duplicate email/invoice. The poll becomes a reliable
      // fallback rather than a passive observer.
      try {
        const v = await verifyPayment(reference)
        if (v?.data?.status === 'success') {
          const amount = fromKobo(v.data.amount)
          const channelLabel =
            (tx.metadata as { channel?: string } | null)?.channel ===
            'bank_transfer'
              ? 'Bank Transfer'
              : 'Paystack'
          const result = await finalizeWalletFunding({
            userId: tx.user_id,
            amount,
            paymentReference: reference,
            paystackReference: v.data.reference,
            customerEmail: v.data.customer?.email,
            channelLabel,
          })
          // Whether we credited just now or the webhook beat us to
          // it, the funding is done — tell the client to stop polling.
          status =
            result.credited || result.alreadyProcessed ? 'completed' : 'pending'
        } else if (v?.data?.status === 'failed') {
          status = 'failed'
          reason = v.data.gateway_response || 'Payment failed'
        }
      } catch {
        // Network blip — stay pending and let the next poll try again.
      }
    }

    // Re-read so a fresh credit surfaces the up-to-date amount/status.
    const finalTx =
      status === 'completed' ? await getTransactionByReference(reference) : tx

    return NextResponse.json({
      status,
      reason,
      amount: finalTx?.amount ?? tx.amount,
      paid_at:
        status === 'completed' ? finalTx?.updated_at ?? tx.updated_at : null,
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
