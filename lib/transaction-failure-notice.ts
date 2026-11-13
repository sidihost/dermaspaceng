import { query } from '@/lib/db'
import { getUserById } from '@/lib/auth'
import { type Transaction } from '@/lib/wallet'
import { sendGiftCardPaymentCancelled } from '@/lib/email'
import { sendPaymentFailedEmail } from '@/lib/wallet-emails'

/**
 * Atomically transitions a `pending` transaction to `'failed'` or
 * `'cancelled'` and dispatches the matching transactional email once.
 * Concurrent callbacks / webhooks / cron sweeps lose the RETURNING claim
 * so the customer never receives duplicate emails.
 */
export async function finalizePendingTransactionFailureOrCancel(opts: {
  transaction: Transaction
  nextStatus: 'failed' | 'cancelled'
  reason: string
  customerEmail?: string | null
}): Promise<{ transitioned: boolean }> {
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
    return { transitioned: false }
  }

  try {
    const meta = (transaction.metadata || {}) as {
      type?: string
      itemDetails?: Record<string, unknown>
    }
    const txType = meta?.type
    const user = await getUserById(String(transaction.user_id))
    const recipientEmail = user?.email || customerEmail || ''
    if (!recipientEmail) return { transitioned: true }

    const firstName = user?.first_name || 'Valued Customer'

    if (txType === 'gift_card') {
      const rawDetails = meta.itemDetails || {}
      const recipientName = String(rawDetails.recipientName || 'Recipient')
      const senderName =
        String(rawDetails.senderName || '').trim() ||
        (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '') ||
        firstName

      await sendGiftCardPaymentCancelled({
        userEmail: recipientEmail,
        userName: senderName,
        amount: Math.round(Number(transaction.amount) || 0),
        recipientName,
      })
    } else if (nextStatus === 'failed') {
      const ref =
        transaction.payment_reference ||
        transaction.paystack_reference ||
        (transaction as { reference?: string }).reference ||
        String(transaction.id)

      await sendPaymentFailedEmail({
        email: recipientEmail,
        firstName,
        amount: Math.round(Number(transaction.amount) || 0),
        reason: reason || 'Payment could not be processed',
        reference: ref,
      })
    }
  } catch (err) {
    console.error('[transaction-failure-notice] email dispatch failed:', err)
  }

  return { transitioned: true }
}
