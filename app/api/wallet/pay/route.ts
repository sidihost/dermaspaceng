import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { 
  getWalletBalance, 
  debitWallet, 
  createInvoice,
  getOrCreateWalletSettings,
  getUserMonthlySpending,
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
    
    const { amount, description, itemType, paymentType, itemDetails } = await request.json()
    const resolvedType = itemType || paymentType || 'service'
    const numericAmount = Number(amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    
    // Check wallet balance
    const balance = Number(await getWalletBalance(user.id)) || 0
    if (balance < numericAmount) {
      return NextResponse.json(
        { 
          error: 'Insufficient wallet balance',
          balance,
          required: numericAmount,
          shortfall: numericAmount - balance,
        },
        { status: 400 }
      )
    }
    
    // Check budget settings
    const settings = await getOrCreateWalletSettings(user.id)
    if (settings.monthly_budget) {
      const monthlySpending = await getUserMonthlySpending(user.id)
      const newTotal = monthlySpending + numericAmount
      
      if (newTotal > settings.monthly_budget) {
        return NextResponse.json(
          { 
            error: 'This payment would exceed your monthly budget',
            budget: settings.monthly_budget,
            currentSpending: monthlySpending,
            paymentAmount: numericAmount,
          },
          { status: 400 }
        )
      }
      
      const threshold = settings.monthly_budget * (settings.budget_alert_threshold / 100)
      if (newTotal >= threshold && settings.email_notifications) {
        try {
          await sendBudgetAlert({
            email: user.email,
            firstName: user.first_name,
            budget: settings.monthly_budget,
            spent: newTotal,
            percentage: Math.round((newTotal / settings.monthly_budget) * 100),
          })
        } catch (err) {
          console.error('[wallet/pay] budget alert email failed:', err)
        }
      }
    }
    
    // Debit wallet atomically with full metadata
    const result = await debitWallet(
      user.id,
      numericAmount,
      description || `Payment for ${resolvedType}`,
      `PAY_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      {
        type: resolvedType,
        ...(itemDetails ? { itemDetails } : {}),
      }
    )
    
    if (!result.success || !result.transaction) {
      return NextResponse.json(
        { error: result.error || 'Payment failed' },
        { status: 400 }
      )
    }
    
    const newBalance = Math.max(0, balance - numericAmount)
    const invoiceItems =
      Array.isArray(itemDetails?.items) && itemDetails.items.length > 0
        ? itemDetails.items
        : [{ description: description || resolvedType, amount: numericAmount, quantity: 1 }]

    // Create invoice (best effort — never fail after money was debited)
    let invoice = null
    try {
      invoice = await createInvoice(
        user.id,
        result.transaction.id,
        numericAmount,
        invoiceItems,
        {
          name: `${user.first_name} ${user.last_name}`.trim(),
          email: user.email,
          payment_method: 'Wallet',
          payment_reference: result.transaction.payment_reference || '',
          item_type: resolvedType,
        }
      )
    } catch (err) {
      console.error('[wallet/pay] invoice creation failed:', err)
    }
    
    // Send confirmation & invoice emails (best effort)
    try {
      await sendPaymentConfirmation({
        email: user.email,
        firstName: user.first_name,
        amount: numericAmount,
        description: description || `Payment for ${resolvedType}`,
        newBalance,
        reference: result.transaction.payment_reference || '',
      })
      
      if (invoice) {
        await sendInvoiceEmail({
          email: user.email,
          firstName: user.first_name,
          invoiceNumber: invoice.invoice_number,
          amount: numericAmount,
          items: invoiceItems,
          paymentMethod: 'Wallet',
          paymentReference: result.transaction.payment_reference || '',
        })
      }
    } catch (err) {
      console.error('[wallet/pay] email failed:', err)
    }
    
    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      invoice: invoice ? { number: invoice.invoice_number, id: invoice.id } : null,
      newBalance,
      formattedBalance: formatCurrency(newBalance),
    })
  } catch (error) {
    console.error('Wallet pay error:', error)
    return NextResponse.json(
      { error: 'Payment failed' },
      { status: 500 }
    )
  }
}
