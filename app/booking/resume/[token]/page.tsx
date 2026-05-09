/**
 * /booking/resume/[token] — recover an abandoned/failed booking.
 *
 * The customer reaches this page from the "Finish my booking" CTA in
 * their failure email or in-app notification. We do everything
 * server-side here: consume the recovery token, mint a fresh Paystack
 * reference, and 302-redirect to Paystack's hosted checkout. The
 * customer never sees a Dermaspace screen between the email tap and
 * the card form — that\u2019s the "big tech magic link" UX the request
 * was asking for.
 *
 * Failure modes:
 *   - Token unknown / expired / consumed → friendly error screen with
 *     a link back to /booking. We deliberately don\u2019t reveal *why*
 *     so a malicious actor can\u2019t enumerate token states.
 *   - Booking already paid → straight to the receipt.
 *   - Booking cancelled → friendly "this booking is no longer
 *     available" message.
 *   - Paystack init fails → bounce back to the booking detail page
 *     with `?status=retry` so the customer sees the actionable retry
 *     button, not a dead-end.
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import {
  consumeBookingRecoveryToken,
  setBookingPaymentReference,
} from '@/lib/booking'
import { initializePayment, generateReference } from '@/lib/paystack'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BookingResumePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const booking = await consumeBookingRecoveryToken(token)

  if (!booking) {
    return <ExpiredScreen />
  }

  // Already paid → receipt.
  if (booking.payment_status === 'paid') {
    redirect(`/booking/${booking.booking_reference}?status=success`)
  }
  // Cancelled → no recovery possible.
  if (booking.status === 'cancelled') {
    return <CancelledScreen reference={booking.booking_reference} />
  }

  // Mint a fresh Paystack reference — the previous one may have been
  // consumed or marked failed. Stamp it on the booking so the webhook
  // and verify routes can find this row.
  const newRef = generateReference('BK')
  await setBookingPaymentReference(booking.id, newRef)

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://dermaspaceng.com'
  const init = await initializePayment({
    email: booking.customer_email,
    amount: booking.total_price_kobo,
    reference: newRef,
    callbackUrl: `${appUrl}/booking/verify`,
    metadata: {
      type: 'booking',
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      user_id: booking.user_id,
      recovery: true,
    },
  })

  if (!init || init.status === false || !init.data?.authorization_url) {
    // Send the customer to the booking detail page so they can press
    // "retry payment" themselves — better than a hard error screen.
    redirect(`/booking/${booking.booking_reference}?status=retry`)
  }

  redirect(init.data.authorization_url)
}

// ---------------------------------------------------------------------------
// Local UI — kept inline because they\u2019re only ever rendered here, but
// styled to match the receipt page (same purple, same rounded cards).
// ---------------------------------------------------------------------------
function ExpiredScreen() {
  return (
    <main className="min-h-[80vh] grid place-items-center px-4 py-12 bg-gradient-to-b from-[#FBF9FC] to-white">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 sm:p-8 shadow-[0_24px_60px_-30px_rgba(91,33,116,0.25)] text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-[19px] font-semibold tracking-tight text-gray-900">
          This recovery link has expired
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          For your security, recovery links are single-use and expire after a few
          days. You can start a new booking in seconds — your saved details will
          be there waiting for you.
        </p>
        <Link
          href="/booking"
          className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7B2D8E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5A1D6A]"
        >
          Start a new booking
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}

function CancelledScreen({ reference }: { reference: string }) {
  return (
    <main className="min-h-[80vh] grid place-items-center px-4 py-12 bg-gradient-to-b from-[#FBF9FC] to-white">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 sm:p-8 shadow-[0_24px_60px_-30px_rgba(91,33,116,0.25)] text-center">
        <h1 className="text-[19px] font-semibold tracking-tight text-gray-900">
          This booking was cancelled
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Booking{' '}
          <span className="font-mono text-[#7B2D8E]">{reference}</span> is no
          longer available. We\u2019d love to see you — pick a new slot below.
        </p>
        <Link
          href="/booking"
          className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7B2D8E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5A1D6A]"
        >
          Book again
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
