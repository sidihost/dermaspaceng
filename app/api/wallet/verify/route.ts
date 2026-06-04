import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment, fromKobo } from '@/lib/paystack'
import { 
  getTransactionByReference, 
  updateTransactionStatus,
} from '@/lib/wallet'
import { finalizeWalletFunding } from '@/lib/wallet-funding'

// GET /api/wallet/verify - Verify payment and credit wallet
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get('reference')
  const trxref = searchParams.get('trxref')
  
  const paymentReference = reference || trxref
  
  if (!paymentReference) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=missing_reference`
    )
  }
  
  try {
    // Verify with Paystack
    const verification = await verifyPayment(paymentReference)
    
    if (!verification || !verification.status) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=verification_failed`
      )
    }
    
    const { data } = verification
    
    // Find the pending transaction
    const transaction = await getTransactionByReference(paymentReference)
    
    if (!transaction) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=transaction_not_found`
      )
    }
    
    // Check if already processed
    if (transaction.status === 'completed') {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?success=true&already_processed=true`
      )
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
      const result = await finalizeWalletFunding({
        userId: transaction.user_id,
        amount,
        paymentReference,
        paystackReference: data.reference,
        customerEmail: data.customer.email,
        channelLabel,
      })

      if (result.credited || result.alreadyProcessed) {
        const qs = result.alreadyProcessed
          ? 'success=true&already_processed=true'
          : `success=true&amount=${amount}`
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?${qs}`,
        )
      }

      // Crediting genuinely failed (DB error) — surface it instead of
      // silently redirecting to a misleading success screen.
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=credit_failed`,
      )
    } else if (data.status === 'failed') {
      await updateTransactionStatus(
        transaction.id,
        'failed',
        data.gateway_response || 'Payment failed'
      )
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=payment_failed&message=${encodeURIComponent(data.gateway_response || 'Payment failed')}`
      )
    } else if (data.status === 'abandoned') {
      await updateTransactionStatus(transaction.id, 'cancelled', 'Payment abandoned by user')
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=payment_abandoned`
      )
    }
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=unknown_status`
    )
  } catch (error) {
    console.error('Verify payment error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?error=verification_error`
    )
  }
}
