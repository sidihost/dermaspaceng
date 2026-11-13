import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransactionByReference } from '@/lib/wallet'
import { finalizeWalletFunding } from '@/lib/wallet-funding'
import { finalizeGiftCardPaystackPayment } from '@/lib/gift-cards'
import { finalizeMembershipPaystackPayment } from '@/lib/membership-activation'
import { finalizePendingTransactionFailureOrCancel } from '@/lib/transaction-failure-notice'
import { verifyPayment, fromKobo } from '@/lib/paystack'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reference } = await params
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const tx = await getTransactionByReference(reference)
    if (!tx || String(tx.user_id) !== String(user.id)) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 },
      )
    }

    if (tx.status !== 'pending') {
      return NextResponse.json({
        success: true,
        status: tx.status,
        alreadyFinal: true,
      })
    }

    // Ask Paystack what really happened before we touch anything.
    const ref =
      tx.paystack_reference ||
      tx.payment_reference ||
      (tx as { reference?: string }).reference ||
      reference
    const verification = await verifyPayment(ref)
    const data = verification?.data

    if (data?.status === 'success') {
      const amount = fromKobo(data.amount)
      const txType = (tx.metadata as { type?: string } | null)?.type
      const channelLabel =
        (tx.metadata as { channel?: string } | null)?.channel === 'bank_transfer'
          ? 'Bank Transfer'
          : 'Paystack'

      if (txType === 'membership_subscription') {
        await finalizeMembershipPaystackPayment({
          transaction: tx,
          paystackReference: data.reference,
          amountPaid: amount,
          customerEmail: data.customer?.email || user.email,
        })
      } else if (txType === 'gift_card') {
        await finalizeGiftCardPaystackPayment({
          transaction: tx,
          paystackReference: data.reference,
          amount,
          customerEmail: data.customer?.email,
          channelLabel,
        })
      } else {
        await finalizeWalletFunding({
          userId: tx.user_id,
          amount,
          paymentReference:
            tx.payment_reference ||
            (tx as { reference?: string }).reference ||
            data.reference,
          paystackReference: data.reference,
          customerEmail: data.customer?.email,
          channelLabel,
        })
      }
      return NextResponse.json({
        success: true,
        status: 'completed',
        credited: true,
      })
    }

    // Not a success on Paystack's side (pending / ongoing / abandoned /
    // failed / unknown reference) — safe to honour the user's cancel.
    await finalizePendingTransactionFailureOrCancel({
      transaction: tx,
      nextStatus: 'cancelled',
      reason: 'Payment cancelled by customer before completion',
      customerEmail: user.email,
    })

    return NextResponse.json({ success: true, status: 'cancelled' })
  } catch (error) {
    console.error('[wallet/transactions/cancel] error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel transaction' },
      { status: 500 },
    )
  }
}
