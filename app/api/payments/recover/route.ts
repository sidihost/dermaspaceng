import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Recovery token required' }, { status: 400 })
    }

    // Find abandoned payment by recovery token
    const payments = await sql`
      SELECT 
        ap.*,
        u.email,
        u.first_name
      FROM abandoned_payments ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.recovery_token = ${token}
      LIMIT 1
    `

    if (payments.length === 0) {
      return NextResponse.json({ error: 'Payment not found or link is invalid' }, { status: 404 })
    }

    const payment = payments[0]

    // Check if already completed
    if (payment.status === 'recovered' || payment.status === 'completed') {
      return NextResponse.json({ 
        error: 'This payment has already been completed',
        status: 'completed'
      }, { status: 400 })
    }

    // Return payment details (without sensitive info)
    return NextResponse.json({
      payment: {
        id: payment.id,
        user_id: payment.user_id,
        payment_type: payment.payment_type,
        amount: payment.amount,
        currency: payment.currency,
        item_details: payment.item_details,
        paystack_reference: payment.paystack_reference,
        status: payment.status,
        expires_at: payment.expires_at,
        created_at: payment.created_at
      }
    })
  } catch (error) {
    console.error('Payment recovery error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment details' }, { status: 500 })
  }
}
