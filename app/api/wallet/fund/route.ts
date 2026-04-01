import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { initializePayment, generateReference, toKobo } from '@/lib/paystack'
import { createPendingTransaction, createAbandonedPayment } from '@/lib/wallet'

// POST /api/wallet/fund - Initialize wallet funding via Paystack
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { amount } = await request.json()
    
    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Minimum funding amount is N100' },
        { status: 400 }
      )
    }
    
    const reference = generateReference('WF') // Wallet Funding
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/verify?reference=${reference}`
    
    // Initialize Paystack payment
    const paymentResponse = await initializePayment({
      email: user.email,
      amount: toKobo(amount),
      reference,
      callbackUrl,
      metadata: {
        user_id: user.id,
        type: 'wallet_funding',
        custom_fields: [
          {
            display_name: 'Customer Name',
            variable_name: 'customer_name',
            value: `${user.first_name} ${user.last_name}`,
          },
          {
            display_name: 'Payment Type',
            variable_name: 'payment_type',
            value: 'Wallet Funding',
          },
        ],
      },
    })
    
    if (!paymentResponse || !paymentResponse.status) {
      return NextResponse.json(
        { error: 'Failed to initialize payment' },
        { status: 500 }
      )
    }
    
    // Create pending transaction
    await createPendingTransaction(
      user.id,
      amount,
      'credit',
      'paystack',
      'Wallet funding via Paystack',
      reference,
      paymentResponse.data.reference,
      { type: 'wallet_funding' }
    )
    
    // Create abandoned payment record for recovery
    await createAbandonedPayment(
      user.id,
      'wallet_funding',
      amount,
      { amount },
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?fund=${amount}`
    )
    
    return NextResponse.json({
      success: true,
      authorization_url: paymentResponse.data.authorization_url,
      reference: paymentResponse.data.reference,
    })
  } catch (error) {
    console.error('Fund wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize wallet funding' },
      { status: 500 }
    )
  }
}
