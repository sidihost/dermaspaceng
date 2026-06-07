/**
 * lib/reconcile-payments.ts
 *
 * Active reconciliation for pending Paystack wallet fundings.
 *
 * Webhooks are the primary signal that a payment succeeded, but they
 * are not guaranteed: the webhook URL can be misconfigured in the
 * Paystack dashboard, a delivery can be dropped, or the customer can
 * close the tab before the browser redirect fires. When that happens
 * the transaction sits at `pending` forever and the customer's money
 * never reaches their wallet — exactly the "stuck pending" symptom.
 *
 * This module asks Paystack the source-of-truth question — "what is
 * the real status of this charge?" — for every stale pending funding
 * and reconciles our row to match:
 *
 *   success   → credit the wallet via finalizeWalletFunding (idempotent)
 *   failed    → mark the transaction failed
 *   abandoned → mark cancelled (customer never paid)
 *   pending   → leave it; we'll re-check on the next sweep
 *
 * It is safe to run from anywhere and as often as we like:
 *   - finalizeWalletFunding claims the pending row atomically, so even
 *     if the webhook lands at the same instant only one path credits.
 *   - We never downgrade a row that some other path already completed.
 *
 * Callers:
 *   - GET /api/wallet/reconcile  (the user's own pending fundings, hit
 *     when the wallet page loads)
 *   - POST/GET /api/cron/reconcile-payments  (QStash sweep across all
 *     users every few minutes)
 */

import {
  getPendingFundingTransactions,
  getTransactionByReference,
  updateTransactionStatus,
  type Transaction,
} from './wallet'
import { finalizeWalletFunding } from './wallet-funding'
import { verifyPayment, fromKobo } from './paystack'

export interface ReconcileResult {
  checked: number
  credited: number
  failed: number
  cancelled: number
  stillPending: number
  errors: number
}

function channelLabelFor(tx: Transaction): string {
  return (tx.metadata as { channel?: string } | null)?.channel ===
    'bank_transfer'
    ? 'Bank Transfer'
    : 'Paystack'
}

/**
 * Reconcile a single pending funding transaction against Paystack.
 * Returns the outcome bucket so callers can aggregate counts.
 */
export async function reconcileOnePending(
  tx: Transaction,
): Promise<'credited' | 'failed' | 'cancelled' | 'pending' | 'error'> {
  // Prefer Paystack's own reference when we have it, otherwise our
  // reference (Paystack accepts either on the verify endpoint when the
  // transaction was initialized with our reference).
  const ref =
    tx.paystack_reference ||
    tx.payment_reference ||
    (tx as { reference?: string }).reference
  if (!ref) return 'pending'

  try {
    const verification = await verifyPayment(ref)
    const data = verification?.data
    if (!data) return 'pending'

    if (data.status === 'success') {
      const amount = fromKobo(data.amount)
      const result = await finalizeWalletFunding({
        userId: tx.user_id,
        amount,
        paymentReference:
          tx.payment_reference ||
          (tx as { reference?: string }).reference ||
          data.reference,
        paystackReference: data.reference,
        customerEmail: data.customer?.email,
        channelLabel: channelLabelFor(tx),
      })
      return result.credited || result.alreadyProcessed ? 'credited' : 'error'
    }

    if (data.status === 'failed') {
      await updateTransactionStatus(
        tx.id,
        'failed',
        data.gateway_response || 'Payment failed',
      )
      return 'failed'
    }

    if (data.status === 'abandoned') {
      await updateTransactionStatus(
        tx.id,
        'cancelled',
        'Payment abandoned by user',
      )
      return 'cancelled'
    }

    // Still pending on Paystack's side too — leave it for next sweep.
    return 'pending'
  } catch (error) {
    console.error('[reconcile-payments] verify failed for', ref, error)
    return 'error'
  }
}

/**
 * Reconcile every stale pending Paystack funding across all users.
 * Used by the QStash cron sweep.
 */
export async function reconcilePendingFundings(opts?: {
  minAgeSeconds?: number
  maxAgeHours?: number
  limit?: number
}): Promise<ReconcileResult> {
  const pending = await getPendingFundingTransactions(
    opts?.minAgeSeconds ?? 60,
    opts?.maxAgeHours ?? 72,
    opts?.limit ?? 100,
  )

  const result: ReconcileResult = {
    checked: pending.length,
    credited: 0,
    failed: 0,
    cancelled: 0,
    stillPending: 0,
    errors: 0,
  }

  for (const tx of pending) {
    const outcome = await reconcileOnePending(tx)
    if (outcome === 'credited') result.credited++
    else if (outcome === 'failed') result.failed++
    else if (outcome === 'cancelled') result.cancelled++
    else if (outcome === 'pending') result.stillPending++
    else result.errors++
  }

  return result
}

/**
 * Reconcile only the pending fundings belonging to a single user.
 * Used by the on-demand endpoint the wallet page calls, so a customer
 * who just paid sees their balance update without waiting for the
 * next cron sweep. We look the rows up by reference to reuse the same
 * single-transaction path.
 */
export async function reconcileUserPendingFundings(
  references: string[],
): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    checked: 0,
    credited: 0,
    failed: 0,
    cancelled: 0,
    stillPending: 0,
    errors: 0,
  }

  for (const ref of references) {
    const tx = await getTransactionByReference(ref)
    if (!tx || tx.status !== 'pending') continue
    result.checked++
    const outcome = await reconcileOnePending(tx)
    if (outcome === 'credited') result.credited++
    else if (outcome === 'failed') result.failed++
    else if (outcome === 'cancelled') result.cancelled++
    else if (outcome === 'pending') result.stillPending++
    else result.errors++
  }

  return result
}
