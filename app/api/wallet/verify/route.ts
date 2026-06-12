import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment, fromKobo } from '@/lib/paystack'
import { 
  getTransactionByReference, 
  updateTransactionStatus,
} from '@/lib/wallet'
import { finalizeWalletFunding } from '@/lib/wallet-funding'
import { getBaseUrl } from '@/lib/app-url'

// GET /api/wallet/verify - Verify payment and credit wallet
//
// This is the browser-redirect leg of the Paystack flow (the customer
// lands here after the hosted checkout, whether they paid, failed or
// hit "Cancel"). Every outcome that has a reference now lands on the
// dedicated /dashboard/wallet/payment-status page, which reads the
// transaction's final state from OUR database — a single source of
// truth shared with the webhook and the reconciliation sweep.
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
  
  if (!paymentReference) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/wallet?error=missing_reference`
    )
  }
  
  try {
    // Verify with Paystack
    const verification = await verifyPayment(paymentReference)
    
    if (!verification || !verification.status) {
      // Paystack couldn't confirm anything right now. Don't dead-end
      // the customer on an error query param — the status page reads
      // OUR ledger, actively re-polls reconciliation, and offers a
      // manual "I cancelled this" action.
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
    
    // Check if already processed
    if (transaction.status === 'completed') {
      return statusPage(paymentReference)
    }
    
    if (data.status === 'success') {
      const amount = fromKobo(data.amount)
      const channelLabel =
        (transaction.metadata as { channel?: string } | null)?.channel ===
        'bank_transfer'
          ? 'Bank Transfer'
          : 'Paystack'

      // All crediting + email + invoice + abandoned cleanup is handled
      // by the shared idempotent helper, so this redirect path stays
      // perfectly consistent with the webhook and the bank-transfer
      // poll. Calling it twice (e.g. webhook landed first) is a safe
      // no-op that returns `alreadyProcessed`.
      await finalizeWalletFunding({
        userId: transaction.user_id,
        amount,
        paymentReference,
        paystackReference: data.reference,
        customerEmail: data.customer.email,
        channelLabel,
      })

      return statusPage(paymentReference)
    } else if (data.status === 'failed') {
      await updateTransactionStatus(
        transaction.id,
        'failed',
        data.gateway_response || 'Payment failed'
      )
      
      return statusPage(paymentReference)
    } else if (
      data.status === 'abandoned' ||
      // Paystack only redirects the browser back here on success or an
      // explicit cancel. If the customer is back in OUR app and the
      // charge is a card checkout still reporting "ongoing"/"pending",
      // they cancelled before Paystack registered the abandonment —
      // mirror their intent instead of stranding the row at pending.
      // (Bank transfers are excluded: those are genuinely pending while
      // the customer completes the transfer in their banking app.)
      (((data.status as string) === 'ongoing' ||
        (data.status as string) === 'pending') &&
        (transaction.metadata as { channel?: string } | null)?.channel !==
          'bank_transfer')
    ) {
      // The customer cancelled / closed the Paystack checkout without
      // paying. Record it so their history tells the full story, then
      // show the dedicated "payment cancelled" screen.
      await updateTransactionStatus(transaction.id, 'cancelled', 'Payment cancelled before completion')
      
      return statusPage(paymentReference)
    }
    
    // Genuinely still pending on Paystack's side (e.g. an in-flight
    // bank transfer). The status page knows how to poll for it.
    return statusPage(paymentReference)
  } catch (error) {
    console.error('Verify payment error:', error)
    return NextResponse.redirect(
      `${baseUrl}/dashboard/wallet?error=verification_error`
    )
  }
}
