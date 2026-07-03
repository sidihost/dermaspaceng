import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTransactionByReference, formatCurrency } from '@/lib/wallet'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/wallet/transactions/[reference]
// Returns a single transaction (by our reference OR Paystack's),
// strictly scoped to the signed-in user. Powers the payment status
// page and the transaction detail sheet.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reference } = await params
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const tx = await getTransactionByReference(reference)

    // Never leak another user's transaction through reference guessing.
    if (!tx || String(tx.user_id) !== String(user.id)) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const amount = Number(tx.amount) || 0

    // If this payment funded an appointment, attach the booking so the
    // receipt page can show the real service, date, and time. Bookings
    // carry the same DS_ reference end-to-end (see 300-booking-system-v2),
    // so a simple lookup on either of our references finds it. Scoped to
    // the same user; failures degrade gracefully to a plain receipt.
    let booking = null
    try {
      const refs = [tx.payment_reference, tx.paystack_reference].filter(
        (r): r is string => Boolean(r),
      )
      const uniqueRefs = [...new Set(refs)]
      if (uniqueRefs.length > 0) {
        const bookingResult = await query<{
          id: string
          booking_reference: string
          location_name: string
          location_address: string | null
          appointment_date: string
          appointment_time: string
          total_duration: number
          status: string
        }>(
          `SELECT id, booking_reference, location_name, location_address,
                  to_char(appointment_date, 'YYYY-MM-DD') AS appointment_date,
                  appointment_time, total_duration, status
             FROM bookings
            WHERE user_id = $1 AND payment_reference = ANY($2)
            ORDER BY created_at DESC
            LIMIT 1`,
          [String(user.id), uniqueRefs],
        )
        const row = bookingResult.rows[0]
        if (row) {
          const servicesResult = await query<{
            treatment_name: string
            duration: number
          }>(
            `SELECT treatment_name, duration
               FROM booking_services
              WHERE booking_id = $1
              ORDER BY created_at ASC`,
            [row.id],
          )
          booking = { ...row, services: servicesResult.rows }
        }
      }
    } catch (bookingError) {
      console.error('Attach booking to transaction error:', bookingError)
    }

    return NextResponse.json({
      success: true,
      transaction: {
        ...tx,
        amount,
        formattedAmount: formatCurrency(amount, tx.currency),
        booking,
      },
    })
  } catch (error) {
    console.error('Get transaction by reference error:', error)
    return NextResponse.json(
      { error: 'Failed to load transaction' },
      { status: 500 },
    )
  }
}
