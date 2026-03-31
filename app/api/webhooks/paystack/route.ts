import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, fromKobo } from '@/lib/paystack'
import { 
  getTransactionByReference, 
  updateTransactionStatus, 
  creditWallet,
  createInvoice,
  deleteAbandonedPayment
} from '@/lib/wallet'
import { query } from '@/lib/db'
import { getUserById } from '@/lib/auth'
import { sendWalletFundingConfirmation, sendPaymentFailedEmail } from '@/lib/wallet-emails'

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
  metadata?: { user_id?: number; type?: string }
}) {
  try {
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
    const metadata = transaction.metadata as { type?: string } | null
    if (metadata?.type === 'wallet_funding') {
      const creditResult = await creditWallet(
        userId,
        amount,
        'Wallet funding via Paystack',
        transaction.payment_reference || undefined,
        data.reference
      )
      
      if (creditResult.success && creditResult.transaction) {
        await updateTransactionStatus(transaction.id, 'completed')
        
        // Get user and send confirmation
        const user = await getUserById(userId)
        if (user) {
          await sendWalletFundingConfirmation({
            email: user.email,
            firstName: user.first_name,
            amount,
            newBalance: creditResult.transaction.amount,
            reference: data.reference,
          })
        }
        
        // Create invoice
        await createInvoice(
          userId,
          creditResult.transaction.id,
          amount,
          [{ description: 'Wallet Funding', amount, quantity: 1 }],
          {
            email: data.customer.email,
            payment_method: 'Paystack',
            payment_reference: data.reference,
          }
        )
        
        // Delete abandoned payment record
        const abandonedResult = await query<{ id: number }>(
          `SELECT id FROM abandoned_payments 
           WHERE user_id = $1 AND payment_type = 'wallet_funding' 
           ORDER BY created_at DESC LIMIT 1`,
          [userId]
        )
        if (abandonedResult.rows[0]) {
          await deleteAbandonedPayment(abandonedResult.rows[0].id)
        }
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
}) {
  try {
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
    const user = await getUserById(transaction.user_id)
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
