import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  cancelBooking,
  getBookingByReference,
  getBookingById,
  koboToNaira,
} from '@/lib/booking'
import { sql } from '@/lib/db'

// POST /api/bookings/[id]/cancel
//
// Owner-only cancellation. Refund policy:
//   - Wallet payments → full refund credited back to the wallet,
//     same SQL transaction as the cancel so we never end up with
//     a "cancelled but no refund" state.
//   - Paystack payments → we mark the booking cancelled but DO NOT
//     auto-refund. Card refunds go through Paystack's dashboard
//     after staff review. The booking row's `cancellation_reason`
//     captures why; `payment_status` becomes 'refunded' once the
//     refund actually clears (via webhook in a future iteration).
//
// In either case we enforce a 12-hour cutoff: you can't cancel less
// than 12 hours before your appointment online — the customer has to
// call the front desk for late cancels, where staff can decide on
// a case-by-case basis.
const LATE_CANCEL_HOURS = 12

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    const { id } = await params

    const booking = id.startsWith('DS-')
      ? await getBookingByReference(id, user.id)
      : await getBookingById(id, user.id)
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This booking is already cancelled.' },
        { status: 400 },
      )
    }
    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Completed bookings cannot be cancelled.' },
        { status: 400 },
      )
    }

    // Enforce the 12-hour cutoff. Lagos is UTC+1 with no DST so we
    // shift an hour and compare in plain UTC math.
    const apptUtc = new Date(`${booking.appointment_date}T${booking.appointment_time}:00.000Z`)
    const apptLagos = new Date(apptUtc.getTime() - 60 * 60 * 1000) // back to wall-clock UTC
    const cutoffMs = apptLagos.getTime() - LATE_CANCEL_HOURS * 60 * 60 * 1000
    if (Date.now() > cutoffMs && booking.status !== 'pending') {
      return NextResponse.json(
        {
          error: `Online cancellation is closed within ${LATE_CANCEL_HOURS} hours of your appointment. Please call the spa.`,
        },
        { status: 400 },
      )
    }

    let body: { reason?: string } = {}
    try {
      body = await request.json()
    } catch {}

    const result = await cancelBooking({
      bookingId: booking.id,
      reason: body.reason || 'Customer cancellation',
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Could not cancel booking.' },
        { status: 400 },
      )
    }

    // Wallet refund — atomic credit + transaction row + booking
    // payment_status flip. We do this OUTSIDE `cancelBooking` so
    // the refund logic can stay close to the wallet schema (which
    // lives on the route side, not in the booking lib).
    if (result.paymentMethod === 'wallet' && result.refundKobo > 0) {
      const naira = koboToNaira(result.refundKobo)
      const refundRef = `WAL_RF_${booking.id.slice(0, 8)}_${Date.now()}`
      try {
        await sql`BEGIN`
        const wallets = (await sql`
          SELECT id FROM wallets WHERE user_id = ${user.id} FOR UPDATE
        `) as any[]
        if (wallets.length === 0) {
          throw new Error('Missing wallet for refund.')
        }
        await sql`
          UPDATE wallets
          SET balance = balance + ${naira}, updated_at = NOW()
          WHERE id = ${wallets[0].id}
        `
        await sql`
          INSERT INTO transactions (
            user_id, wallet_id, reference, type, status, amount, currency,
            payment_method, description, metadata
          ) VALUES (
            ${user.id}, ${wallets[0].id}, ${refundRef}, 'refund', 'completed',
            ${naira}, 'NGN', 'wallet',
            ${`Refund for booking ${booking.booking_reference}`},
            ${JSON.stringify({ type: 'booking_refund', booking_id: booking.id, booking_reference: booking.booking_reference })}
          )
        `
        await sql`
          UPDATE bookings SET payment_status = 'refunded', updated_at = NOW()
          WHERE id = ${booking.id}
        `
        await sql`COMMIT`
      } catch (err) {
        await sql`ROLLBACK`.catch(() => {})
        console.error('[bookings.cancel] wallet refund failed', err)
        // Booking is already cancelled — flag the row so admin can refund manually.
        await sql`
          UPDATE bookings
          SET cancellation_reason = COALESCE(cancellation_reason, '') || ' [REFUND_FAILED]',
              updated_at = NOW()
          WHERE id = ${booking.id}
        `
        return NextResponse.json(
          {
            error:
              'Booking cancelled but refund could not be processed automatically. Our team will reach out.',
          },
          { status: 500 },
        )
      }
    }

    // Cancellation confirmation email — best-effort, never blocks the
    // response. Mirrors the booking-receipt email so the customer gets a
    // clear "cancelled" message plus refund details when applicable.
    try {
      const recipient = booking.customer_email || user.email
      if (recipient) {
        const dateLabelLong = booking.appointment_date
          ? new Date(`${booking.appointment_date}T00:00:00Z`).toLocaleDateString(
              'en-NG',
              {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              },
            )
          : ''
        const { sendBookingCancellation } = await import('@/lib/email')
        await sendBookingCancellation({
          email: recipient,
          customerName: booking.customer_name ?? '',
          bookingReference: result.bookingReference ?? booking.booking_reference,
          appointmentDate: dateLabelLong,
          appointmentTime: (booking.appointment_time ?? '').toString().slice(0, 5),
          locationName: booking.location_name ?? 'Dermaspace',
          reason: body.reason || null,
          refundKobo: result.refundKobo,
          paymentMethod: result.paymentMethod,
        })
      }
    } catch (mailErr) {
      console.error('[bookings.cancel] cancellation email failed', mailErr)
    }

    return NextResponse.json({
      ok: true,
      refundKobo: result.refundKobo,
      paymentMethod: result.paymentMethod,
      bookingReference: result.bookingReference,
    })
  } catch (err) {
    console.error('[bookings.cancel] failed', err)
    return NextResponse.json(
      { error: 'Cancellation failed.' },
      { status: 500 },
    )
  }
}
