'use client'

/**
 * Admin bookings inbox.
 *
 * The booking surface admins land on from the sidebar. Designed to
 * feel like a dedicated booking-management product (Resy / Square
 * Appointments / Vagaro) rather than a CRUD list:
 *
 *   • Summary tiles at the top — Today / Upcoming / Pending / Unpaid /
 *     Lifetime revenue. Tapping a tile applies the matching filter so
 *     "Pending" reads as both a stat and a one-click triage queue.
 *   • Search + status / payment / location dropdowns live in a single
 *     toolbar so admins can narrow by any axis without leaving the
 *     page.
 *   • Each row is a tappable card-row — booking reference, customer,
 *     services, branch, time, money, status — and clicking opens the
 *     full detail page where the actions live.
 *
 * Polling cadence is 20s with `keepPreviousData` so the table doesn't
 * flicker between refreshes on a busy day.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { markSurfaceSeen } from '@/components/admin/sidebar'
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  ArrowUpRight,
  Wallet,
  Loader2,
  CalendarCheck2,
  CalendarClock,
  CircleAlert,
  CalendarX2,
  CheckCircle2,
  UserX,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminBooking {
  id: string
  user_id: string | null
  user_role: string | null
  user_avatar_url: string | null
  user_first_name: string | null
  user_last_name: string | null
  booking_reference: string
  location_id: string
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
  created_at: string
  services: Array<{ treatmentName: string; duration: number; priceKobo: number }>
}

interface AdminBookingsResponse {
  bookings: AdminBooking[]
  counts: {
    total: number
    pending: number
    upcoming: number
    today: number
    completed: number
    cancelled: number
    unpaid: number
    paidKobo: number
  }
  pagination: { page: number; limit: number; total: number }
}

interface LocationsResponse {
  locations: Array<{ id: string; name: string }>
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json()
  })

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100)
}

function formatDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function StatusPill({ status }: { status: AdminBooking['status'] }) {
  const styles =
    status === 'pending'
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : status === 'confirmed'
        ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/25'
        : status === 'completed'
          ? 'bg-[#7B2D8E] text-white ring-[#7B2D8E]'
          : status === 'cancelled'
            ? 'bg-rose-50 text-rose-700 ring-rose-200'
            : 'bg-gray-100 text-gray-700 ring-gray-200'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1',
        styles,
      )}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function PaymentPill({ status }: { status: AdminBooking['payment_status'] }) {
  const styles =
    status === 'paid'
      ? 'text-[#7B2D8E] bg-[#7B2D8E]/10 ring-[#7B2D8E]/20'
      : status === 'refunded'
        ? 'text-[#5A1D6A] bg-[#5A1D6A]/10 ring-[#5A1D6A]/20'
        : status === 'failed'
          ? 'text-rose-700 bg-rose-50 ring-rose-200'
          : 'text-amber-700 bg-amber-50 ring-amber-200'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1',
        styles,
      )}
    >
      {status}
    </span>
  )
}

function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
  isActive,
  onClick,
  hue = 'purple',
}: {
  label: string
  value: string | number
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  onClick: () => void
  hue?: 'purple' | 'amber' | 'emerald' | 'gray'
}) {
  const tone =
    hue === 'amber'
      ? 'text-amber-600'
      : hue === 'emerald'
        ? 'text-[#7B2D8E]'
        : hue === 'gray'
          ? 'text-gray-700'
          : 'text-[#7B2D8E]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border bg-white px-4 py-3 transition-colors w-full',
        isActive
          ? 'border-[#7B2D8E] ring-1 ring-[#7B2D8E]/30'
          : 'border-gray-200 hover:border-[#7B2D8E]/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          {label}
        </p>
        <Icon className={cn('w-4 h-4', tone)} />
      </div>
      <p className={cn('mt-1.5 text-2xl font-semibold tabular-nums', tone)}>
        {value}
      </p>
      {hint && (
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</p>
      )}
    </button>
  )
}

export default function AdminBookingsPage() {
  // Filters live in local state (not URL search params) because the
  // page is a triage surface — admins flip filters frequently and we
  // don't want every flip to leave a back-button trail. Deep-linking
  // a row is handled by /admin/bookings/[id] itself.
  const [when, setWhen] = useState<'all' | 'upcoming' | 'today' | 'past'>('upcoming')
  const [status, setStatus] = useState('')
  const [payment, setPayment] = useState('')
  const [location, setLocation] = useState('')
  const [search, setSearch] = useState('')

  // Debounced mirror of `search`. SWR keys off this so we don't hit
  // /api/admin/bookings on every keystroke — empty string is treated
  // as "no filter" instantly so deleting clears immediately.
  const [searchDebounced, setSearchDebounced] = useState('')
  useEffect(() => {
    if (!search.trim()) {
      setSearchDebounced('')
      return
    }
    const t = setTimeout(() => setSearchDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const params = new URLSearchParams()
  if (when !== 'all') params.set('when', when)
  if (status) params.set('status', status)
  if (payment) params.set('payment', payment)
  if (location) params.set('location', location)
  if (searchDebounced) params.set('q', searchDebounced)
  params.set('limit', '50')

  const { data, isLoading } = useSWR<AdminBookingsResponse>(
    `/api/admin/bookings?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 20000,
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  )

  const { data: locationsData } = useSWR<LocationsResponse>(
    '/api/bookings/locations',
    fetcher,
  )
  const locations = locationsData?.locations ?? []

  const counts = data?.counts
  const bookings = data?.bookings ?? []

  // Clear the sidebar Bookings badge once we land on the page —
  // Google / Vercel-style baseline. We snapshot the `pending` count
  // (paid but unconfirmed) because that's the number the sidebar
  // displays. Re-runs whenever the count changes so the badge stays
  // in sync as new bookings arrive in the background.
  useEffect(() => {
    const pending = counts?.pending ?? 0
    markSurfaceSeen('bookings', pending)
  }, [counts?.pending])

  // Derive the filter-applied label so the toolbar always reflects
  // exactly which slice the table is showing right now.
  const activeFiltersCount =
    (status ? 1 : 0) + (payment ? 1 : 0) + (location ? 1 : 0)

  return (
    <div className="space-y-5">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7B2D8E]" />
            Bookings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Every appointment across every branch — confirm, complete, or
            cancel without leaving the page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/bookings?when=today"
            onClick={(e) => {
              e.preventDefault()
              setWhen('today')
              setStatus('')
              setPayment('')
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#7B2D8E]/20 bg-[#7B2D8E]/5 px-3 py-1.5 text-xs font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Jump to today
          </Link>
        </div>
      </header>

      {/* Summary tiles — tap to apply filter */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryTile
          label="Today"
          value={counts?.today ?? 0}
          hint={`Across ${locations.length || '—'} branches`}
          icon={CalendarClock}
          isActive={when === 'today'}
          onClick={() => {
            setWhen('today')
            setStatus('')
          }}
        />
        <SummaryTile
          label="Upcoming"
          value={counts?.upcoming ?? 0}
          icon={CalendarCheck2}
          hue="emerald"
          isActive={when === 'upcoming' && status === '' && payment === ''}
          onClick={() => {
            setWhen('upcoming')
            setStatus('')
            setPayment('')
          }}
        />
        <SummaryTile
          label="Pending"
          value={counts?.pending ?? 0}
          hint="Awaiting confirmation"
          icon={CircleAlert}
          hue="amber"
          isActive={status === 'pending'}
          onClick={() => {
            setWhen('all')
            setStatus('pending')
          }}
        />
        <SummaryTile
          label="Unpaid"
          value={counts?.unpaid ?? 0}
          hint="Pending or confirmed without payment"
          icon={Wallet}
          hue="amber"
          isActive={payment === 'unpaid'}
          onClick={() => {
            setWhen('all')
            setPayment('unpaid')
          }}
        />
        <SummaryTile
          label="Lifetime revenue"
          value={formatNaira(counts?.paidKobo ?? 0)}
          hint="From paid bookings"
          icon={CheckCircle2}
          hue="purple"
          isActive={false}
          onClick={() => {
            setWhen('all')
            setPayment('paid')
          }}
        />
      </div>

      {/* Toolbar — search on top, filters wrap below on mobile */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
        {/* Search row — debounced input that hits the new server-side
            search covering name / email / phone / reference / notes /
            branch / payment ref. The clear (×) button resets the
            query in one tap, which the prior version was missing. */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          {/* We deliberately use type="text" rather than type="search"
              here. WebKit (Safari, Chrome on iOS, and even desktop
              Chrome on focus) renders a built-in clear button on
              type="search" inputs in the browser's accent colour
              (which shows up as a small blue/red X) — combined with
              our own ×-button on the right, that produced two clear
              icons sitting on top of each other and broke the brand
              palette. Switching to type="text" gives us full control
              of the clear control and keeps the field on-brand.
              `inputMode="search"` still surfaces the search keyboard
              on mobile and `enterKeyHint="search"` keeps the magnifier
              return key, so we lose nothing from the UX side. */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, DS-ID, notes…"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-gray-50 rounded-lg ring-1 ring-gray-200 focus:ring-2 focus:ring-[#7B2D8E] focus:bg-white focus:outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <span className="text-base leading-none">×</span>
            </button>
          )}
        </div>

        {/* Filters row — uses CSS grid on mobile for 2-col layout,
            flex-wrap on larger screens */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <FilterSelect
            value={when}
            onChange={(v) => setWhen(v as typeof when)}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'today', label: 'Today' },
              { value: 'past', label: 'Past' },
              { value: 'all', label: 'All time' },
            ]}
            ariaLabel="Time range"
          />
          <FilterSelect
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'no_show', label: 'No-show' },
            ]}
            ariaLabel="Status"
          />
          <FilterSelect
            value={payment}
            onChange={setPayment}
            options={[
              { value: '', label: 'All payments' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'paid', label: 'Paid' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'failed', label: 'Failed' },
            ]}
            ariaLabel="Payment"
          />
          <FilterSelect
            value={location}
            onChange={setLocation}
            options={[
              { value: '', label: 'All branches' },
              ...locations.map((l) => ({ value: l.id, label: l.name })),
            ]}
            ariaLabel="Location"
          />
          {(activeFiltersCount > 0 || when !== 'upcoming') && (
            <button
              type="button"
              onClick={() => {
                setWhen('upcoming')
                setStatus('')
                setPayment('')
                setLocation('')
                setSearch('')
              }}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[#7B2D8E] hover:text-[#5A1D6A] px-2 py-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Bookings list — card layout on mobile, table on desktop.
          Mobile-first: cards stack vertically and are fully tappable.
          md+ breakpoint switches to the full table for power users
          with wide screens. */}

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading && bookings.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-gray-500 py-12">
            <CalendarX2 className="w-6 h-6 text-gray-300" />
            <p className="text-sm font-medium text-gray-900">
              No bookings match your filters
            </p>
            <p className="text-xs">
              Try widening the time range or clearing the filters.
            </p>
          </div>
        ) : (
          bookings.map((b) => <BookingCard key={b.id} booking={b} />)
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10.5px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Booking</th>
                <th className="text-left font-semibold px-3 py-3">Customer</th>
                <th className="text-left font-semibold px-3 py-3">Services</th>
                <th className="text-left font-semibold px-3 py-3">Branch</th>
                <th className="text-left font-semibold px-3 py-3">When</th>
                <th className="text-right font-semibold px-3 py-3">Total</th>
                <th className="text-left font-semibold px-3 py-3">Status</th>
                <th className="text-right font-semibold px-4 py-3 sr-only">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="inline h-5 w-5 animate-spin text-[#7B2D8E]" />
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <CalendarX2 className="w-6 h-6 text-gray-300" />
                      <p className="text-sm font-medium text-gray-900">
                        No bookings match your filters
                      </p>
                      <p className="text-xs">
                        Try widening the time range or clearing the filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/**
 * Mobile card layout — fully tappable, shows the most important info
 * (reference, customer, datetime, status, total) in a compact stack.
 * Used below md breakpoint where the table would require horizontal
 * scrolling and feel cramped.
 */
function BookingCard({ booking: b }: { booking: AdminBooking }) {
  return (
    <Link
      href={`/admin/bookings/${b.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-[#7B2D8E]/40 transition-colors"
    >
      {/* Top row: reference + status */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-mono text-xs font-semibold text-[#7B2D8E]">
            {b.booking_reference}
          </p>
          {/* "Guest" pill — surfaces anonymous bookings (no user_id)
              so admins can spot walk-ins / non-account holders at a
              glance and can't accidentally promise things that
              require a customer profile (wallet credit, history, …). */}
          {!b.user_id && <GuestPill />}
        </div>
        <StatusPill status={b.status} />
      </div>

      {/* Customer */}
      <div className="flex items-center gap-2.5 mb-3">
        <CustomerAvatar booking={b} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {b.customer_name}
          </p>
          <p className="text-xs text-gray-500 truncate">{b.customer_email}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-gray-500">When</p>
          <p className="font-medium text-gray-900">
            {formatDate(b.appointment_date)} · {b.appointment_time}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Branch</p>
          <p className="font-medium text-gray-900 truncate">{b.location_name}</p>
        </div>
        <div>
          <p className="text-gray-500">Total</p>
          <p className="font-semibold text-gray-900 tabular-nums">
            {formatNaira(b.total_price_kobo)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Payment</p>
          <PaymentPill status={b.payment_status} />
        </div>
      </div>

      {/* Services preview */}
      {b.services.length > 0 && (
        <p className="mt-3 text-xs text-gray-500 truncate">
          {b.services.length === 1
            ? b.services[0].treatmentName
            : `${b.services[0].treatmentName} + ${b.services.length - 1} more`}
        </p>
      )}
    </Link>
  )
}

function BookingRow({ booking: b }: { booking: AdminBooking }) {
  const customerInitial = (b.customer_name || b.customer_email || 'U')
    .charAt(0)
    .toUpperCase()
  const serviceCount = b.services.length
  const summary = useMemo(() => {
    if (!b.services.length) return '—'
    const first = b.services[0].treatmentName
    return serviceCount > 1
      ? `${first} + ${serviceCount - 1} more`
      : first
  }, [b.services, serviceCount])

  return (
    <tr className="hover:bg-[#7B2D8E]/[0.02] transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/admin/bookings/${b.id}`}
          className="block group min-w-0"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-mono text-[12px] font-semibold text-[#7B2D8E] group-hover:underline">
              {b.booking_reference}
            </p>
            {!b.user_id && <GuestPill />}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            Created{' '}
            {new Date(b.created_at).toLocaleDateString('en-NG', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </Link>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-semibold flex items-center justify-center ring-1 ring-[#7B2D8E]/20 flex-shrink-0">
            {customerInitial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {b.customer_name}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {b.customer_email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 max-w-[260px]">
        <p className="text-sm text-gray-700 truncate">{summary}</p>
        <p className="text-[11px] text-gray-500">
          {b.total_duration} min · {serviceCount} item{serviceCount === 1 ? '' : 's'}
        </p>
      </td>
      <td className="px-3 py-3">
        <p className="text-sm text-gray-700 inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          {b.location_name}
        </p>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <p className="text-sm text-gray-900">{formatDate(b.appointment_date)}</p>
        <p className="text-[11px] text-gray-500">{b.appointment_time}</p>
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <p className="text-sm font-semibold text-gray-900 tabular-nums">
          {formatNaira(b.total_price_kobo)}
        </p>
        <div className="mt-1 flex justify-end">
          <PaymentPill status={b.payment_status} />
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <StatusPill status={b.status} />
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Link
          href={`/admin/bookings/${b.id}`}
          className="inline-flex items-center gap-1 text-[#7B2D8E] hover:text-[#5A1D6A] text-xs font-semibold"
        >
          Open
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </td>
    </tr>
  )
}

/**
 * Pill shown on rows / cards where `user_id IS NULL` — i.e. the booking
 * was placed without an account. We use a soft amber tint (not brand
 * purple) so it visually separates from the brand chrome and instantly
 * reads as "heads-up, this is not a regular customer profile". UserX
 * is the icon-of-choice in lucide for "no associated user".
 */
/**
 * Customer avatar — renders the uploaded / role-default portrait when
 * the API resolves one (`user_avatar_url`), otherwise falls back to a
 * flat brand-purple initials tile. Shared by the mobile card and the
 * desktop row so both surfaces show the same face. The image swaps to
 * the initials tile on load error so a broken URL never leaves a blank
 * circle.
 */
function CustomerAvatar({
  booking: b,
  size,
}: {
  booking: AdminBooking
  size: 'sm' | 'md'
}) {
  const [failed, setFailed] = useState(false)
  const initial = (b.customer_name || b.customer_email || 'U')
    .charAt(0)
    .toUpperCase()
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'

  if (b.user_avatar_url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={b.user_avatar_url}
        alt={b.customer_name || 'Customer'}
        onError={() => setFailed(true)}
        className={cn(
          'rounded-full object-cover ring-1 ring-[#7B2D8E]/20 bg-[#7B2D8E]/5 flex-shrink-0',
          dim,
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] font-semibold flex items-center justify-center ring-1 ring-[#7B2D8E]/20 flex-shrink-0',
        dim,
      )}
    >
      {initial}
    </div>
  )
}

function GuestPill() {
  return (
    <span
      title="Anonymous booking — no customer account is linked to this row."
      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
    >
      <UserX className="w-3 h-3" />
      Guest
    </span>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  ariaLabel: string
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs font-medium bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-700 hover:border-[#7B2D8E]/40 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
