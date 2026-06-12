import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getTransactionByReference,
  updateTransactionStatus,
} from '@/lib/wallet'
import { finalizeWalletFunding } from '@/lib/wallet-funding'
import { verifyPayment, fromKobo } from '@/lib/paystack'

export const dynamic = 'force-dynamic'

// POST /api/wallet/transactions/[reference]/cancel
//
// Lets the signed-in user explicitly cancel one of their own PENDING
// Paystack fundings — the "I closed the checkout, stop showing this as
// pending" action.
//
// Why this exists: when a customer cancels/closes the Paystack
// checkout, Paystack often keeps reporting the charge as
// `pending`/`ongoing` for a while before flipping to `abandoned`. Our
// reconcile sweep can only mirror what Paystack says, so the row sits
// at "pending" even though the customer KNOWS they cancelled. This
// endpoint resolves it immediately.
//
// Safety: we NEVER cancel blindly. We re-verify with Paystack first —
// if the charge actually succeeded we credit the wallet (idempotently,
// via finalizeWalletFunding) instead of cancelling, so a customer can
// never cancel away money they actually paid.
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
      // Already in a final state — return it so the UI can refresh.
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
      // The money actually arrived — credit instead of cancelling.
      const amount = fromKobo(data.amount)
      await finalizeWalletFunding({
        userId: tx.user_id,
        amount,
        paymentReference:
          tx.payment_reference ||
          (tx as { reference?: string }).reference ||
          data.reference,
        paystackReference: data.reference,
        customerEmail: data.customer?.email,
        channelLabel:
          (tx.metadata as { channel?: string } | null)?.channel ===
          'bank_transfer'
            ? 'Bank Transfer'
            : 'Paystack',
      })
      return NextResponse.json({
        success: true,
        status: 'completed',
        credited: true,
      })
    }

    // Not a success on Paystack's side (pending / ongoing / abandoned /
    // failed / unknown reference) — safe to honour the user's cancel.
    await updateTransactionStatus(
      tx.id,
      'cancelled',
      'Payment cancelled by customer before completion',
    )

    return NextResponse.json({ success: true, status: 'cancelled' })
  } catch (error) {
    console.error('[wallet/transactions/cancel] error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel transaction' },
      { status: 500 },
    )
  }
}
