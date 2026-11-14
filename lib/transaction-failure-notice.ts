import { query } from '@/lib/db'
import { getUserById } from '@/lib/auth'
import { getVisibleEmail, isPlaceholderEmail } from '@/lib/auth-onboarding'
import { type Transaction } from '@/lib/wallet'
import {
  sendGiftCardPaymentCancelled,
  sendPaymentCancelledEmail,
} from '@/lib/email'
import { sendPaymentFailedEmail } from '@/lib/wallet-emails'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Dispatch an email notice and retry once if the mail helper returns `false`
 * or throws on a transient error. Exported for unit testing.
 */
export async function dispatchNoticeWithRetry(
  sendFn: () => Promise<boolean>,
  opts?: { maxAttempts?: number; retryDelayMs?: number },
): Promise<boolean> {
  const maxAttempts = Math.max(1, opts?.maxAttempts ?? 2)
  const retryDelayMs = Math.max(0, opts?.retryDelayMs ?? 250)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ok = await sendFn()
      if (ok) return true
    } catch (err) {
      console.error(
        `[transaction-failure-notice] notice send error (attempt ${attempt}/${maxAttempts}):`,
        err,
      )
    }

    if (attempt < maxAttempts && retryDelayMs > 0) {
      await sleep(retryDelayMs)
    }
  }

  return false
}

async function sendTransactionFailureEmail(opts: {
  transaction: Transaction
  status: 'failed' | 'cancelled'
  reason: string
  customerEmail?: string | null
}): Promise<{ delivered: boolean; hasRecipient: boolean }> {
  const { transaction, status, reason, customerEmail } = opts
  const meta = (transaction.metadata || {}) as {
    type?: string
    itemDetails?: Record<string, unknown>
  }
  const txType = meta?.type
  const user = await getUserById(String(transaction.user_id))
  const realUserEmail = getVisibleEmail(user)
  const fallbackEmail =
    customerEmail && !isPlaceholderEmail(customerEmail)
      ? customerEmail.trim()
      : ''
  const recipientEmail = realUserEmail || fallbackEmail

  if (!recipientEmail) {
    return { delivered: true, hasRecipient: false }
  }

  const firstName = user?.first_name || 'Valued Customer'
  const ref =
    transaction.payment_reference ||
    transaction.paystack_reference ||
    (transaction as { reference?: string }).reference ||
    String(transaction.id)

  const delivered = await dispatchNoticeWithRetry(async () => {
    if (txType === 'gift_card') {
      const rawDetails = meta.itemDetails || {}
      const recipientName = String(rawDetails.recipientName || 'Recipient')
      const senderName =
        String(rawDetails.senderName || '').trim() ||
        (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '') ||
        firstName

      return sendGiftCardPaymentCancelled({
        userEmail: recipientEmail,
        userName: senderName,
        amount: Math.round(Number(transaction.amount) || 0),
        recipientName,
      })
    }

    if (status === 'cancelled') {
      return sendPaymentCancelledEmail({
        email: recipientEmail,
        firstName,
        amount: Math.round(Number(transaction.amount) || 0),
        reason: reason || 'Payment cancelled before completion',
        reference: ref,
        paymentType: txType,
      })
    }

    return sendPaymentFailedEmail({
      email: recipientEmail,
      firstName,
      amount: Math.round(Number(transaction.amount) || 0),
      reason: reason || 'Payment could not be processed',
      reference: ref,
    })
  })

  return { delivered, hasRecipient: true }
}

async function cleanupMatchingAbandonedPayment(transaction: Transaction): Promise<void> {
  try {
    const meta = (transaction.metadata || {}) as { type?: string }
    const abandonedType =
      meta?.type === 'gift_card'
        ? 'gift_card'
        : meta?.type === 'membership_subscription'
          ? 'service'
          : 'wallet_funding'

    await query(
      `DELETE FROM abandoned_payments
        WHERE id IN (
          SELECT id FROM abandoned_payments
           WHERE user_id = $1
             AND payment_type = $2
             AND status = 'pending'
           ORDER BY created_at DESC
           LIMIT 1
        )`,
      [transaction.user_id, abandonedType],
    )
  } catch (err) {
    console.error('[transaction-failure-notice] abandoned cleanup failed:', err)
  }
}

async function markNoticeSent(transactionId: string | number): Promise<void> {
  await query(
    `UPDATE transactions
        SET metadata = COALESCE(metadata, '{}'::jsonb)
                       || jsonb_build_object('failure_notice_sent_at', NOW()::text)
                       - 'failure_notice_pending'
      WHERE id = $1`,
    [transactionId],
  )
}

async function markNoticePending(transactionId: string | number): Promise<void> {
  await query(
    `UPDATE transactions
        SET metadata = COALESCE(metadata, '{}'::jsonb)
                       || '{"failure_notice_pending": true}'::jsonb
      WHERE id = $1`,
    [transactionId],
  )
}

/**
 * Atomically transitions a `pending` transaction to `'failed'` or
 * `'cancelled'`, cleans up pending abandoned-cart reminders, and dispatches
 * the matching transactional email with retry + delivery tracking so transient
 * SMTP failures are recovered rather than silently dropped until a later cancel.
 */
export async function finalizePendingTransactionFailureOrCancel(opts: {
  transaction: Transaction
  nextStatus: 'failed' | 'cancelled'
  reason: string
  customerEmail?: string | null
}): Promise<{ transitioned: boolean; emailSent: boolean }> {
  const { transaction, nextStatus, reason, customerEmail } = opts

  const claim = await query<{ id: number }>(
    `UPDATE transactions
        SET status = $2,
            error_message = $3,
            updated_at = NOW()
      WHERE id = $1
        AND status = 'pending'
      RETURNING id`,
    [transaction.id, nextStatus, reason || null],
  )

  if (claim.rows.length === 0) {
    return { transitioned: false, emailSent: false }
  }

  await cleanupMatchingAbandonedPayment(transaction)

  let emailSent = false
  try {
    const res = await sendTransactionFailureEmail({
      transaction,
      status: nextStatus,
      reason,
      customerEmail,
    })
    emailSent = res.delivered

    if (res.hasRecipient) {
      if (res.delivered) {
        await markNoticeSent(transaction.id)
      } else {
        await markNoticePending(transaction.id)
      }
    }
  } catch (err) {
    console.error('[transaction-failure-notice] email dispatch failed:', err)
    try {
      await markNoticePending(transaction.id)
    } catch {
      // ignore metadata flag error
    }
  }

  return { transitioned: true, emailSent }
}

/**
 * Atomically recover and send a missed failure/cancellation email for a
 * transaction whose status already flipped while SMTP failed.
 */
export async function retryPendingFailureNotice(
  tx: Transaction,
): Promise<boolean> {
  if (tx.status !== 'cancelled' && tx.status !== 'failed') {
    return false
  }

  const claim = await query<{ id: number }>(
    `UPDATE transactions
        SET metadata = COALESCE(metadata, '{}'::jsonb) - 'failure_notice_pending'
      WHERE id = $1
        AND status IN ('cancelled', 'failed')
        AND COALESCE((metadata->>'failure_notice_pending')::boolean, false) = true
        AND metadata->>'failure_notice_sent_at' IS NULL
      RETURNING id`,
    [tx.id],
  )

  if (claim.rows.length === 0) {
    return false
  }

  try {
    const res = await sendTransactionFailureEmail({
      transaction: tx,
      status: tx.status,
      reason:
        tx.error_message ||
        (tx.status === 'cancelled'
          ? 'Payment cancelled before completion'
          : 'Payment could not be processed'),
    })

    if (res.hasRecipient) {
      if (res.delivered) {
        await markNoticeSent(tx.id)
        return true
      }
      await markNoticePending(tx.id)
      return false
    }
    return false
  } catch (err) {
    console.error('[transaction-failure-notice] retry failed:', err)
    await markNoticePending(tx.id).catch(() => {})
    return false
  }
}

export async function getPendingFailureNoticeTransactions(opts?: {
  userId?: string | number
  limit?: number
}): Promise<Transaction[]> {
  const limit = opts?.limit ?? 50
  const params: (string | number)[] = [limit]
  let userClause = ''
  if (opts?.userId !== undefined && opts?.userId !== null) {
    params.push(opts.userId)
    userClause = ` AND user_id = $${params.length}`
  }

  const result = await query<Transaction>(
    `SELECT *, reference AS payment_reference
       FROM transactions
      WHERE status IN ('cancelled', 'failed')
        AND COALESCE((metadata->>'failure_notice_pending')::boolean, false) = true
        AND metadata->>'failure_notice_sent_at' IS NULL
        AND created_at >= NOW() - INTERVAL '7 days'${userClause}
      ORDER BY updated_at DESC
      LIMIT $1`,
    params,
  )
  return result.rows
}
