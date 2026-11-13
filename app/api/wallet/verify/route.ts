import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment, fromKobo } from '@/lib/paystack'
import { getTransactionByReference } from '@/lib/wallet'
import { finalizeWalletFunding } from '@/lib/wallet-funding'
import { finalizeGiftCardPaystackPayment } from '@/lib/gift-cards'
import { finalizePendingTransactionFailureOrCancel } from '@/lib/transaction-failure-notice'
import { getBaseUrl } from '@/lib/app-url'

// GET /api/wallet/verify - Verify payment and credit wallet (or finalize gift card)
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get('reference')
  const trxref = searchParams.get('trxref')

  const paymentReference = reference || trxref

  const statusPage = (ref: string) =>
    NextResponse.redirect(
      `${baseUrl}/dashboard/wallet/payment-status?reference=${encodeURIComponent(ref)}`,
    )

  const outcomeRedirect = (
    ref: string,
    txType?: string,
    outcome?: 'success' | 'failed' | 'cancelled',
  ) => {
    if (txType === 'gift_card' && outcome) {
      return NextResponse.redirect(
        `${baseUrl}/gift-cards?payment=${outcome}&reference=${encodeURIComponent(ref)}`,
      )
    }
    return statusPage(ref)
  }

  if (!paymentReference) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/wallet?error=missing_reference`
    )
  }

  try {
    // Verify with Paystack
    const verification = await verifyPayment(paymentReference)

    if (!verification || !verification.status) {
      return statusPage(paymentReference)
    }

    const { data } = verification

    // Find the pending transaction
    const transaction = await getTransactionByReference(paymentReference)

    if (!transaction) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/wallet?error=transaction_not_found`
      )
    }

    const txType = (transaction.metadata as { type?: string } | null)?.type

    // Check if already processed
    if (transaction.status === 'completed') {
      return outcomeRedirect(paymentReference, txType, 'success')
    }

    if (data.status === 'success') {
      const amount = fromKobo(data.amount)
      const channelLabel =
        (transaction.metadata as { channel?: string } | null)?.channel ===
        'bank_transfer'
          ? 'Bank Transfer'
          : 'Paystack'

      if (txType === 'gift_card') {
        await finalizeGiftCardPaystackPayment({
          transaction,
          paystackReference: data.reference,
          amount,
          customerEmail: data.customer?.email,
          channelLabel,
        })
      } else {
        await finalizeWalletFunding({
          userId: transaction.user_id,
          amount,
          paymentReference,
          paystackReference: data.reference,
          customerEmail: data.customer?.email,
          channelLabel,
        })
      }

      return outcomeRedirect(paymentReference, txType, 'success')
    } else if (data.status === 'failed') {
      await finalizePendingTransactionFailureOrCancel({
        transaction,
        nextStatus: 'failed',
        reason: data.gateway_response || 'Payment failed',
        customerEmail: data.customer?.email,
      })

      return outcomeRedirect(paymentReference, txType, 'failed')
    } else if (
      data.status === 'abandoned' ||
      (((data.status as string) === 'ongoing' ||
        (data.status as string) === 'pending') &&
        (transaction.metadata as { channel?: string } | null)?.channel !==
          'bank_transfer')
    ) {
      await finalizePendingTransactionFailureOrCancel({
        transaction,
        nextStatus: 'cancelled',
        reason: 'Payment cancelled before completion',
        customerEmail: data.customer?.email,
      })

      return outcomeRedirect(paymentReference, txType, 'cancelled')
    }

    // Genuinely still pending on Paystack's side (e.g. an in-flight bank transfer)
    return outcomeRedirect(paymentReference)
  } catch (error) {
    console.error('Verify payment error:', error)
    return NextResponse.redirect(
      `${baseUrl}/dashboard/wallet?error=verification_error`
    )
  }
}
