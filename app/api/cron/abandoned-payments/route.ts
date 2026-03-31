import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendAbandonedPaymentReminder } from '@/lib/wallet-emails'

// This cron job runs every hour to send reminder emails for abandoned payments
// Configure in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/abandoned-payments",
//     "schedule": "0 * * * *"
//   }]
// }

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow in development or if CRON_SECRET is not set
      if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Find abandoned payments that need reminder emails
    // Send reminder for payments that are:
    // 1. Created more than 30 minutes ago (give user time to complete on their own)
    // 2. Not expired yet
    // 3. Haven't received a reminder yet OR last reminder was sent > 24 hours ago
    // 4. Status is still 'pending'
    const abandonedPayments = await sql`
      SELECT 
        ap.*,
        u.email,
        u.first_name
      FROM abandoned_payments ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.status = 'pending'
        AND ap.expires_at > NOW()
        AND ap.created_at < NOW() - INTERVAL '30 minutes'
        AND (
          ap.reminder_sent_at IS NULL 
          OR ap.reminder_sent_at < NOW() - INTERVAL '24 hours'
        )
        AND ap.reminder_count < 3
      ORDER BY ap.created_at ASC
      LIMIT 50
    `

    let sentCount = 0
    let failedCount = 0

    for (const payment of abandonedPayments) {
      try {
        // Generate recovery URL
        const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/continue-payment?token=${payment.recovery_token}`

        // Determine payment description
        let itemDescription = 'your purchase'
        if (payment.payment_type === 'booking' && payment.item_details?.serviceName) {
          itemDescription = `your ${payment.item_details.serviceName} booking`
        } else if (payment.payment_type === 'gift_card') {
          itemDescription = 'your gift card purchase'
        } else if (payment.payment_type === 'wallet_funding') {
          itemDescription = 'your wallet top-up'
        }

        // Send reminder email
        await sendAbandonedPaymentReminder({
          email: payment.email,
          firstName: payment.first_name,
          paymentType: payment.payment_type,
          amount: payment.amount,
          itemDetails: payment.item_details || {},
          recoveryUrl
        })

        // Update reminder tracking
        await sql`
          UPDATE abandoned_payments 
          SET 
            reminder_sent_at = NOW(),
            reminder_count = reminder_count + 1
          WHERE id = ${payment.id}
        `

        sentCount++
      } catch (error) {
        console.error(`Failed to send reminder for payment ${payment.id}:`, error)
        failedCount++
      }
    }

    // Clean up old expired payments (older than 7 days)
    await sql`
      DELETE FROM abandoned_payments
      WHERE expires_at < NOW() - INTERVAL '7 days'
        AND status NOT IN ('recovered', 'completed')
    `

    return NextResponse.json({
      success: true,
      message: `Processed ${abandonedPayments.length} abandoned payments`,
      sent: sentCount,
      failed: failedCount
    })
  } catch (error) {
    console.error('Abandoned payments cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
