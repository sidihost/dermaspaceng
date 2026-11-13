import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment, fromKobo } from '@/lib/paystack'
import { getTransactionByReference } from '@/lib/wallet'
import { finalizeMembershipPaystackPayment } from '@/lib/membership-activation'
import { finalizePendingTransactionFailureOrCancel } from '@/lib/transaction-failure-notice'
import { getBaseUrl } from '@/lib/app-url'

/*
 * GET /api/membership/verify?reference=<paystack-ref>
 *
 * Paystack callback for the membership flow. Delegates activation
 * to finalizeMembershipPaystackPayment so callback, webhook, and
 * reconciliation share one atomic idempotent code path.
 */
export async function GET(request: NextRequest) {
  const appUrl = getBaseUrl(request)
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/membership?error=missing_reference`)
  }

  try {
    const verification = await verifyPayment(reference)
    if (!verification || !verification.status) {
      return NextResponse.redirect(`${appUrl}/membership?error=verification_failed`)
    }
    const { data } = verification

    const transaction = await getTransactionByReference(reference)
    if (!transaction) {
      return NextResponse.redirect(`${appUrl}/membership?error=transaction_not_found`)
    }

    if (transaction.status === 'completed') {
      return NextResponse.redirect(
        `${appUrl}/membership/receipt/${reference}?already_processed=true`,
      )
    }

    if (data.status === 'failed') {
      await finalizePendingTransactionFailureOrCancel({
        transaction,
        nextStatus: 'failed',
        reason: data.gateway_response || 'Payment failed',
        customerEmail: data.customer?.email,
      })
      return NextResponse.redirect(
        `${appUrl}/membership?error=payment_failed&message=${encodeURIComponent(
          data.gateway_response || 'Payment failed',
        )}`,
      )
    }
    if (data.status === 'abandoned') {
      await finalizePendingTransactionFailureOrCancel({
        transaction,
        nextStatus: 'cancelled',
        reason: 'Payment abandoned by user',
        customerEmail: data.customer?.email,
      })
      return NextResponse.redirect(`${appUrl}/membership?error=payment_abandoned`)
    }
    if (data.status !== 'success') {
      return NextResponse.redirect(`${appUrl}/membership?error=unknown_status`)
    }

    const result = await finalizeMembershipPaystackPayment({
      transaction,
      paystackReference: data.reference,
      amountPaid: fromKobo(data.amount),
      customerEmail: data.customer?.email,
    })

    if (result.alreadyProcessed) {
      return NextResponse.redirect(
        `${appUrl}/membership/receipt/${reference}?already_processed=true`,
      )
    }
    if (!result.activated) {
      return NextResponse.redirect(
        `${appUrl}/membership?error=${result.error || 'verification_error'}`,
      )
    }

    return NextResponse.redirect(`${appUrl}/membership/receipt/${reference}`)
  } catch (error) {
    console.error('membership verify error', error)
    return NextResponse.redirect(`${appUrl}/membership?error=verification_error`)
  }
}
