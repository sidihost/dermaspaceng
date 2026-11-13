import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, fromKobo } from '@/lib/paystack'
import { 
  getTransactionByReference, 
  updateTransactionStatus,
} from '@/lib/wallet'
import { finalizeWalletFunding } from '@/lib/wallet-funding'
import { finalizeGiftCardPaystackPayment } from '@/lib/gift-cards'
import { finalizeMembershipPaystackPayment } from '@/lib/membership-activation'
import { finalizePendingTransactionFailureOrCancel } from '@/lib/transaction-failure-notice'
import { confirmBookingPayment, markBookingPaymentFailed, getBookingByReference } from '@/lib/booking'
import { notifyBookingPaymentFailed, notifyUser } from '@/lib/notifications'

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
        console.info('[paystack-webhook] ignored event:', event.event)
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
    
    const metadata = transaction.metadata as { type?: string; channel?: string } | null
    const txType = metadata?.type || data.metadata?.type
    const channelLabel = metadata?.channel === 'bank_transfer' ? 'Bank Transfer' : 'Paystack'

    if (txType === 'wallet_funding' || (!txType && transaction.type === 'credit')) {
      const result = await finalizeWalletFunding({
        userId,
        amount,
        paymentReference: transaction.payment_reference || data.reference,
        paystackReference: data.reference,
        customerEmail: data.customer?.email,
        channelLabel,
      })
      if (result.alreadyProcessed) {
        console.log('[paystack-webhook] already processed', data.reference)
      }
    } else if (txType === 'gift_card') {
      const gcResult = await finalizeGiftCardPaystackPayment({
        transaction,
        paystackReference: data.reference,
        amount,
        customerEmail: data.customer?.email,
        channelLabel,
      })
      if (gcResult.alreadyProcessed) {
        console.log('[paystack-webhook] gift card already processed', data.reference)
      }
    } else if (txType === 'membership_subscription') {
      const msResult = await finalizeMembershipPaystackPayment({
        transaction,
        paystackReference: data.reference,
        amountPaid: amount,
        customerEmail: data.customer?.email,
      })
      if (msResult.alreadyProcessed) {
        console.log('[paystack-webhook] membership already processed', data.reference)
      }
    } else {
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
    
    const { transitioned } = await finalizePendingTransactionFailureOrCancel({
      transaction,
      nextStatus: 'failed',
      reason: data.gateway_response || 'Payment failed',
      customerEmail: data.customer?.email,
    })

    if (!transitioned) {
      return
    }

    // In-app bell entry for the failed payment. Previously only an
    // email went out, so the failure was invisible inside the app —
    // the customer would just see a stuck "pending" row with no
    // explanation. The deep-link opens the transaction's detail page
    // (which surfaces the failure reason + a "fund again" action).
    try {
      const ref = transaction.payment_reference || data.reference
      await notifyUser({
        userId: String(transaction.user_id),
        title: 'Payment failed',
        message: `Your payment of \u20A6${Number(transaction.amount).toLocaleString('en-NG')} couldn't be completed${
          data.gateway_response ? ` (${data.gateway_response})` : ''
        }. Tap to try again.`,
        type: 'status_update',
        referenceType: 'transaction',
        referenceId: ref,
        actionUrl: `/dashboard/transactions/${ref}`,
        priority: 'high',
      })
    } catch (err) {
      console.error('[paystack-webhook] notify wallet failure', err)
    }
  } catch (error) {
    console.error('Handle charge failed error:', error)
  }
}
