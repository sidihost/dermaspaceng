import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { 
  getWalletBalance, 
  debitWallet, 
  createInvoice,
  getOrCreateWalletSettings,
  formatCurrency
} from '@/lib/wallet'
import { sendPaymentConfirmation, sendInvoiceEmail, sendBudgetAlert } from '@/lib/wallet-emails'

// POST /api/wallet/pay - Pay for service/booking/gift card using wallet
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { amount, description, itemType, itemDetails } = await request.json()
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    
    // Check wallet balance
    const balance = await getWalletBalance(user.id)
    if (balance < amount) {
      return NextResponse.json(
        { 
          error: 'Insufficient wallet balance',
          balance,
          required: amount,
          shortfall: amount - balance,
        },
        { status: 400 }
      )
    }
    
    // Check budget settings
    const settings = await getOrCreateWalletSettings(user.id)
    if (settings.monthly_budget) {
      // This would need to calculate monthly spending - simplified for now
      const monthlySpending = 0 // Would query transactions for current month
      const newTotal = monthlySpending + amount
      
      if (newTotal > settings.monthly_budget) {
        return NextResponse.json(
          { 
            error: 'This payment would exceed your monthly budget',
            budget: settings.monthly_budget,
            currentSpending: monthlySpending,
            paymentAmount: amount,
          },
          { status: 400 }
        )
      }
      
      // Check if approaching budget threshold
      const threshold = settings.monthly_budget * (settings.budget_alert_threshold / 100)
      if (newTotal >= threshold && settings.email_notifications) {
        // Send budget alert
        await sendBudgetAlert({
          email: user.email,
          firstName: user.first_name,
          budget: settings.monthly_budget,
          spent: newTotal,
          percentage: Math.round((newTotal / settings.monthly_budget) * 100),
        })
      }
    }
    
    // Debit wallet
    const result = await debitWallet(
      user.id,
      amount,
      description || `Payment for ${itemType || 'service'}`,
      `PAY_${Date.now()}`
    )
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Payment failed' },
        { status: 400 }
      )
    }
    
    // Create invoice
    const invoice = await createInvoice(
      user.id,
      result.transaction!.id,
      amount,
      itemDetails?.items || [{ description: description || itemType, amount, quantity: 1 }],
      {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        payment_method: 'Wallet',
        item_type: itemType,
      }
    )
    
    // Send confirmation email
    await sendPaymentConfirmation({
      email: user.email,
      firstName: user.first_name,
      amount,
      description: description || `Payment for ${itemType || 'service'}`,
      newBalance: balance - amount,
      reference: result.transaction!.payment_reference || '',
    })
    
    // Send invoice email
    if (invoice) {
      await sendInvoiceEmail({
        email: user.email,
        firstName: user.first_name,
        invoiceNumber: invoice.invoice_number,
        amount,
        items: itemDetails?.items || [{ description: description || itemType, amount, quantity: 1 }],
        paymentMethod: 'Wallet',
        paymentReference: result.transaction!.payment_reference || '',
      })
    }
    
    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      invoice: invoice ? { number: invoice.invoice_number, id: invoice.id } : null,
      newBalance: balance - amount,
      formattedBalance: formatCurrency(balance - amount),
    })
  } catch (error) {
    console.error('Wallet pay error:', error)
    return NextResponse.json(
      { error: 'Payment failed' },
      { status: 500 }
    )
  }
}
