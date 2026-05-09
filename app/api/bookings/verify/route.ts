import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPayment } from '@/lib/paystack'
import {
  confirmBookingPayment,
  getBookingByReference,
  markBookingPaymentFailed,
} from '@/lib/booking'
import { notifyBookingPaymentFailed } from '@/lib/notifications'
import { sql } from '@/lib/db'

// GET /api/bookings/verify?reference=BK_...
//
// Called by `/booking/verify` (the Paystack `callback_url`) after the
// customer comes back from Paystack's hosted checkout. We:
//   1. Verify the transaction with Paystack.
//   2. If success → idempotently flip the booking to confirmed (if the
//      webhook hasn't already done so), and return the booking reference.
//   3. If failed/abandoned → return a useful status the success page
//      can show.
//
// We never trust the client's `?reference` blindly — we always
// re-verify with Paystack.
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }

    const reference = new URL(request.url).searchParams.get('reference')
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference.' }, { status: 400 })
    }

    // First make sure the reference belongs to a booking owned by this user.
    const bookingRows = (await sql`
      SELECT id, user_id, booking_reference, status, payment_status
      FROM bookings WHERE payment_reference = ${reference} LIMIT 1
    `) as any[]
    const bookingRow = bookingRows[0]
    if (!bookingRow) {
      return NextResponse.json(
        { error: 'No booking matches that reference.' },
        { status: 404 },
      )
    }
    if (bookingRow.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your booking.' }, { status: 403 })
    }

    // If the webhook already confirmed it, short-circuit.
    if (bookingRow.payment_status === 'paid') {
      return NextResponse.json({
        status: 'paid',
        bookingReference: bookingRow.booking_reference,
      })
    }

    // Hit Paystack to find out what really happened.
    const verify = await verifyPayment(reference)
    if (!verify || verify.status === false) {
      return NextResponse.json(
        { status: 'unknown', error: verify?.message || 'Could not verify payment.' },
        { status: 502 },
      )
    }

    if (verify.data.status === 'success') {
      await confirmBookingPayment({
        paymentReference: reference,
        paymentMethod: 'paystack',
      })
      const booking = await getBookingByReference(bookingRow.booking_reference, user.id)
      return NextResponse.json({
        status: 'paid',
        bookingReference: bookingRow.booking_reference,
        booking,
      })
    }

    // Failed / abandoned — mark the row so admins can see "card
    // declined: insufficient funds" without having to dig through
    // Paystack, and so the customer's notification inbox shows the
    // recovery link. We deliberately do NOT touch the row for the
    // `pending` case — that means the customer is mid-checkout and
    // hasn't returned an outcome yet. Marking it failed there would
    // be a false negative.
    if (verify.data.status === 'failed' || verify.data.status === 'abandoned') {
      const reason =
        verify.data.gateway_response ||
        (verify.data.status === 'abandoned'
          ? 'Customer didn\u2019t complete checkout'
          : 'Payment failed at gateway')
      const result = await markBookingPaymentFailed({
        paymentReference: reference,
        reason,
        source: 'verify',
      })
      if (result.updated) {
        try {
          const booking = await getBookingByReference(
            bookingRow.booking_reference,
            user.id,
          )
          if (booking) await notifyBookingPaymentFailed(booking, reason)
        } catch (err) {
          console.error('[bookings.verify] notify booking failure', err)
        }
      }
    }

    return NextResponse.json({
      status: verify.data.status,
      bookingReference: bookingRow.booking_reference,
    })
  } catch (err) {
    console.error('[bookings.verify] failed', err)
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 })
  }
}
