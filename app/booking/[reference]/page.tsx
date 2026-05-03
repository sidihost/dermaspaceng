'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Receipt,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react'

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(kobo / 100)

interface Booking {
  id: string
  booking_reference: string
  location_name: string
  location_address: string | null
  appointment_date: string
  appointment_time: string
  total_duration: number
  total_price_kobo: number
  customer_name: string
  customer_email: string
  customer_phone: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed'
  payment_method: 'wallet' | 'paystack' | null
  notes: string | null
  services: Array<{
    treatmentName: string
    categoryName: string
    duration: number
    priceKobo: number
  }>
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = use(params)
  const search = useSearchParams()
  const showSuccess = search.get('status') === 'success'

  const { data, isLoading, error, mutate } = useSWR<{
    booking?: Booking
    error?: string
  }>(`/api/bookings/${encodeURIComponent(reference)}`, fetcher, {
    revalidateOnFocus: false,
  })

  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const booking = data?.booking

  const onCancel = async () => {
    if (!booking) return
    if (!confirm('Cancel this appointment? Wallet payments are refunded automatically.')) return
    setCancelling(true)
    setCancelError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.booking_reference}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer cancellation' }),
      })
      const json = await res.json()
      if (!res.ok) {
        setCancelError(json.error || 'Could not cancel.')
      } else {
        await mutate()
      }
    } catch (err: any) {
      setCancelError(err?.message || 'Network error.')
    } finally {
      setCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
        </div>
        <Footer />
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <XCircle className="mx-auto h-10 w-10 text-gray-300" />
          <h1 className="mt-3 text-lg font-bold text-gray-900">Booking not found</h1>
          <p className="mt-1 text-sm text-gray-600">
            {data?.error || 'We could not find that booking under your account.'}
          </p>
          <Link
            href="/booking"
            className="mt-4 inline-flex rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5A1D6A]"
          >
            Back to booking
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  const dateLabel = new Date(`${booking.appointment_date}T00:00:00.000Z`).toLocaleDateString(
    'en-NG',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    },
  )

  const isCancellable = booking.status === 'confirmed' || booking.status === 'pending'

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <section className="mx-auto max-w-2xl px-4 py-6">
        {/* Success banner — only show right after a successful payment */}
        {showSuccess && booking.status === 'confirmed' ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-900">
                You&apos;re booked in!
              </p>
              <p className="mt-0.5 text-[12px] text-green-800">
                We sent a confirmation to {booking.customer_email}. See you on{' '}
                {dateLabel} at {booking.appointment_time}.
              </p>
            </div>
          </div>
        ) : null}

        {/* Status pill */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 shadow-sm ring-1 ring-gray-200">
            <Receipt className="h-3 w-3" />
            {booking.booking_reference}
          </span>
          <StatusPill status={booking.status} payment={booking.payment_status} />
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="px-5 pt-5 pb-3">
            <h1 className="text-lg font-bold text-gray-900">Your appointment</h1>
            <p className="mt-0.5 text-[12px] text-gray-500">Hi {booking.customer_name},</p>
          </div>

          <div className="space-y-3 px-5 py-3 text-sm">
            <DetailRow icon={<MapPin />} title={booking.location_name}>
              {booking.location_address}
            </DetailRow>
            <DetailRow icon={<Calendar />} title={dateLabel}>
              at {booking.appointment_time}
            </DetailRow>
            <DetailRow icon={<Clock />} title={`${booking.total_duration} minutes`} />
          </div>

          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {booking.services.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.treatmentName}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {s.categoryName} • {s.duration} min
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-900">
                  {formatNaira(s.priceKobo)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-5 py-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
              Total paid
            </span>
            <span className="text-base font-bold text-gray-900">
              {formatNaira(booking.total_price_kobo)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {booking.notes ? (
          <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Your notes
            </p>
            <p className="mt-1 text-gray-700">{booking.notes}</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href={`tel:${booking.customer_phone}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Phone className="h-4 w-4" />
            Need to talk to us?
          </a>
          {isCancellable ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel appointment
            </button>
          ) : null}
        </div>

        {cancelError ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[12px] text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{cancelError}</span>
          </div>
        ) : null}

        <p className="mt-4 text-center text-[11px] text-gray-500">
          <Link href="/dashboard" className="font-semibold text-[#7B2D8E] hover:underline">
            View all bookings
          </Link>
        </p>
      </section>

      <Footer />
    </main>
  )
}

function DetailRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string | null
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[#7B2D8E] [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        {children ? <p className="mt-0.5 text-[12px] text-gray-500">{children}</p> : null}
      </div>
    </div>
  )
}

function StatusPill({
  status,
  payment,
}: {
  status: Booking['status']
  payment: Booking['payment_status']
}) {
  // Compose status copy from the booking status + payment status so
  // a `pending + unpaid` row reads as "Awaiting payment", a
  // `cancelled + refunded` row reads as "Cancelled • Refunded", etc.
  const tone =
    status === 'cancelled' || status === 'no_show'
      ? 'red'
      : status === 'completed'
        ? 'green'
        : status === 'confirmed'
          ? 'green'
          : 'amber'
  const label = (() => {
    if (status === 'cancelled') {
      return payment === 'refunded' ? 'Cancelled • Refunded' : 'Cancelled'
    }
    if (status === 'completed') return 'Completed'
    if (status === 'no_show') return 'No-show'
    if (status === 'confirmed') return 'Confirmed'
    return payment === 'unpaid' ? 'Awaiting payment' : 'Pending'
  })()
  const cls =
    tone === 'red'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : tone === 'green'
        ? 'bg-green-50 text-green-700 ring-green-200'
        : 'bg-amber-50 text-amber-800 ring-amber-200'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${cls}`}
    >
      {label}
    </span>
  )
}
