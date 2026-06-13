/**
 * lib/wallet-funding.ts
 *
 * Single source of truth for "a wallet-funding payment succeeded —
 * credit the wallet and fire the side-effects exactly once".
 *
 * Three independent code paths can observe a successful funding:
 *
 *   1. /api/webhooks/paystack          (Paystack server-to-server, retries hard)
 *   2. /api/wallet/verify              (browser callback redirect after card pay)
 *   3. /api/wallet/fund/status/[ref]   (bank-transfer poll nudging /verify)
 *
 * Previously each path had its own copy of the credit + email +
 * invoice logic, and the bank-transfer poll didn't credit AT ALL —
 * it just trusted the webhook, so a missing/late webhook meant the
 * customer's money never reached their wallet.
 *
 * This helper fixes both problems:
 *   - It is the ONLY place that finalises a funding, so the three
 *     callers stay byte-for-byte consistent.
 *   - It leans on `creditWallet`'s atomic pending→completed claim for
 *     idempotency. The FIRST caller credits + emails + invoices; every
 *     other caller (webhook retry, poll, double redirect) gets
 *     `alreadyProcessed: true` and returns a clean no-op. No double
 *     credit, no duplicate email, no duplicate invoice.
 */

import {
  creditWallet,
  createInvoice,
  deleteAbandonedPayment,
  getWalletBalance,
  type Transaction,
} from './wallet'
import { query } from './db'
import { getUserById } from './auth'
import { sendWalletFundingConfirmation, sendInvoiceEmail } from './wallet-emails'

export interface FinalizeFundingResult {
  /** A fresh credit was applied by THIS call. */
  credited: boolean
  /** The reference was already completed by an earlier call — no-op. */
  alreadyProcessed: boolean
  /** Wallet balance after the credit (best effort; 0 on failure). */
  newBalance: number
  transaction?: Transaction
  error?: string
}

/**
 * Credit a successful wallet funding exactly once and send the
 * confirmation + invoice emails. Safe to call from every success
 * path and safe to call repeatedly for the same reference.
 */
export async function finalizeWalletFunding({
  userId,
  amount,
  paymentReference,
  paystackReference,
  customerEmail,
  channelLabel = 'Paystack',
}: {
  // User IDs are VARCHAR(36) in the DB; the Transaction type models
  // them as `number`, so accept both and bind them as-is.
  userId: number | string
  /** Funding amount in NGN (not kobo). */
  amount: number
  /** Our own reference (`WF_...` / `WBT_...`) — the idempotency key. */
  paymentReference: string
  /** Paystack's reference, if known. */
  paystackReference?: string
  /** Fallback email when we can't load the user row. */
  customerEmail?: string
  /** Shown on the invoice, e.g. "Paystack" or "Bank Transfer". */
  channelLabel?: string
}): Promise<FinalizeFundingResult> {
  const creditResult = await creditWallet(
    userId as number,
    amount,
    `Wallet funding via ${channelLabel}`,
    paymentReference,
    paystackReference,
  )

  if (!creditResult.success) {
    return {
      credited: false,
      alreadyProcessed: false,
      newBalance: 0,
      error: creditResult.error || 'Failed to credit wallet',
    }
  }

  // Idempotent no-op: someone already finalised this reference.
  // The emails/invoice were sent by that first caller — do nothing.
  if (creditResult.alreadyProcessed) {
    return {
      credited: false,
      alreadyProcessed: true,
      newBalance: await safeBalance(userId),
      transaction: creditResult.transaction,
    }
  }

  // ---- We are the first (and only) caller. Run side-effects. ----
  const newBalance = await safeBalance(userId)
  const user = await getUserById(String(userId))

  // Invoice (best effort — must never block the customer's credit).
  let invoiceNumber: string | null = null
  try {
    if (creditResult.transaction) {
      const invoice = await createInvoice(
        userId as number,
        creditResult.transaction.id,
        amount,
        [{ description: 'Wallet Funding', amount, quantity: 1 }],
        {
          name: user ? `${user.first_name} ${user.last_name}` : 'Customer',
          email: user?.email || customerEmail || '',
          payment_method: channelLabel,
          payment_reference: paymentReference,
        },
      )
      invoiceNumber = invoice?.invoice_number ?? null
    }
  } catch (err) {
    console.error('[finalizeWalletFunding] invoice failed', err)
  }

  // Confirmation + invoice emails (best effort).
  try {
    if (user) {
      await sendWalletFundingConfirmation({
        email: user.email,
        firstName: user.first_name,
        amount,
        newBalance,
        reference: paymentReference,
      })

      if (invoiceNumber) {
        await sendInvoiceEmail({
          email: user.email,
          firstName: user.first_name,
          invoiceNumber,
          amount,
          items: [{ description: 'Wallet Funding', amount, quantity: 1 }],
          paymentMethod: channelLabel,
          paymentReference,
        })
      }
    }
  } catch (err) {
    console.error('[finalizeWalletFunding] email failed', err)
  }

  // In-app notification (bell + push). Previously a successful funding
  // only produced an email — nothing landed on the in-app bell, so a
  // customer who never opens their inbox had no signal their money
  // arrived. We fire it here, inside the "first caller" branch, so
  // webhook retries / the verify redirect can't duplicate it. The
  // deep-link opens the receipt for this exact funding reference.
  try {
    const { notifyUser } = await import('./notifications')
    await notifyUser({
      userId: String(userId),
      title: 'Wallet funded',
      message: `Your wallet was funded with \u20A6${amount.toLocaleString('en-NG')} via ${channelLabel}. New balance: \u20A6${newBalance.toLocaleString('en-NG')}.`,
      type: 'status_update',
      referenceType: 'transaction',
      referenceId: paymentReference,
      actionUrl: `/dashboard/transactions/${paymentReference}`,
      priority: 'normal',
    })
  } catch (err) {
    console.error('[finalizeWalletFunding] notify failed', err)
  }

  // Clear any abandoned-payment recovery row for this user/funding so
  // they don't get a "you left money on the table" reminder after
  // they've actually paid. Best effort.
  try {
    const abandoned = await query<{ id: number }>(
      `SELECT id FROM abandoned_payments
         WHERE user_id = $1 AND payment_type = 'wallet_funding'
         ORDER BY created_at DESC LIMIT 1`,
      [userId],
    )
    if (abandoned.rows[0]) {
      await deleteAbandonedPayment(abandoned.rows[0].id)
    }
  } catch (err) {
    console.error('[finalizeWalletFunding] abandoned cleanup failed', err)
  }

  return {
    credited: true,
    alreadyProcessed: false,
    newBalance,
    transaction: creditResult.transaction,
  }
}

async function safeBalance(userId: number | string): Promise<number> {
  try {
    return await getWalletBalance(userId as number)
  } catch {
    return 0
  }
}
