'use client'

/**
 * /dashboard/bookings — the customer's full booking history.
 *
 * Replaces the "appointments" inline tab that used to live inside
 * /dashboard. The dedicated page lets us:
 *   - Show real data backed by /api/bookings (which already returns
 *     the user's last 100 bookings hydrated with line items).
 *   - Filter by status (Upcoming / Completed / Cancelled / All).
 *   - Group by date with the same visual rhythm the wallet uses.
 *   - Deep-link to any single booking via /booking/[reference] for
 *     receipts, cancel, or re-book actions.
 *
 * SWR is used so toggling between filters never refires the network,
 * and so other parts of the app (post-booking confirmation, the
 * cancel flow) trigger a passive revalidation that updates this list
 * automatically.
 */

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarPlus,
  Receipt,
} from 'lucide-react'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import PageLoader from '@/components/shared/page-loader'

interface BookingService {
  categoryId: string | null
  categoryName: string | null
  treatmentId: string | null
  treatmentName: string
  duration: number
  priceKobo: number
}

interface Booking {
  id: string
  user_id: string
  booking_reference: string
  location_id: string | null
  location_name: string | null
  location_address: string | null
  appointment_date: string // YYYY-MM-DD
  appointment_time: string // HH:MM
  total_duration: number
  total_price_kobo: number
  customer_name: string
  customer_email: string
  customer_phone: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  payment_status: string
  payment_method: string
  created_at: string
  services: BookingService[]
}

type FilterKey = 'all' | 'upcoming' | 'completed' | 'cancelled'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async (r) => {
    if (r.status === 401) {
      // Redirect handled at the page level via the unauthenticated
      // branch below.
      return { unauthenticated: true } as const
    }
    if (!r.ok) throw new Error('Failed to load bookings')
    return r.json() as Promise<{ bookings: Booking[] }>
  })

function nairaFromKobo(kobo: number): string {
  const naira = Math.round(kobo / 100)
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(naira)
}

function formatDateLong(iso: string): string {
  // Treat YYYY-MM-DD as Lagos local; appending T00:00 keeps it
  // anchored to midnight in the user's TZ rather than UTC, which
  // would render the previous day for everyone east of -01:00.
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(time: string): string {
  // "HH:MM" -> "10:30 AM"
  const [hh, mm] = time.split(':').map(Number)
  if (Number.isNaN(hh)) return time
  const date = new Date()
  date.setHours(hh, mm ?? 0, 0, 0)
  return date.toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function isUpcoming(b: Booking): boolean {
  if (b.status === 'cancelled' || b.status === 'no_show' || b.status === 'completed') {
    return false
  }
  const now = new Date()
  const apt = new Date(`${b.appointment_date}T${b.appointment_time || '00:00'}:00`)
  return apt.getTime() >= now.getTime() - 30 * 60 * 1000
}

function statusPill(status: Booking['status']) {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmed',
        className: 'bg-[#0F8A4D]/10 text-[#0F8A4D]',
        icon: CheckCircle2,
      }
    case 'pending':
      return {
        label: 'Awaiting confirmation',
        className: 'bg-amber-100 text-amber-700',
        icon: Clock,
      }
    case 'completed':
      return {
        label: 'Completed',
        className: 'bg-gray-100 text-gray-700',
        icon: CheckCircle2,
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-700',
        icon: XCircle,
      }
    case 'no_show':
      return {
        label: 'No show',
        className: 'bg-red-100 text-red-700',
        icon: AlertCircle,
      }
  }
}

export default function BookingsContent() {
  const [filter, setFilter] = React.useState<FilterKey>('upcoming')
  const { data, error, isLoading } = useSWR<
    { bookings: Booking[] } | { unauthenticated: true }
  >('/api/bookings', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  })

  // Use a real ellipsis character (…) — JSX double-quoted attributes
  // don't process JS escape sequences, so `\u2026` would have rendered
  // as the six literal characters `\u2026` in the spinner label.
  if (isLoading) return <PageLoader label="Loading your bookings…" />

  // Auth gate — match the rest of the dashboard's behaviour so users
  // get a clear "sign in" CTA instead of a confusing empty state.
  if (data && 'unauthenticated' in data) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Sign in to see your bookings
            </h1>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Your booking history lives inside your account. Sign in or
              create one to keep track of every appointment in one place.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/signin?next=/dashboard/bookings"
                className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full border border-gray-200 text-gray-800 text-sm font-semibold hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
              >
                Book without an account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const bookings = (data && 'bookings' in data ? data.bookings : []) ?? []

  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return isUpcoming(b)
    if (filter === 'completed') return b.status === 'completed'
    if (filter === 'cancelled') return b.status === 'cancelled' || b.status === 'no_show'
    return true
  })

  const counts = {
    upcoming: bookings.filter(isUpcoming).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter(
      (b) => b.status === 'cancelled' || b.status === 'no_show',
    ).length,
    all: bookings.length,
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Breadcrumb */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#7B2D8E] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>

          {/* Header */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                My bookings
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Every appointment you&apos;ve booked with Dermaspace, in one place.
              </p>
            </div>
            <Link
              href="/booking"
              className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-5 h-10 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
            >
              <CalendarPlus className="w-4 h-4" />
              Book new
            </Link>
          </div>

          {/* Filter pills */}
          <div className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-hide">
            <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
              {FILTERS.map(({ key, label }) => {
                const active = filter === key
                const count = counts[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`inline-flex items-center gap-2 px-3.5 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-white text-[#7B2D8E] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10.5px] font-bold ${
                        active
                          ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* List */}
          <div className="mt-6">
            {error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5 text-sm text-red-700">
                We couldn&apos;t load your bookings. Refresh the page or try
                again in a moment.
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              <ul className="space-y-3">
                {filtered.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const copy: Record<FilterKey, { title: string; body: string }> = {
    all: {
      title: 'No bookings yet',
      body: 'Once you book a treatment it\u2019ll show up here, with the date, time and a receipt you can download anytime.',
    },
    upcoming: {
      title: 'Nothing on your calendar',
      body: 'No upcoming appointments right now. Browse our treatments to find your next session.',
    },
    completed: {
      title: 'No completed bookings yet',
      body: 'Your past appointments will appear here after they\u2019re marked complete.',
    },
    cancelled: {
      title: 'No cancellations',
      body: 'Cancelled or missed bookings would show up here \u2014 nothing to see for now.',
    },
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-7 h-7" />
      </div>
      <h2 className="text-base sm:text-lg font-semibold text-gray-900">
        {copy[filter].title}
      </h2>
      <p className="mt-1.5 text-sm text-gray-500 max-w-sm mx-auto">
        {copy[filter].body}
      </p>
      <Link
        href="/booking"
        className="mt-5 inline-flex items-center justify-center gap-2 px-5 h-10 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6B2278] transition-colors"
      >
        Book a treatment
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

function BookingRow({ booking }: { booking: Booking }) {
  const pill = statusPill(booking.status)
  const PillIcon = pill?.icon ?? Clock
  const primaryService = booking.services[0]
  const extraServices = Math.max(0, booking.services.length - 1)

  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 hover:border-[#7B2D8E]/30 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-gray-900 truncate">
                {primaryService?.treatmentName ?? 'Spa appointment'}
                {extraServices > 0 && (
                  <span className="text-gray-500 font-normal">
                    {' '}+ {extraServices} more
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Reference {booking.booking_reference}
              </p>
            </div>
            {pill && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${pill.className}`}
              >
                <PillIcon className="w-3 h-3" />
                {pill.label}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {formatDateLong(booking.appointment_date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatTime(booking.appointment_time)}
            </span>
            {booking.location_name && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {booking.location_name}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-dashed border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {nairaFromKobo(booking.total_price_kobo)}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/booking/${booking.booking_reference}`}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12.5px] font-semibold text-[#7B2D8E] border border-[#7B2D8E]/20 hover:bg-[#7B2D8E]/5 transition-colors"
              >
                <Receipt className="w-3.5 h-3.5" />
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
