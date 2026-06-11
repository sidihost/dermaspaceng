'use client'

// /booking/verify — the URL Paystack redirects to after a card payment.
// We never trust the query string here; we hit `/api/bookings/verify`
// which calls Paystack's verify endpoint server-side, then bounces
// the user to either the success page or back into the wizard with
// a friendly error.
//
// IMPORTANT: `useSearchParams()` suspends during static prerender in
// Next.js 15+/16, so the hook MUST live inside a child component
// rendered under <Suspense>. Calling it directly in the page export
// causes `next build` to abort with "Error occurred prerendering page
// /booking/verify". Don't inline the hook back into the default
// export — split it like this.

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function VerifyingCard({ message }: { message?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#7B2D8E]" />
        <p className="mt-3 text-sm font-semibold text-gray-900">
          {message || 'Confirming your payment…'}
        </p>
        <p className="mt-1 text-[12px] text-gray-500">
          One sec — we&apos;re double-checking with Paystack.
        </p>
      </div>
    </main>
  )
}

// How long we keep re-checking a `pending` verification before giving
// up. Paystack occasionally reports `pending` for a few seconds right
// after a successful charge (bank confirmation lag) — failing the
// customer instantly there would be a false negative on a payment
// that actually went through.
const PENDING_RETRY_DELAY_MS = 3000
const MAX_PENDING_RETRIES = 5

function BookingVerifyInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'failed'>('verifying')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref')
    if (!reference) {
      router.replace('/booking?error=missing_reference')
      return
    }
    let cancelled = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    ;(async () => {
      try {
        for (let attempt = 0; attempt <= MAX_PENDING_RETRIES; attempt++) {
          const res = await fetch(
            `/api/bookings/verify?reference=${encodeURIComponent(reference)}`,
          )
          const json = await res.json()
          if (cancelled) return
          if (json.status === 'paid' && json.bookingReference) {
            router.replace(`/booking/${json.bookingReference}?status=success`)
            return
          }
          // `pending` / `unknown` = Paystack hasn't settled the charge
          // yet (or its verify API hiccuped). Re-check a few times
          // before declaring failure so a slow bank confirmation never
          // shows a paying customer an error screen.
          if (
            (json.status === 'pending' || json.status === 'unknown') &&
            attempt < MAX_PENDING_RETRIES
          ) {
            await sleep(PENDING_RETRY_DELAY_MS)
            if (cancelled) return
            continue
          }
          // Definitive non-success — show copy that matches what
          // actually happened instead of one generic scary message.
          setStatus('failed')
          setMessage(
            json.error ||
              (json.status === 'abandoned'
                ? 'It looks like the payment was closed before it finished. You have not been charged — you can try again.'
                : json.status === 'failed'
                  ? 'Your payment was declined by the bank. You have not been charged — please try another card or method.'
                  : json.status === 'pending' || json.status === 'unknown'
                    ? "Your bank hasn't confirmed this payment yet. If you completed it, your booking will be confirmed automatically — check your bookings in a few minutes before retrying."
                    : 'We could not confirm your payment. If you were charged, please contact support.'),
          )
          return
        }
      } catch (err: any) {
        if (cancelled) return
        setStatus('failed')
        setMessage(err?.message || 'Network error verifying payment.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params, router])

  if (status === 'verifying') {
    return <VerifyingCard />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <h1 className="text-base font-bold text-gray-900">Payment not confirmed</h1>
        <p className="mt-1.5 text-sm text-gray-600">{message}</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <a
            href="/booking"
            className="inline-flex justify-center rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A1D6A]"
          >
            Back to booking
          </a>
          <a
            href="/dashboard/bookings"
            className="inline-flex justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            My bookings
          </a>
        </div>
      </div>
    </main>
  )
}

export default function BookingVerifyPage() {
  // The `<Suspense>` fallback re-uses the same loading card the inner
  // component renders while it's awaiting the verify API, so users
  // see a single, consistent "Confirming your payment…" screen
  // whether the suspense is for prerender hydration or for the fetch.
  return (
    <Suspense fallback={<VerifyingCard />}>
      <BookingVerifyInner />
    </Suspense>
  )
}
