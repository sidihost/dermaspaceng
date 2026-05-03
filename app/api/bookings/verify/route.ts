import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPayment } from '@/lib/paystack'
import {
  confirmBookingPayment,
  getBookingByReference,
} from '@/lib/booking'
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

    // Failed / abandoned / pending — leave the row in place so the
    // customer can retry payment from the booking detail page later.
    return NextResponse.json({
      status: verify.data.status,
      bookingReference: bookingRow.booking_reference,
    })
  } catch (err) {
    console.error('[bookings.verify] failed', err)
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 })
  }
}
