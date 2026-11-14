/**
 * lib/reconcile-payments.ts
 *
 * Active reconciliation for pending Paystack wallet fundings, gift cards, and
 * membership subscriptions.
 */

import {
  getPendingFundingTransactions,
  getTransactionByReference,
  expireStalePendingFundings,
  type Transaction,
} from './wallet'
import { finalizeWalletFunding } from './wallet-funding'
import { finalizeGiftCardPaystackPayment } from './gift-cards'
import { finalizeMembershipPaystackPayment } from './membership-activation'
import {
  finalizePendingTransactionFailureOrCancel,
  getPendingFailureNoticeTransactions,
  retryPendingFailureNotice,
} from './transaction-failure-notice'
import { classifyPaystackStatusForReconcile } from './payment-reconcile-policy'
import { verifyPayment, fromKobo } from './paystack'

export interface ReconcileResult {
  checked: number
  credited: number
  failed: number
  cancelled: number
  stillPending: number
  errors: number
  expired?: number
  noticesRecovered?: number
}

function channelFor(tx: Transaction): string | undefined {
  return (tx.metadata as { channel?: string } | null)?.channel
}

function channelLabelFor(tx: Transaction): string {
  return channelFor(tx) === 'bank_transfer' ? 'Bank Transfer' : 'Paystack'
}

function transactionAgeSeconds(tx: Transaction): number {
  const created = new Date(tx.created_at).getTime()
  if (!Number.isFinite(created)) return 0
  return Math.max(0, Math.floor((Date.now() - created) / 1000))
}

/**
 * Reconcile a single pending funding transaction against Paystack.
 * Returns the outcome bucket so callers can aggregate counts.
 */
export async function reconcileOnePending(
  tx: Transaction,
  opts?: { isDirectCallback?: boolean },
): Promise<'credited' | 'failed' | 'cancelled' | 'pending' | 'error'> {
  const txType = (tx.metadata as { type?: string } | null)?.type

  const ref =
    tx.paystack_reference ||
    tx.payment_reference ||
    (tx as { reference?: string }).reference
  if (!ref) return 'pending'

  try {
    const verification = await verifyPayment(ref)
    const data = verification?.data
    if (!data) return 'pending'

    const decision = classifyPaystackStatusForReconcile({
      paystackStatus: data.status,
      gatewayResponse: data.gateway_response,
      channel: channelFor(tx),
      ageSeconds: transactionAgeSeconds(tx),
      isDirectCallback: opts?.isDirectCallback,
    })

    if (decision.action === 'credit') {
      const amount = fromKobo(data.amount)
      if (txType === 'membership_subscription') {
        const msResult = await finalizeMembershipPaystackPayment({
          transaction: tx,
          paystackReference: data.reference,
          amountPaid: amount,
          customerEmail: data.customer?.email,
        })
        return msResult.activated || msResult.alreadyProcessed
          ? 'credited'
          : 'error'
      }

      if (txType === 'gift_card') {
        const gcResult = await finalizeGiftCardPaystackPayment({
          transaction: tx,
          paystackReference: data.reference,
          amount,
          customerEmail: data.customer?.email,
          channelLabel: channelLabelFor(tx),
        })
        return gcResult.finalized || gcResult.alreadyProcessed
          ? 'credited'
          : 'error'
      }

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

    if (decision.action === 'fail') {
      await finalizePendingTransactionFailureOrCancel({
        transaction: tx,
        nextStatus: 'failed',
        reason: decision.reason,
        customerEmail: data.customer?.email,
      })
      return 'failed'
    }

    if (decision.action === 'cancel') {
      await finalizePendingTransactionFailureOrCancel({
        transaction: tx,
        nextStatus: 'cancelled',
        reason: decision.reason,
        customerEmail: data.customer?.email,
      })
      return 'cancelled'
    }

    return 'pending'
  } catch (error) {
    console.error('[reconcile-payments] verify failed for', ref, error)
    return 'error'
  }
}

/**
 * Recover any failed/cancelled transactions whose initial SMTP notification
 * did not deliver so no first cancellation email stays lost.
 */
async function recoverUnsentFailureNotices(
  userId?: string | number,
): Promise<number> {
  try {
    const unsent = await getPendingFailureNoticeTransactions({ userId, limit: 50 })
    let recovered = 0
    for (const tx of unsent) {
      const sent = await retryPendingFailureNotice(tx)
      if (sent) recovered++
    }
    return recovered
  } catch (err) {
    console.error('[reconcile-payments] recoverUnsentFailureNotices error:', err)
    return 0
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
  expireOlderThanHours?: number
}): Promise<ReconcileResult> {
  const pending = await getPendingFundingTransactions(
    opts?.minAgeSeconds ?? 60,
    opts?.maxAgeHours ?? 24 * 30,
    opts?.limit ?? 100,
  )

  const result: ReconcileResult = {
    checked: pending.length,
    credited: 0,
    failed: 0,
    cancelled: 0,
    stillPending: 0,
    errors: 0,
    expired: 0,
    noticesRecovered: 0,
  }

  for (const tx of pending) {
    const outcome = await reconcileOnePending(tx)
    if (outcome === 'credited') result.credited++
    else if (outcome === 'failed') result.failed++
    else if (outcome === 'cancelled') result.cancelled++
    else if (outcome === 'pending') result.stillPending++
    else result.errors++
  }

  result.expired = await expireStalePendingFundings(
    opts?.expireOlderThanHours ?? 24,
  )
  result.noticesRecovered = await recoverUnsentFailureNotices()

  return result
}

/**
 * Reconcile pending fundings belonging to a single user.
 */
export async function reconcileUserPendingFundings(
  references: string[],
  userId?: string | number,
): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    checked: 0,
    credited: 0,
    failed: 0,
    cancelled: 0,
    stillPending: 0,
    errors: 0,
    noticesRecovered: 0,
  }

  for (const ref of references) {
    const tx = await getTransactionByReference(ref)
    if (!tx) continue
    if (tx.status === 'cancelled' || tx.status === 'failed') {
      const recovered = await retryPendingFailureNotice(tx)
      if (recovered) result.noticesRecovered = (result.noticesRecovered ?? 0) + 1
      continue
    }
    if (tx.status !== 'pending') continue
    result.checked++
    const outcome = await reconcileOnePending(tx)
    if (outcome === 'credited') result.credited++
    else if (outcome === 'failed') result.failed++
    else if (outcome === 'cancelled') result.cancelled++
    else if (outcome === 'pending') result.stillPending++
    else result.errors++
  }

  if (userId !== undefined && userId !== null) {
    result.noticesRecovered =
      (result.noticesRecovered ?? 0) +
      (await recoverUnsentFailureNotices(userId))
  }

  return result
}

/**
 * Immediately reconcile a single reference owned by `userId` (no age delay),
 * used when returning to or polling `/dashboard/wallet/payment-status`.
 */
export async function reconcileUserReference(
  userId: string | number,
  reference: string,
): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    checked: 0,
    credited: 0,
    failed: 0,
    cancelled: 0,
    stillPending: 0,
    errors: 0,
    noticesRecovered: 0,
  }

  const tx = await getTransactionByReference(reference)
  if (!tx || String(tx.user_id) !== String(userId)) {
    return result
  }

  if (tx.status === 'cancelled' || tx.status === 'failed') {
    const recovered = await retryPendingFailureNotice(tx)
    if (recovered) result.noticesRecovered = 1
    return result
  }

  if (tx.status !== 'pending') {
    return result
  }

  result.checked = 1
  const outcome = await reconcileOnePending(tx, { isDirectCallback: true })
  if (outcome === 'credited') result.credited++
  else if (outcome === 'failed') result.failed++
  else if (outcome === 'cancelled') result.cancelled++
  else if (outcome === 'pending') result.stillPending++
  else result.errors++

  return result
}
