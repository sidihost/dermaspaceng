import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createPendingBooking,
  setBookingPaymentReference,
  confirmBookingPayment,
  cancelBooking,
  formatNaira,
  koboToNaira,
} from '@/lib/booking'
import { initializePayment, generateReference } from '@/lib/paystack'
import { sql } from '@/lib/db'
import { isFeatureEnabled } from '@/lib/feature-flags'

// POST /api/bookings/initiate
//
// Body:
//   {
//     locationId: string,
//     appointmentDate: 'YYYY-MM-DD',
//     appointmentTime: 'HH:MM',
//     services: [{ categoryId, treatmentId }, ...],
//     customerName, customerEmail, customerPhone,
//     notes?: string,
//     paymentMethod: 'wallet' | 'paystack',
//   }
//
// What it does, in order:
//   1. Hard gate on the `booking` feature flag — if booking is paused
//      site-wide we refuse here, even though the UI shouldn't have
//      let the customer reach this point.
//   2. Auth check (the catalog and slot grid are public; *paying* is not).
//   3. Create a `pending` booking under a transactional row lock so
//      we never oversell a slot.
//   4. Settle payment:
//        - Wallet → debit immediately, flip booking to confirmed,
//          return `{ status: 'paid', redirect: '/booking/<ref>' }`.
//          If debit fails (e.g. insufficient funds), undo the booking
//          (cancel) and surface the error.
//        - Paystack → call `transaction/initialize`, store the returned
//          reference on the booking row, return `{ status: 'redirect',
//          authorizationUrl }`. The booking stays `pending` until the
//          webhook (or /verify) fires.
export async function POST(request: NextRequest) {
  try {
    if (!(await isFeatureEnabled('booking'))) {
      return NextResponse.json(
        { error: 'Online booking is paused. Please use WhatsApp or call us.' },
        { status: 503 },
      )
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to book.' },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }
    const {
      locationId,
      appointmentDate,
      appointmentTime,
      services,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      paymentMethod,
    } = body as {
      locationId?: string
      appointmentDate?: string
      appointmentTime?: string
      services?: Array<{ categoryId: string; treatmentId: string }>
      customerName?: string
      customerEmail?: string
      customerPhone?: string
      notes?: string
      paymentMethod?: 'wallet' | 'paystack'
    }

    // Required-field validation. We don't accept partial drafts here —
    // the wizard collects everything before calling us.
    if (
      !locationId ||
      !appointmentDate ||
      !appointmentTime ||
      !Array.isArray(services) ||
      services.length === 0 ||
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      (paymentMethod !== 'wallet' && paymentMethod !== 'paystack')
    ) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    // Step 1 — create the pending booking. Throws on any issue
    // (slot taken, closed day, past time, …) with a friendly message.
    let pending
    try {
      pending = await createPendingBooking({
        userId: user.id,
        locationId,
        appointmentDate,
        appointmentTime,
        services,
        customerName,
        customerEmail,
        customerPhone,
        notes: notes || null,
        paymentMethod,
      })
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || 'Could not create booking.' },
        { status: 400 },
      )
    }

    // Step 2 — settle payment.
    if (paymentMethod === 'wallet') {
      // Wallet stores Naira (legacy DECIMAL), bookings track kobo.
      const naira = koboToNaira(pending.totalKobo)
      const walletRef = `WAL_BK_${pending.bookingId.slice(0, 8)}_${Date.now()}`

      // We bypass `lib/wallet.ts` deliberately — its older API has
      // type signatures that take `userId: number`, but our user IDs
      // are uuids. Going direct against the table keeps types honest
      // and the SQL transactional with the booking confirmation.
      try {
        await sql`BEGIN`
        const wallets = (await sql`
          SELECT id, balance FROM wallets
          WHERE user_id = ${user.id}
          FOR UPDATE
        `) as any[]
        if (wallets.length === 0) {
          throw new Error('Wallet not set up yet. Please fund your wallet first.')
        }
        const wallet = wallets[0]
        if (Number(wallet.balance) < naira) {
          throw new Error(
            `Insufficient wallet balance. You need ${formatNaira(pending.totalKobo)} to confirm this booking.`,
          )
        }
        await sql`
          UPDATE wallets
          SET balance = balance - ${naira}, updated_at = NOW()
          WHERE id = ${wallet.id}
        `
        await sql`
          INSERT INTO transactions (
            user_id, wallet_id, reference, type, status, amount, currency,
            payment_method, description, metadata
          ) VALUES (
            ${user.id}, ${wallet.id}, ${walletRef}, 'debit', 'completed',
            ${naira}, 'NGN', 'wallet',
            ${`Booking payment ${pending.bookingReference}`},
            ${JSON.stringify({ type: 'booking', booking_id: pending.bookingId, booking_reference: pending.bookingReference })}
          )
        `
        await sql`COMMIT`
      } catch (err: any) {
        await sql`ROLLBACK`.catch(() => {})
        // Cancel the pending booking so the slot frees up for someone else.
        await cancelBooking({
          bookingId: pending.bookingId,
          reason: 'Wallet payment failed',
        }).catch(() => {})
        return NextResponse.json(
          { error: err?.message || 'Wallet payment failed.' },
          { status: 400 },
        )
      }

      // Stamp the wallet reference + flip booking → confirmed.
      await setBookingPaymentReference(pending.bookingId, walletRef)
      await confirmBookingPayment({
        paymentReference: walletRef,
        paymentMethod: 'wallet',
      })

      return NextResponse.json({
        status: 'paid',
        bookingReference: pending.bookingReference,
        redirect: `/booking/${pending.bookingReference}?status=success`,
      })
    }

    // Paystack flow.
    const paystackRef = generateReference('BK')
    await setBookingPaymentReference(pending.bookingId, paystackRef)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const init = await initializePayment({
      email: customerEmail,
      amount: pending.totalKobo, // Paystack expects kobo
      reference: paystackRef,
      callbackUrl: `${appUrl}/booking/verify`,
      metadata: {
        type: 'booking',
        booking_id: pending.bookingId,
        booking_reference: pending.bookingReference,
        user_id: user.id,
      },
    })

    if (!init || init.status === false || !init.data?.authorization_url) {
      // Paystack init failed — release the slot.
      await cancelBooking({
        bookingId: pending.bookingId,
        reason: 'Paystack init failed',
      }).catch(() => {})
      return NextResponse.json(
        { error: init?.message || 'Could not start payment. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      status: 'redirect',
      bookingReference: pending.bookingReference,
      authorizationUrl: init.data.authorization_url,
      reference: paystackRef,
    })
  } catch (err) {
    console.error('[bookings.initiate] unexpected', err)
    return NextResponse.json({ error: 'Could not start booking.' }, { status: 500 })
  }
}
