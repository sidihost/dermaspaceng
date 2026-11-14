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

    const channel = (transaction.metadata as { channel?: string } | null)?.channel
    const { classifyPaystackStatusForReconcile } = await import(
      '@/lib/payment-reconcile-policy'
    )
    const decision = classifyPaystackStatusForReconcile({
      paystackStatus: data.status,
      gatewayResponse: data.gateway_response,
      channel,
      isDirectCallback: true,
    })

    if (decision.action === 'fail') {
      await finalizePendingTransactionFailureOrCancel({
        transaction,
        nextStatus: 'failed',
        reason: decision.reason,
        customerEmail: data.customer?.email,
      })
      return NextResponse.redirect(
        `${appUrl}/membership?error=payment_failed&message=${encodeURIComponent(
          decision.reason,
        )}`,
      )
    }
    if (decision.action === 'cancel') {
      await finalizePendingTransactionFailureOrCancel({
        transaction,
        nextStatus: 'cancelled',
        reason: decision.reason,
        customerEmail: data.customer?.email,
      })
      return NextResponse.redirect(`${appUrl}/membership?error=payment_abandoned`)
    }
    if (decision.action !== 'credit') {
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
