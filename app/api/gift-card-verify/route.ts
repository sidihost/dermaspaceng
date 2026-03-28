import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json({ error: 'No reference provided' }, { status: 400 })
    }

    // Get gift card by payment reference
    const giftCards = await sql`
      SELECT * FROM gift_card_payments 
      WHERE payment_reference = ${reference}
    `

    if (giftCards.length === 0) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 })
    }

    const giftCard = giftCards[0]

    // Check payment status
    if (giftCard.payment_status !== 'paid') {
      return NextResponse.json({
        success: true,
        giftCard: giftCard,
        paymentStatus: giftCard.payment_status
      })
    }

    return NextResponse.json({
      success: true,
      giftCard: giftCard,
      paymentStatus: 'paid'
    })
  } catch (error) {
    console.error('Gift card verify error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}