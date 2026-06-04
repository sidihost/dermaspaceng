import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, fromKobo } from '@/lib/paystack'
import { 
  getTransactionByReference, 
  updateTransactionStatus,
} from '@/lib/wallet'
import { finalizeWalletFunding } from '@/lib/wallet-funding'
import { getUserById } from '@/lib/auth'
import { sendPaymentFailedEmail } from '@/lib/wallet-emails'
import { confirmBookingPayment, markBookingPaymentFailed, getBookingByReference } from '@/lib/booking'
import { notifyBookingPaymentFailed } from '@/lib/notifications'

// POST /api/webhooks/paystack - Handle Paystack webhooks
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-paystack-signature') || ''
    
    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('Invalid Paystack webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const event = JSON.parse(payload)
    
    console.log('Paystack webhook event:', event.event)
    
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data)
        break
        
      case 'charge.failed':
        await handleChargeFailed(event.data)
        break
        
      case 'transfer.success':
        // Handle transfer success if needed
        break
        
      case 'transfer.failed':
        // Handle transfer failure if needed
        break
        
      default:
        console.log('Unhandled webhook event:', event.event)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleChargeSuccess(data: {
  reference: string
  amount: number
  customer: { email: string }
  metadata?: { user_id?: number; type?: string; booking_id?: string; booking_reference?: string }
}) {
  try {
    // Bookings live in their own table with their own state machine —
    // when Paystack tells us a booking charge succeeded, the only
    // thing we need to do is flip the booking row to confirmed.
    // `confirmBookingPayment` is idempotent so retrying webhook
    // deliveries (Paystack does this aggressively) is safe.
    if (data.metadata?.type === 'booking') {
      const result = await confirmBookingPayment({
        paymentReference: data.reference,
        paymentMethod: 'paystack',
      })
      if (!result.bookingId) {
        console.error('[paystack-webhook] booking not found for reference', data.reference)
      } else if (result.confirmed) {
        console.log('[paystack-webhook] confirmed booking', result.bookingId)
      }
      return
    }

    const transaction = await getTransactionByReference(data.reference)
    
    if (!transaction) {
      console.error('Transaction not found for reference:', data.reference)
      return
    }
    
    // Skip if already processed
    if (transaction.status === 'completed') {
      console.log('Transaction already processed:', data.reference)
      return
    }
    
    const amount = fromKobo(data.amount)
    const userId = transaction.user_id
    
    // Credit wallet if this is a wallet funding transaction
    const metadata = transaction.metadata as { type?: string; channel?: string } | null
    if (metadata?.type === 'wallet_funding') {
      // All crediting + emails + invoice + abandoned cleanup live in
      // one idempotent helper shared with the /verify redirect and the
      // bank-transfer poll. Paystack retries webhooks aggressively, so
      // if the reference was already finalised this returns a clean
      // no-op (no double credit, no duplicate email/invoice).
      const result = await finalizeWalletFunding({
        userId,
        amount,
        paymentReference: transaction.payment_reference || data.reference,
        paystackReference: data.reference,
        customerEmail: data.customer.email,
        channelLabel:
          metadata.channel === 'bank_transfer' ? 'Bank Transfer' : 'Paystack',
      })
      if (result.alreadyProcessed) {
        console.log('[paystack-webhook] already processed', data.reference)
      }
    } else {
      // For other payment types, just mark as completed
      await updateTransactionStatus(transaction.id, 'completed')
    }
  } catch (error) {
    console.error('Handle charge success error:', error)
  }
}

async function handleChargeFailed(data: {
  reference: string
  gateway_response: string
  customer: { email: string }
  metadata?: { type?: string; booking_id?: string; booking_reference?: string }
}) {
  try {
    // Booking failures live in the bookings table, not the wallet
    // transactions table. We still record them — admins want to see
    // why a customer didn't make it through, and the customer
    // themselves should get a "your card was declined, try again"
    // email so they don't think the booking silently disappeared.
    if (data.metadata?.type === 'booking') {
      const reason = data.gateway_response || 'Payment failed at gateway'
      const result = await markBookingPaymentFailed({
        paymentReference: data.reference,
        reason,
        source: 'webhook',
      })
      if (result.bookingId) {
        try {
          const booking = data.metadata?.booking_reference
            ? await getBookingByReference(data.metadata.booking_reference)
            : null
          if (booking) {
            await notifyBookingPaymentFailed(booking, reason)
          }
        } catch (err) {
          console.error('[paystack-webhook] notify booking failure', err)
        }
      } else {
        console.error('[paystack-webhook] booking not found for failed charge', data.reference)
      }
      return
    }

    const transaction = await getTransactionByReference(data.reference)
    
    if (!transaction) {
      console.error('Transaction not found for reference:', data.reference)
      return
    }
    
    await updateTransactionStatus(
      transaction.id,
      'failed',
      data.gateway_response || 'Payment failed'
    )
    
    // Send failure notification
    const user = await getUserById(String(transaction.user_id))
    if (user) {
      await sendPaymentFailedEmail({
        email: user.email,
        firstName: user.first_name,
        amount: transaction.amount,
        reason: data.gateway_response || 'Payment could not be processed',
        reference: data.reference,
      })
    }
  } catch (error) {
    console.error('Handle charge failed error:', error)
  }
}
