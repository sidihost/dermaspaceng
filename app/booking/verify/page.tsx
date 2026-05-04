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
    ;(async () => {
      try {
        const res = await fetch(
          `/api/bookings/verify?reference=${encodeURIComponent(reference)}`,
        )
        const json = await res.json()
        if (cancelled) return
        if (json.status === 'paid' && json.bookingReference) {
          router.replace(`/booking/${json.bookingReference}?status=success`)
          return
        }
        // Anything else — leave the user on a "couldn't confirm"
        // screen with a button back into the wizard.
        setStatus('failed')
        setMessage(
          json.error ||
            'We could not confirm your payment. If you were charged, please contact support.',
        )
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
        <a
          href="/booking"
          className="mt-4 inline-flex rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A1D6A]"
        >
          Back to booking
        </a>
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
