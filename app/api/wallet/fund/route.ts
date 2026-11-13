import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { initializePayment, generateReference, toKobo } from '@/lib/paystack'
import {
  createPendingTransaction,
  createAbandonedPayment,
  updateTransactionStatus,
} from '@/lib/wallet'
import { getBaseUrl } from '@/lib/app-url'

// POST /api/wallet/fund - Initialize wallet funding or gift card Paystack payment
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const numericAmount = Number(body.amount)
    const paymentType = body.paymentType as string | undefined
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const itemDetails = (body.itemDetails && typeof body.itemDetails === 'object'
      ? body.itemDetails
      : undefined) as Record<string, unknown> | undefined

    if (!Number.isFinite(numericAmount) || !Number.isInteger(numericAmount) || numericAmount < 100) {
      return NextResponse.json(
        { error: 'Enter a whole-naira amount of at least N100' },
        { status: 400 }
      )
    }

    if (numericAmount > 10_000_000) {
      return NextResponse.json(
        { error: 'Maximum funding amount is N10,000,000' },
        { status: 400 },
      )
    }

    const isGiftCard = paymentType === 'gift_card'
    if (isGiftCard) {
      const recipientName = String(itemDetails?.recipientName || '').trim()
      const recipientEmail = String(itemDetails?.recipientEmail || '').trim()
      if (!recipientName || !recipientEmail) {
        return NextResponse.json(
          { error: 'Recipient name and email are required for gift card payment' },
          { status: 400 },
        )
      }
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        {
          error:
            'Payments are not configured yet. Please contact support — the operator needs to add PAYSTACK_SECRET_KEY.',
        },
        { status: 503 },
      )
    }

    const reference = generateReference(isGiftCard ? 'GC' : 'WF')
    const baseUrl = getBaseUrl(request)
    const callbackUrl = `${baseUrl}/api/wallet/verify?reference=${reference}`

    const txType = isGiftCard ? 'debit' : 'credit'
    const txDescription = isGiftCard
      ? description || `Gift Card for ${String(itemDetails?.recipientName || 'Recipient')}`
      : 'Wallet funding via Paystack'
    const txMetadata = isGiftCard
      ? {
          type: 'gift_card',
          itemDetails: { ...(itemDetails || {}), amount: numericAmount },
        }
      : { type: 'wallet_funding' }

    const pendingTransaction = await createPendingTransaction(
      user.id,
      numericAmount,
      txType,
      'paystack',
      txDescription,
      reference,
      reference,
      txMetadata,
    )

    if (!pendingTransaction) {
      return NextResponse.json(
        { error: isGiftCard ? 'Unable to prepare your gift card payment. Please try again.' : 'Unable to prepare your wallet funding. Please try again.' },
        { status: 503 },
      )
    }

    const paymentResponse = await initializePayment({
      email: user.email,
      amount: toKobo(numericAmount),
      reference,
      callbackUrl,
      metadata: {
        user_id: user.id,
        type: isGiftCard ? 'gift_card' : 'wallet_funding',
        custom_fields: [
          {
            display_name: 'Customer Name',
            variable_name: 'customer_name',
            value: `${user.first_name} ${user.last_name}`,
          },
          {
            display_name: 'Payment Type',
            variable_name: 'payment_type',
            value: isGiftCard ? 'Gift Card Purchase' : 'Wallet Funding',
          },
        ],
      },
    })

    if (
      !paymentResponse?.status ||
      !paymentResponse.data?.authorization_url ||
      !paymentResponse.data?.reference
    ) {
      await updateTransactionStatus(
        pendingTransaction.id,
        'failed',
        'Paystack could not initialize this payment',
      )
      return NextResponse.json(
        { error: 'Failed to initialize payment' },
        { status: 502 }
      )
    }

    await createAbandonedPayment(
      user.id,
      isGiftCard ? 'gift_card' : 'wallet_funding',
      numericAmount,
      isGiftCard ? { ...(itemDetails || {}), amount: numericAmount } : { amount: numericAmount },
      isGiftCard ? `${baseUrl}/gift-cards` : `${baseUrl}/dashboard/wallet?fund=${numericAmount}`
    )

    return NextResponse.json({
      success: true,
      authorization_url: paymentResponse.data.authorization_url,
      reference: paymentResponse.data.reference,
    })
  } catch (error) {
    console.error('Fund wallet error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
