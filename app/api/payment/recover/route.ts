import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { initializePaystackPayment } from '@/lib/paystack'

// GET: Fetch abandoned payment by recovery token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Recovery token required' }, { status: 400 })
    }

    const abandonedPayments = await sql`
      SELECT ap.*, u.email, u.first_name, u.last_name
      FROM abandoned_payments ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.recovery_token = ${token}
        AND ap.recovered = false
        AND ap.expires_at > NOW()
    `

    if (abandonedPayments.length === 0) {
      return NextResponse.json({ error: 'Recovery link expired or invalid' }, { status: 404 })
    }

    const payment = abandonedPayments[0]

    return NextResponse.json({
      id: payment.id,
      itemType: payment.item_type,
      itemDetails: payment.item_details,
      user: {
        email: payment.email,
        firstName: payment.first_name
      },
      expiresAt: payment.expires_at
    })
  } catch (error) {
    console.error('Recovery fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch recovery data' }, { status: 500 })
  }
}

// POST: Resume/recover abandoned payment
export async function POST(request: Request) {
  try {
    const { token, paymentMethod } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Recovery token required' }, { status: 400 })
    }

    // Fetch the abandoned payment
    const abandonedPayments = await sql`
      SELECT ap.*, u.email, u.first_name
      FROM abandoned_payments ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.recovery_token = ${token}
        AND ap.recovered = false
        AND ap.expires_at > NOW()
    `

    if (abandonedPayments.length === 0) {
      return NextResponse.json({ error: 'Recovery link expired or invalid' }, { status: 404 })
    }

    const payment = abandonedPayments[0]
    const itemDetails = payment.item_details

    // Check if user is logged in and matches
    const currentUser = await getCurrentUser()
    if (currentUser && currentUser.id !== payment.user_id) {
      return NextResponse.json({ 
        error: 'This recovery link belongs to a different account' 
      }, { status: 403 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dermaspace.ng'

    // Handle payment based on method
    if (paymentMethod === 'wallet') {
      // If user wants to pay with wallet, check balance
      const wallets = await sql`
        SELECT balance FROM wallets WHERE user_id = ${payment.user_id}
      `

      if (wallets.length === 0 || wallets[0].balance < itemDetails.amount) {
        return NextResponse.json({ 
          error: 'Insufficient wallet balance',
          balance: wallets[0]?.balance || 0,
          required: itemDetails.amount
        }, { status: 400 })
      }

      // Process wallet payment
      const { processWalletPayment } = await import('@/lib/wallet')
      const result = await processWalletPayment(
        payment.user_id,
        itemDetails.amount,
        payment.item_type,
        itemDetails
      )

      if (result.success) {
        // Mark as recovered
        await sql`
          UPDATE abandoned_payments 
          SET recovered = true 
          WHERE id = ${payment.id}
        `

        return NextResponse.json({
          success: true,
          message: 'Payment completed successfully',
          transactionId: result.transactionId
        })
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
    } else {
      // Initialize Paystack payment
      const reference = `RECOVER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const paystackResult = await initializePaystackPayment({
        email: payment.email,
        amount: itemDetails.amount,
        reference,
        callback_url: `${baseUrl}/payment/callback?recovery=${token}`,
        metadata: {
          user_id: payment.user_id,
          type: payment.item_type,
          recovery_token: token,
          ...itemDetails
        }
      })

      if (paystackResult.status) {
        // Update abandoned payment with new transaction reference
        await sql`
          UPDATE abandoned_payments 
          SET reminder_count = reminder_count + 1
          WHERE id = ${payment.id}
        `

        return NextResponse.json({
          success: true,
          authorization_url: paystackResult.data.authorization_url,
          reference
        })
      } else {
        return NextResponse.json({ 
          error: 'Failed to initialize payment' 
        }, { status: 500 })
      }
    }
  } catch (error) {
    console.error('Recovery payment error:', error)
    return NextResponse.json({ error: 'Failed to process recovery' }, { status: 500 })
  }
}
