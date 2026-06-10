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
} from '@/lib/wallet'
import { getBaseUrl } from '@/lib/app-url'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()

    if (!amount || typeof amount !== 'number' || amount < 100) {
      return NextResponse.json(
        { error: 'Minimum funding amount is N100' },
        { status: 400 },
      )
    }
    if (amount > 10_000_000) {
      return NextResponse.json(
        { error: 'Maximum funding amount is N10,000,000' },
        { status: 400 },
      )
    }

    // Use a distinct prefix so the bank-transfer leg is easy to
    // identify in the transactions table when debugging.
    const reference = generateReference('WBT') // Wallet Bank Transfer

    // Reserve the virtual account FIRST. If Paystack rejects the
    // charge we don't want to leave an orphan pending transaction
    // sitting in the user's history.
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
      return NextResponse.json(
        { error: 'Could not reserve a transfer account. Please try the card option.' },
        { status: 502 },
      )
    }

    // Now create the pending transaction. `payment_method` is
    // 'bank_transfer' so the wallet UI and admin views can show
    // the right channel label, but every downstream credit path
    // keeps working because we record the same `reference` and
    // `paystack_reference` shape as the card flow.
    await createPendingTransaction(
      user.id,
      amount,
      'credit',
      'bank_transfer',
      'Wallet funding via Bank Transfer',
      reference,
      charge.reference,
      { type: 'wallet_funding', channel: 'bank_transfer' },
    )

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
