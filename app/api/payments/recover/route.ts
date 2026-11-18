import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')?.trim()

    if (!token) {
      return NextResponse.json({ error: 'Recovery token required' }, { status: 400 })
    }

    // Find abandoned payment by recovery token
    const payments = await sql`
      SELECT ap.*
      FROM abandoned_payments ap
      WHERE ap.recovery_token = ${token}
      LIMIT 1
    `

    if (payments.length === 0) {
      return NextResponse.json({ error: 'Payment not found or link is invalid' }, { status: 404 })
    }

    const payment = payments[0]

    // If a different user is currently signed in, deny access explicitly
    const currentUser = await getCurrentUser()
    if (currentUser && currentUser.id !== payment.user_id) {
      return NextResponse.json(
        { error: 'This recovery link belongs to a different account' },
        { status: 403 }
      )
    }

    // Check if already completed or recovered
    if (
      payment.recovered === true ||
      payment.status === 'recovered' ||
      payment.status === 'completed'
    ) {
      return NextResponse.json({
        error: 'This payment has already been completed',
        status: 'completed'
      }, { status: 400 })
    }

    // Enforce server-side expiration so expired tokens are rejected
    if (!payment.expires_at || new Date(payment.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({
        error: 'This payment recovery link has expired',
        status: 'expired'
      }, { status: 410 })
    }

    // Return payment details (without user_id, email, or internal references)
    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          payment_type: payment.payment_type,
          amount: payment.amount,
          currency: payment.currency,
          item_details: payment.item_details,
          status: payment.status,
          expires_at: payment.expires_at,
          created_at: payment.created_at
        }
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Payment recovery error:', error)
    return NextResponse.json({ error: 'Failed to fetch payment details' }, { status: 500 })
  }
}
