/**
 * /api/wallet/fund/bank-transfer
 *
 * Wallet funding via Paystack's "Bank Transfer" channel.
 *
 * Flow:
 *   1. Customer picks "Pay with Bank Transfer" in the Fund Wallet modal.
 *   2. We hit this endpoint with `{ amount }`.
 *   3. We:
 *       a. Create a pending wallet transaction (so the row exists when
 *          the verify endpoint and webhook look for it).
 *       b. Reserve a one-time virtual account with Paystack via
 *          `initializeBankTransfer`.
 *       c. Return the bank details + reference + expiry to the client.
 *   4. The client renders the "Pay With Bank Transfer" verification
 *      screen at /dashboard/wallet/bank-transfer/[reference], which
 *      polls /api/wallet/fund/status/[reference] until the
 *      transaction flips to `completed`.
 *   5. Paystack's webhook hits /api/webhooks/paystack and credits the
 *      wallet via the SAME pipeline used for card payments, so this
 *      endpoint adds no new credit logic — just the channel.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  initializeBankTransfer,
  generateReference,
  toKobo,
} from '@/lib/paystack'
import {
  createPendingTransaction,
  createAbandonedPayment,
  updateTransactionStatus,
} from '@/lib/wallet'
import { getBaseUrl } from '@/lib/app-url'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()

    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 100) {
      return NextResponse.json(
        { error: 'Enter a whole-naira amount of at least N100' },
        { status: 400 },
      )
    }
    if (amount > 10_000_000) {
      return NextResponse.json(
        { error: 'Maximum funding amount is N10,000,000' },
        { status: 400 },
      )
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payments are not configured yet. Please contact support.' },
        { status: 503 },
      )
    }

    // Use a distinct prefix so the bank-transfer leg is easy to
    // identify in the transactions table when debugging.
    const reference = generateReference('WBT') // Wallet Bank Transfer

    // Create the pending ledger entry before reserving a transfer account.
    // A customer must never receive bank details that can accept money when
    // we have no corresponding transaction to reconcile and credit.
    const pendingTransaction = await createPendingTransaction(
      user.id,
      amount,
      'credit',
      'bank_transfer',
      'Wallet funding via Bank Transfer',
      reference,
      reference,
      { type: 'wallet_funding', channel: 'bank_transfer' },
    )

    if (!pendingTransaction) {
      return NextResponse.json(
        { error: 'Unable to prepare your bank transfer. Please try again.' },
        { status: 503 },
      )
    }

    // Reserve the virtual account after the durable pending entry exists.
    const charge = await initializeBankTransfer({
      email: user.email,
      amount: toKobo(amount),
      reference,
      metadata: {
        user_id: user.id,
        type: 'wallet_funding',
        channel: 'bank_transfer',
        custom_fields: [
          {
            display_name: 'Customer Name',
            variable_name: 'customer_name',
            value: `${user.first_name} ${user.last_name}`,
          },
          {
            display_name: 'Payment Type',
            variable_name: 'payment_type',
            value: 'Wallet Funding (Bank Transfer)',
          },
        ],
      },
    })

    if (!charge) {
      await updateTransactionStatus(
        pendingTransaction.id,
        'failed',
        'Paystack could not reserve a transfer account',
      )
      return NextResponse.json(
        { error: 'Could not reserve a transfer account. Please try the card option.' },
        { status: 502 },
      )
    }

    // Reuse the abandoned-payment recovery rail so a customer who
    // initiates a transfer but doesn't complete it gets the same
    // gentle reminder email as our card-abandoners.
    await createAbandonedPayment(
      user.id,
      'wallet_funding',
      amount,
      { amount, channel: 'bank_transfer' },
      `${getBaseUrl(request)}/dashboard/wallet/bank-transfer/${reference}`,
    )

    return NextResponse.json({
      success: true,
      reference,
      bank: {
        name: charge.bankName,
        accountName: charge.accountName,
        accountNumber: charge.accountNumber,
      },
      amount,
      expiresAt: charge.expiresAt,
    })
  } catch (error) {
    console.error('Fund wallet (bank transfer) error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize bank transfer' },
      { status: 500 },
    )
  }
}
