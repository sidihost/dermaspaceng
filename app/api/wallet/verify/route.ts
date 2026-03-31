import { NextRequest, NextResponse } from 'next/server'
import { verifyPayment, fromKobo } from '@/lib/paystack'
import { 
  getTransactionByReference, 
  updateTransactionStatus, 
  creditWallet,
  createInvoice,
  deleteAbandonedPayment
} from '@/lib/wallet'
import { query } from '@/lib/db'
import { getUserById } from '@/lib/auth'
import { sendWalletFundingConfirmation, sendInvoiceEmail } from '@/lib/wallet-emails'

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
      
      // Credit the wallet
      const creditResult = await creditWallet(
        transaction.user_id,
        amount,
        'Wallet funding via Paystack',
        paymentReference,
        data.reference
      )
      
      if (creditResult.success && creditResult.transaction) {
        // Update original transaction to completed
        await updateTransactionStatus(transaction.id, 'completed')
        
        // Get user details for invoice
        const user = await getUserById(transaction.user_id)
        
        // Create invoice
        const invoice = await createInvoice(
          transaction.user_id,
          creditResult.transaction.id,
          amount,
          [{ description: 'Wallet Funding', amount, quantity: 1 }],
          {
            name: user ? `${user.first_name} ${user.last_name}` : 'Customer',
            email: user?.email || data.customer.email,
            payment_method: 'Paystack',
            payment_reference: paymentReference,
          }
        )
        
        // Delete abandoned payment record
        const abandonedResult = await query<{ id: number }>(
          `SELECT id FROM abandoned_payments 
           WHERE user_id = $1 AND payment_type = 'wallet_funding' 
           ORDER BY created_at DESC LIMIT 1`,
          [transaction.user_id]
        )
        if (abandonedResult.rows[0]) {
          await deleteAbandonedPayment(abandonedResult.rows[0].id)
        }
        
        // Send confirmation email
        if (user) {
          await sendWalletFundingConfirmation({
            email: user.email,
            firstName: user.first_name,
            amount,
            newBalance: amount + (creditResult.transaction.amount || 0),
            reference: paymentReference,
          })
          
          // Send invoice email
          if (invoice) {
            await sendInvoiceEmail({
              email: user.email,
              firstName: user.first_name,
              invoiceNumber: invoice.invoice_number,
              amount,
              items: [{ description: 'Wallet Funding', amount, quantity: 1 }],
              paymentMethod: 'Paystack',
              paymentReference,
            })
          }
        }
        
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?success=true&amount=${amount}`
        )
      }
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
