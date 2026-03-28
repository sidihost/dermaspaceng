import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendGiftCardRequestToAdmin, sendGiftCardConfirmation } from '@/lib/email'

// Paystack webhook handler
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
    }

    // Verify webhook signature
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured')
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    // Create signature verification using HMAC SHA256
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('Invalid Paystack signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)

    // Only process successful payment events
    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true })
    }

    const paymentData = event.data

    // Check if this is a gift card payment
    const metadata = paymentData.metadata || {}
    if (metadata.type !== 'gift_card') {
      return NextResponse.json({ received: true })
    }

    const giftCardId = metadata.gift_card_id
    const reference = paymentData.reference

    if (!giftCardId) {
      console.error('No gift card ID in metadata')
      return NextResponse.json({ received: true })
    }

    // Get gift card details
    const giftCards = await sql`
      SELECT gcp.*, u.email as user_email, u.first_name, u.last_name
      FROM gift_card_payments gcp
      JOIN users u ON gcp.user_id = u.id
      WHERE gcp.id = ${giftCardId}
    `

    if (giftCards.length === 0) {
      console.error('Gift card not found:', giftCardId)
      return NextResponse.json({ received: true })
    }

    const giftCard = giftCards[0]

    // Update payment status
    await sql`
      UPDATE gift_card_payments 
      SET payment_status = 'paid', 
          paid_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${giftCardId}
    `

    // Send email to admin after successful payment
    await sendGiftCardRequestToAdmin({
      amount: giftCard.amount,
      design: giftCard.design,
      occasion: giftCard.occasion,
      font: giftCard.font,
      recipientName: giftCard.recipient_name,
      recipientEmail: giftCard.recipient_email,
      recipientPhone: giftCard.recipient_phone,
      senderName: giftCard.sender_name,
      senderEmail: giftCard.sender_email,
      personalMessage: giftCard.personal_message,
      deliveryMethod: giftCard.delivery_method,
      deliveryDate: giftCard.delivery_date ? giftCard.delivery_date.toString() : null,
      paymentReference: reference
    })

    // Send confirmation email to user
    await sendGiftCardConfirmation({
      userEmail: giftCard.user_email,
      userName: `${giftCard.first_name} ${giftCard.last_name}`,
      amount: giftCard.amount,
      recipientName: giftCard.recipient_name,
      occasion: giftCard.occasion,
      paymentReference: reference
    })

    console.log(`Gift card payment successful: ${reference}, ID: ${giftCardId}`)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Paystack webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}