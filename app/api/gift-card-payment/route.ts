import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify session
    const sessions = await sql`
      SELECT s.*, u.email as user_email, u.first_name, u.last_name, u.phone
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ${sessionId} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const user = sessions[0]
    const data = await request.json()

    const {
      amount,
      design,
      occasion,
      font,
      recipientName,
      recipientEmail,
      recipientPhone,
      senderName,
      personalMessage,
      deliveryMethod,
      deliveryDate
    } = data

    // Validate amount
    if (!amount || amount < 100) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Generate a unique reference
    const reference = `GFT-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    // Save pending gift card request to database
    const result = await sql`
      INSERT INTO gift_card_payments (
        user_id,
        amount,
        design,
        occasion,
        font,
        recipient_name,
        recipient_email,
        recipient_phone,
        sender_name,
        sender_email,
        personal_message,
        delivery_method,
        delivery_date,
        payment_status,
        payment_reference
      ) VALUES (
        ${user.id},
        ${amount},
        ${design},
        ${occasion},
        ${font},
        ${recipientName},
        ${recipientEmail},
        ${recipientPhone},
        ${senderName || `${user.first_name} ${user.last_name}`},
        ${user.user_email},
        ${personalMessage},
        ${deliveryMethod},
        ${deliveryDate},
        'pending',
        ${reference}
      )
      RETURNING id
    `

    const giftCardId = result[0]?.id

    // Initialize Paystack payment
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured')
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    // Convert amount to kobo (Paystack expects amount in kobo for NGN)
    const amountInKobo = Math.round(amount * 100)

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: user.user_email,
        amount: amountInKobo,
        currency: 'NGN',
        reference: reference,
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/gift-cards/success?reference=${reference}`,
        metadata: {
          gift_card_id: giftCardId,
          type: 'gift_card'
        }
      })
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      console.error('Paystack initialization failed:', paystackData)
      // Delete the pending record if Paystack fails
      await sql`DELETE FROM gift_card_payments WHERE id = ${giftCardId}`
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
    }

    // Update the reference with Paystack's reference
    await sql`
      UPDATE gift_card_payments 
      SET payment_reference = ${paystackData.data.reference}
      WHERE id = ${giftCardId}
    `

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      giftCardId
    })
  } catch (error) {
    console.error('Gift card payment initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}