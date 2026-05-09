'use client'

/**
 * Admin booking detail
 *
 * The page admins land on after tapping a row on /admin/bookings.
 * Mirrors the layout of the complaint / consultation detail pages so
 * the admin surface feels consistent: a left "what happened" column
 * and a right "what to do about it" actions column.
 *
 * Actions exposed here:
 *   • Confirm a pending booking
 *   • Mark a confirmed booking as completed (rolls into lifetime
 *     spend)
 *   • Mark as no-show
 *   • Cancel with optional reason
 *   • Override payment status (for offline cash payments etc.)
 *   • Edit the staff-facing notes
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
  Wallet,
  StickyNote,
  Hash,
  Receipt,
  CreditCard,
  History,
  ShieldCheck,
  UserCog,
  Tag,
  Percent,
  Send,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/shared/notify'

interface AdminBookingDetail {
  id: string
  user_id: string | null
  user: {
    role: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    avatar_url: string | null
    created_at: string | null
    bookings_count: number
    total_spent_kobo: number
  }
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
  payment_reference: string | null
  /**
   * Verbatim gateway response on the most recent failed attempt
   * (e.g. "insufficient_funds", "card declined"). Surfaced in the
   * "Why didn't it pay?" card so admins can act without logging in
   * to Paystack.
   */
  payment_failure_reason: string | null
  payment_failure_at: string | null
  payment_attempts: number | null
  notes: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  completed_at: string | null
  created_at: string
  // Single primary assignment + optional explicit price override.
  // The price_override_kobo (if non-null) replaces the per-service
  // sum on receipts and reports.
  assigned_staff_id: string | null
  assigned_staff: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
  price_override_kobo: number | null
  price_override_reason: string | null
  services: Array<{
    categoryName: string
    treatmentName: string
    duration: number
    priceKobo: number
  }>
}

interface StaffOption {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'staff' | 'admin'
}

function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100)
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatLongDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

const STATUS_TONE: Record<AdminBookingDetail['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  completed: 'bg-[#7B2D8E] text-white ring-[#7B2D8E]',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  no_show: 'bg-gray-100 text-gray-700 ring-gray-300',
}

const PAYMENT_TONE: Record<AdminBookingDetail['payment_status'], string> = {
  unpaid: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  refunded: 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export default function AdminBookingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const notify = useNotify()

  const [booking, setBooking] = useState<AdminBookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  // Cancel sheet state — admins almost always want to capture WHY a
  // booking was cancelled (no-show? customer requested? double-booked?)
  // so we collect a reason inline instead of a one-tap confirm.
  const [showCancelSheet, setShowCancelSheet] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Notes editor — admins keep operational notes here (allergies,
  // special requests, "VIP — usually books with Franca"). Local-first
  // so typing is responsive; we only persist on Save.
  const [notes, setNotes] = useState('')
  const [notesDirty, setNotesDirty] = useState(false)

  // Staff roster (cached once per page load) for the assignment
  // dropdown and the "give access" picker.
  const [staffList, setStaffList] = useState<StaffOption[]>([])

  // Price override editor — local-first like notes so typing is
  // responsive; we persist on Save.
  const [overrideEnabled, setOverrideEnabled] = useState(false)
  const [overridePrice, setOverridePrice] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  const fetchBooking = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/bookings/${params.id}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to load')
      }
      const body = (await res.json()) as { booking: AdminBookingDetail }
      setBooking(body.booking)
      setNotes(body.booking.notes || '')
      setNotesDirty(false)
      // Sync the price override editor with whatever's persisted —
      // displayed in naira, kept in kobo internally.
      if (
        body.booking.price_override_kobo !== null &&
        body.booking.price_override_kobo !== undefined
      ) {
        setOverrideEnabled(true)
        setOverridePrice(
          String(Math.round(body.booking.price_override_kobo / 100)),
        )
        setOverrideReason(body.booking.price_override_reason ?? '')
      } else {
        setOverrideEnabled(false)
        setOverridePrice('')
        setOverrideReason('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  // Load the staff roster once for the assignment dropdown. We only
  // need id + name + role here, but the existing endpoint returns
  // the full record — that's fine, it's a small payload.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/staff', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (cancelled || !b?.staff) return
        setStaffList(
          (b.staff as StaffOption[]).filter(
            (s) => s.role === 'staff' || s.role === 'admin',
          ),
        )
      })
      .catch(() => {
        /* roster fetch is non-blocking */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Reminder state — drives the "Send recovery / rebook" actions in
  // the right column. We hold the last URL the API minted so the
  // admin can copy/paste it into WhatsApp if email isn't the right
  // channel for the customer (which happens often in NG).
  const [sendingReminder, setSendingReminder] =
    useState<null | 'recovery' | 'rebook'>(null)
  const [lastReminderUrl, setLastReminderUrl] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showRebookSheet, setShowRebookSheet] = useState(false)
  const [rebookMessage, setRebookMessage] = useState('')

  const sendReminder = useCallback(
    async (kind: 'recovery' | 'rebook', message?: string) => {
      if (!booking) return
      setSendingReminder(kind)
      try {
        const res = await fetch(
          `/api/admin/bookings/${booking.id}/remind`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, message }),
          },
        )
        const body = await res.json().catch(() => ({}))
        if (!res.ok || !body?.ok) {
          throw new Error(body?.error || 'Could not send reminder.')
        }
        const url = body.recoveryUrl || body.rebookUrl || null
        setLastReminderUrl(url)
        notify.success(
          kind === 'recovery'
            ? 'Recovery link sent to customer'
            : 'Rebook nudge sent to customer',
          url ? 'Copy the link below to share via WhatsApp.' : undefined,
        )
      } catch (err) {
        notify.error(
          'Could not send reminder',
          err instanceof Error ? err.message : 'Please try again.',
        )
      } finally {
        setSendingReminder(null)
      }
    },
    [booking, notify],
  )

  const copyReminderLink = useCallback(async () => {
    if (!lastReminderUrl) return
    try {
      await navigator.clipboard.writeText(lastReminderUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1500)
    } catch {
      /* clipboard unavailable — silent */
    }
  }, [lastReminderUrl])

  const patch = useCallback(
    async (
      payload: Record<string, unknown>,
      successMsg: string,
      successHint?: string,
    ) => {
      if (!booking) return
      setUpdating(true)
      try {
        const res = await fetch(`/api/admin/bookings/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(body?.error || 'Could not update booking.')
        }
        if (body?.booking) {
          setBooking(body.booking)
          setNotes(body.booking.notes || '')
          setNotesDirty(false)
        }
        notify.success(successMsg, successHint)
      } catch (err) {
        notify.error(
          'Could not update booking',
          err instanceof Error ? err.message : 'Please try again.',
        )
      } finally {
        setUpdating(false)
      }
    },
    [booking, notify],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 text-[#7B2D8E] animate-spin" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Unable to load booking
        </h2>
        <p className="text-sm text-gray-500 mb-4">{error || 'Unknown error'}</p>
        <button
          type="button"
          onClick={() => router.push('/admin/bookings')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to bookings
        </button>
      </div>
    )
  }

  const isTerminal =
    booking.status === 'completed' ||
    booking.status === 'cancelled' ||
    booking.status === 'no_show'

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Bookings
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-[#7B2D8E] font-semibold">
          {booking.booking_reference}
        </span>
      </div>

      {/* Hero card — premium redesign.
          Layout:
            • A 4px brand-purple top accent strip (the same motif we
              use on date-picker and voucher cards) so the page is
              clearly "ours" the moment it loads.
            • Inside: a 56px icon tile, a 3-line title block (date /
              time + duration + location), and a right-aligned total
              that reads as a hero statistic with the payment method
              just beneath in micro caps.
            • A bottom meta bar inside the same card that surfaces
              booking reference, customer name (with avatar bubble),
              and the assigned therapist as ribbons — admins want
              these three facts available without scrolling.
          The card itself sits on a subtle radial wash so it feels
          elevated without resorting to a heavy gradient or shadow. */}
      <section className="relative rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#7B2D8E] via-[#9B3DB0] to-[#7B2D8E]" aria-hidden="true" />
        <div className="absolute inset-x-0 top-1 h-32 bg-gradient-to-b from-[#7B2D8E]/[0.04] to-transparent pointer-events-none" aria-hidden="true" />
        <div className="relative px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ring-1',
                      STATUS_TONE[booking.status],
                    )}
                  >
                    {booking.status.replace('_', ' ')}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ring-1',
                      PAYMENT_TONE[booking.payment_status],
                    )}
                  >
                    {booking.payment_status}
                  </span>
                </div>
                <h1 className="mt-2 text-lg sm:text-xl font-semibold text-gray-900 tracking-tight leading-tight">
                  {formatLongDate(booking.appointment_date)}
                </h1>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  <span className="font-semibold text-gray-900">{booking.appointment_time}</span>
                  <span className="text-gray-400">·</span>
                  <span>{booking.total_duration} min</span>
                  <span className="text-gray-300 mx-1">|</span>
                  <MapPin className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  <span className="truncate">{booking.location_name}</span>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right flex-shrink-0 sm:pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Total charged
              </p>
              <p className="text-2xl sm:text-[26px] font-semibold text-[#7B2D8E] tabular-nums leading-tight mt-1">
                {formatNaira(booking.total_price_kobo)}
              </p>
              {booking.payment_method && (
                <p className="text-[10.5px] text-gray-500 mt-1 uppercase tracking-[0.12em] font-medium">
                  via {booking.payment_method}
                </p>
              )}
            </div>
          </div>

          {/* Meta strip — three small ribbons (reference, customer,
              therapist) inside the same card. Wraps gracefully on
              narrow screens. Each ribbon is its own pill so we can
              tone them differently if needed later. */}
          <div className="mt-4 -mx-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-2.5 py-1 text-[11.5px] text-gray-700">
              <Hash className="w-3 h-3 text-[#7B2D8E]" />
              <span className="font-mono font-semibold text-gray-900">
                {booking.booking_reference}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/20 bg-[#7B2D8E]/[0.04] px-2.5 py-1 text-[11.5px]">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[#7B2D8E] text-[9px] font-bold text-white">
                {(booking.customer_name || 'U').charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-gray-900 max-w-[160px] truncate">
                {booking.customer_name}
              </span>
            </span>
            {booking.assigned_staff && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/20 bg-[#7B2D8E]/10 px-2.5 py-1 text-[11.5px] text-[#7B2D8E]">
                <UserCog className="w-3 h-3" />
                <span className="font-medium">
                  with {booking.assigned_staff.first_name} {booking.assigned_staff.last_name?.charAt(0)}.
                </span>
              </span>
            )}
            {!booking.assigned_staff && !isTerminal && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11.5px] text-amber-800">
                <UserCog className="w-3 h-3" />
                <span className="font-medium">Unassigned</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Two-column body. On mobile they stack. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Services — styled as an itemized receipt.
              Each row gets a numbered chip on the left so admins
              can quickly count line items without losing place. The
              footer subtotals total minutes and total price as a
              proper receipt summary, and the full card sits inside
              a soft brand-tinted container that subtly evokes a
              till receipt. */}
          <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <header className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-[#7B2D8E]/[0.04] to-transparent">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#7B2D8E]" />
                Services
              </h2>
              <span className="text-[11px] font-medium text-gray-500">
                {booking.services.length} item{booking.services.length === 1 ? '' : 's'}
              </span>
            </header>
            <ul className="divide-y divide-gray-100">
              {booking.services.map((s, idx) => (
                <li
                  key={`${s.treatmentName}-${idx}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-[#7B2D8E]/[0.02] transition-colors"
                >
                  <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-[#7B2D8E]/10 text-[11px] font-semibold text-[#7B2D8E] tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {s.treatmentName}
                    </p>
                    <p className="text-[11.5px] text-gray-500 mt-0.5 inline-flex items-center gap-1.5">
                      <span>{s.categoryName}</span>
                      <span className="text-gray-300">·</span>
                      <Clock className="w-3 h-3" />
                      <span>{s.duration} min</span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {formatNaira(s.priceKobo)}
                  </p>
                </li>
              ))}
            </ul>
            <footer className="border-t border-dashed border-gray-200 bg-gray-50/60 px-5 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-600 inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                <span className="font-medium">{booking.total_duration} min</span> total
              </span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {formatNaira(
                  booking.services.reduce((sum, s) => sum + s.priceKobo, 0),
                )}
              </span>
            </footer>
          </section>

          {/* Customer card — premium redesign.
              The avatar grows to 56px and gets a brand-purple ring
              so the human comes first. Email + phone are now
              tap-targets (mailto:/tel:) styled as outlined chips
              that the admin can drag to a different app — much
              faster than copy/paste. The three meta ribbons (role,
              previous bookings, lifetime spend) sit below as
              tinted pills, and the "Open full profile" CTA is
              promoted to a full-width row at the bottom so it's
              hard to miss on small screens. */}
          <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <header className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-[#7B2D8E]/[0.04] to-transparent">
              <User className="w-4 h-4 text-[#7B2D8E]" />
              <h2 className="text-sm font-semibold text-gray-900">Client</h2>
            </header>
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                {/* Customer avatar — uses the uploaded portrait when
                    available, falls back to a flat brand-purple
                    initials tile. The drop-shadow was removed so
                    every card on the page reads with the same
                    weight (we lean on the hairline border + brand
                    strip for separation, not a hovering effect). */}
                {booking.user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={booking.user.avatar_url}
                    alt={booking.customer_name}
                    className="w-14 h-14 rounded-2xl object-cover ring-1 ring-[#7B2D8E]/15 bg-[#7B2D8E]/5 flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] text-white text-lg font-semibold flex items-center justify-center flex-shrink-0">
                    {(booking.customer_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {booking.customer_name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <a
                      href={`mailto:${booking.customer_email}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11.5px] text-gray-700 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors max-w-full"
                    >
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{booking.customer_email}</span>
                    </a>
                    <a
                      href={`tel:${booking.customer_phone}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11.5px] text-gray-700 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E] transition-colors"
                    >
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      {booking.customer_phone}
                    </a>
                    {booking.customer_phone && (
                      <a
                        href={`https://wa.me/${booking.customer_phone.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/20 bg-[#7B2D8E]/10 px-2.5 py-1 text-[11.5px] font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/15 transition-colors"
                      >
                        <Send className="w-3 h-3 flex-shrink-0" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Role
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-gray-900 capitalize inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#7B2D8E]" />
                    {booking.user.role || 'customer'}
                  </p>
                </div>
                <div className="rounded-xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.04] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E]/80">
                    Past visits
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-gray-900 inline-flex items-center gap-1">
                    <History className="w-3 h-3 text-[#7B2D8E]" />
                    {booking.user.bookings_count}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
                    Lifetime
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-emerald-800 inline-flex items-center gap-1 tabular-nums">
                    <Wallet className="w-3 h-3" />
                    {formatNaira(booking.user.total_spent_kobo)}
                  </p>
                </div>
              </div>
            </div>

            {booking.user_id && (
              <Link
                href={`/admin/users/${booking.user_id}`}
                className="group flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/60 hover:bg-[#7B2D8E]/5 transition-colors"
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#7B2D8E]">
                  <User className="w-3.5 h-3.5" />
                  Open full client profile
                </span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-[#7B2D8E] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-[#7B2D8E]" />
                Internal notes
              </h2>
              {notesDirty && (
                <span className="text-[11px] text-gray-500">Unsaved changes</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setNotesDirty(true)
              }}
              rows={4}
              placeholder="Allergies, special requests, follow-up needed…"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none resize-none"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={!notesDirty || updating}
                onClick={() => {
                  setNotes(booking.notes || '')
                  setNotesDirty(false)
                }}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 disabled:opacity-40"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={!notesDirty || updating}
                onClick={() =>
                  patch(
                    { action: 'set_notes', notes },
                    'Notes saved',
                    'Visible only to staff and admins.',
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Save notes'
                )}
              </button>
            </div>

            {booking.cancellation_reason && (
              <div className="mt-4 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                  Cancellation reason
                </p>
                <p className="text-sm text-rose-900 mt-0.5">
                  {booking.cancellation_reason}
                </p>
                {booking.cancelled_at && (
                  <p className="text-[11px] text-rose-700/80 mt-0.5">
                    {formatDateTime(booking.cancelled_at)}
                  </p>
                )}
              </div>
            )}

            {/* Payment failure card — shown when the latest payment
                attempt failed (Paystack webhook stamps these). Gives
                admins the verbatim gateway response so they don't
                have to log in to Paystack just to find out "card
                declined: insufficient funds". */}
            {booking.payment_failure_reason && booking.payment_status !== 'paid' && (
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 flex items-start gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                    Why payment didn&apos;t go through
                  </p>
                  <p className="text-sm text-amber-900 mt-0.5 break-words">
                    {booking.payment_failure_reason}
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {booking.payment_failure_at && (
                      <span>{formatDateTime(booking.payment_failure_at)}</span>
                    )}
                    {(booking.payment_attempts ?? 0) > 0 && (
                      <span>
                        &middot; {booking.payment_attempts}{' '}
                        {booking.payment_attempts === 1 ? 'attempt' : 'attempts'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right: actions */}
        <aside className="space-y-5">
          {/* Status actions — the "command centre".
              Header carries a brand accent dot so primary ops cards
              read distinct from informational cards (Timeline,
              Payment, etc.) below. */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#7B2D8E]" aria-hidden="true" />
              Manage booking
            </h2>
            <div className="space-y-2">
              {booking.status === 'pending' && (
                <ActionButton
                  icon={CheckCircle2}
                  label="Confirm booking"
                  hint="Locks the slot and notifies the customer"
                  hue="emerald"
                  disabled={updating}
                  onClick={() =>
                    patch(
                      { action: 'set_status', status: 'confirmed' },
                      'Booking confirmed',
                    )
                  }
                />
              )}
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <>
                  <ActionButton
                    icon={CheckCircle2}
                    label="Mark completed"
                    hint="Service rendered — counts toward lifetime spend"
                    hue="purple"
                    disabled={updating}
                    onClick={() =>
                      patch(
                        { action: 'set_status', status: 'completed' },
                        'Booking marked as completed',
                      )
                    }
                  />
                  <ActionButton
                    icon={XCircle}
                    label="Mark no-show"
                    hint="Customer didn't arrive"
                    hue="gray"
                    disabled={updating}
                    onClick={() => {
                      if (
                        confirm(
                          'Mark this appointment as a no-show? Slot remains used.',
                        )
                      ) {
                        patch(
                          { action: 'set_status', status: 'no_show' },
                          'Marked as no-show',
                        )
                      }
                    }}
                  />
                  <ActionButton
                    icon={Ban}
                    label="Cancel booking"
                    hint="Frees the slot — captures reason"
                    hue="rose"
                    disabled={updating}
                    onClick={() => {
                      setCancelReason('')
                      setShowCancelSheet(true)
                    }}
                  />
                </>
              )}

              {isTerminal && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-[12.5px] text-gray-600">
                  This booking is in a terminal state and can no longer be
                  modified. Need a new appointment? Reach out to the customer
                  to rebook.
                </div>
              )}
            </div>
          </section>

          {/* Customer outreach — recovery + rebook nudges.
              Surfaces the right CTA based on the booking state:
                * unpaid/failed/abandoned → "Send recovery link"
                  (mints a magic link straight back into Paystack
                  with the same line items).
                * cancelled / no-show → "Send rebook nudge"
                  (deep-links into the booking wizard with the
                  customer's services pre-populated).
              When neither applies (booking is paid + active or
              already completed) we hide this card entirely so the
              right column stays focused. */}
          {(() => {
            const canSendRecovery =
              !isTerminal && booking.payment_status !== 'paid'
            const canSendRebook =
              booking.status === 'cancelled' || booking.status === 'no_show'
            if (!canSendRecovery && !canSendRebook) return null
            return (
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#7B2D8E]" />
                  Customer outreach
                </h2>
                <p className="text-[11.5px] text-gray-500 mb-3 leading-relaxed">
                  {canSendRecovery
                    ? 'Send a one-tap link that resumes payment without re-picking the slot or services.'
                    : 'Cancelled? Nudge the customer with a deep-link straight into the booking wizard.'}
                </p>
                <div className="space-y-2">
                  {canSendRecovery && (
                    <ActionButton
                      icon={Send}
                      label={
                        sendingReminder === 'recovery'
                          ? 'Sending…'
                          : 'Send recovery link'
                      }
                      hint="Email + in-app notification with a magic link"
                      hue="purple"
                      disabled={sendingReminder !== null}
                      onClick={() => sendReminder('recovery')}
                    />
                  )}
                  {canSendRebook && (
                    <ActionButton
                      icon={Send}
                      label={
                        sendingReminder === 'rebook'
                          ? 'Sending…'
                          : 'Send rebook nudge'
                      }
                      hint="Pre-fills the wizard with their services"
                      hue="emerald"
                      disabled={sendingReminder !== null}
                      onClick={() => {
                        setRebookMessage('')
                        setShowRebookSheet(true)
                      }}
                    />
                  )}
                </div>

                {/* Last minted link — let admins copy it into
                    WhatsApp / SMS so they're not locked into email
                    delivery. */}
                {lastReminderUrl && (
                  <div className="mt-3 rounded-lg border border-[#7B2D8E]/20 bg-[#7B2D8E]/[0.04] px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B2D8E]">
                      Shareable link
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="block flex-1 truncate rounded bg-white px-2 py-1.5 text-[11.5px] font-mono text-gray-700 ring-1 ring-gray-200">
                        {lastReminderUrl}
                      </code>
                      <button
                        type="button"
                        onClick={copyReminderLink}
                        className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#5A1D6A]"
                      >
                        {linkCopied ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )
          })()}

          {/* Payment override */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#7B2D8E]" />
              Payment
            </h2>
            <p className="text-[11.5px] text-gray-500 mb-3 leading-relaxed">
              Use this to record offline payments or mark a refund. Online
              payments are reconciled automatically by the Paystack webhook.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['unpaid', 'paid', 'refunded', 'failed'] as const).map((p) => {
                const active = booking.payment_status === p
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={updating || active}
                    onClick={() => {
                      if (
                        confirm(
                          `Set payment status to "${p}"? This is logged in the activity trail.`,
                        )
                      ) {
                        patch(
                          { action: 'set_payment_status', payment_status: p },
                          `Payment marked as ${p}`,
                        )
                      }
                    }}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition-colors border',
                      active
                        ? 'border-transparent bg-[#7B2D8E] text-white'
                        : 'border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 disabled:opacity-50',
                    )}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
            {booking.payment_reference && (
              <p className="mt-3 text-[11px] font-mono text-gray-500 truncate">
                Ref: {booking.payment_reference}
              </p>
            )}
          </section>

          {/* Staff assignment — primary operator + extra view/edit
              access for collaborators. Picking a staff also auto-
              grants edit access via the staff_booking_access mirror
              and pings them so they see the booking on /staff. */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserCog className="w-4 h-4 text-[#7B2D8E]" />
              Assigned staff
            </h2>
            <p className="text-[11.5px] text-gray-500 mb-3 leading-relaxed">
              Pick the operator responsible. They&apos;ll see the booking
              under <span className="font-mono">/staff</span> and receive a
              real-time notification.
            </p>
            <div className="flex items-center gap-2">
              <select
                value={booking.assigned_staff_id ?? ''}
                disabled={updating || isTerminal}
                onChange={(e) => {
                  const next = e.target.value || null
                  if (next === booking.assigned_staff_id) return
                  patch(
                    { action: 'assign_staff', staff_id: next },
                    next ? 'Staff assigned' : 'Staff unassigned',
                    next
                      ? 'They were notified and can see this booking now.'
                      : undefined,
                  )
                }}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">— Unassigned —</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                    {s.role === 'admin' ? ' · admin' : ''}
                  </option>
                ))}
              </select>
            </div>
            {booking.assigned_staff && (
              <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold flex items-center justify-center">
                  {(booking.assigned_staff.first_name || '?')
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-gray-900 truncate">
                    {booking.assigned_staff.first_name}{' '}
                    {booking.assigned_staff.last_name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {booking.assigned_staff.email}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Price override — admins set a flat total when comping a
              service or applying a manual discount. Cleared by
              flipping the toggle off. */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#7B2D8E]" />
              Price &amp; discount
            </h2>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 mb-3 text-[11.5px] text-gray-600">
              <p className="flex items-center justify-between">
                <span>Sum of services</span>
                <span className="font-semibold tabular-nums text-gray-900">
                  {formatNaira(
                    booking.services.reduce((s, x) => s + x.priceKobo, 0),
                  )}
                </span>
              </p>
              <p className="flex items-center justify-between mt-1">
                <span>Charged total</span>
                <span className="font-semibold tabular-nums text-[#7B2D8E]">
                  {formatNaira(booking.total_price_kobo)}
                </span>
              </p>
            </div>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-[12.5px] font-medium text-gray-700 inline-flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#7B2D8E]" />
                Override the total
              </span>
              <input
                type="checkbox"
                checked={overrideEnabled}
                disabled={updating || isTerminal}
                onChange={(e) => setOverrideEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]/30"
              />
            </label>
            {overrideEnabled && (
              <div className="mt-3 space-y-2.5">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    New total (₦)
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.value)}
                    placeholder="e.g. 25000"
                    className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Reason (logged)
                  </span>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. VIP discount · Service comp"
                    maxLength={500}
                    className="mt-1 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none"
                  />
                </label>
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              {(booking.price_override_kobo !== null || overrideEnabled) && (
                <button
                  type="button"
                  disabled={updating || isTerminal}
                  onClick={() => {
                    if (!confirm('Save this price change?')) return
                    if (!overrideEnabled) {
                      patch(
                        {
                          action: 'set_price_override',
                          price_kobo: null,
                          reason: null,
                        },
                        'Price override cleared',
                      )
                      return
                    }
                    const naira = parseInt(overridePrice, 10)
                    if (!Number.isFinite(naira) || naira < 0) {
                      notify.error(
                        'Invalid amount',
                        'Enter a number greater than or equal to 0.',
                      )
                      return
                    }
                    patch(
                      {
                        action: 'set_price_override',
                        price_kobo: naira * 100,
                        reason: overrideReason.trim() || null,
                      },
                      'Price override saved',
                      'Customer was notified.',
                    )
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50"
                >
                  {updating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Save price'
                  )}
                </button>
              )}
            </div>
            {booking.price_override_reason && (
              <p className="mt-2 text-[11px] text-gray-500 italic">
                {booking.price_override_reason}
              </p>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-[#7B2D8E]" />
              Timeline
            </h2>
            <ol className="relative ml-3 border-l border-gray-200 space-y-3">
              <TimelineItem
                label="Booking created"
                time={booking.created_at}
                tone="purple"
              />
              {booking.payment_status === 'paid' && (
                <TimelineItem
                  label={`Payment received via ${booking.payment_method ?? 'unknown'}`}
                  time={booking.created_at}
                  tone="emerald"
                />
              )}
              {booking.completed_at && (
                <TimelineItem
                  label="Marked completed"
                  time={booking.completed_at}
                  tone="emerald"
                />
              )}
              {booking.cancelled_at && (
                <TimelineItem
                  label="Cancelled"
                  time={booking.cancelled_at}
                  tone="rose"
                />
              )}
            </ol>
          </section>
        </aside>
      </div>

      {/* Cancel sheet */}
      {showCancelSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCancelSheet(false)}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900">
              Cancel this booking?
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              The slot will be freed for other customers. The customer will be
              notified.
            </p>
            <label className="block mt-4 text-xs font-semibold text-gray-700">
              Reason (optional but recommended)
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Customer requested · Branch closed for the day · Double-booked …"
                className="mt-1 w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none resize-none"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelSheet(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900"
              >
                Keep booking
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={async () => {
                  await patch(
                    {
                      action: 'set_status',
                      status: 'cancelled',
                      reason: cancelReason.trim() || null,
                    },
                    'Booking cancelled',
                    'The slot has been freed.',
                  )
                  setShowCancelSheet(false)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  hint,
  hue,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint?: string
  hue: 'emerald' | 'purple' | 'rose' | 'gray'
  onClick: () => void
  disabled?: boolean
}) {
  const colorClasses =
    hue === 'emerald'
      ? 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700'
      : hue === 'rose'
        ? 'border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-700'
        : hue === 'gray'
          ? 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700'
          : 'border-[#7B2D8E]/20 hover:border-[#7B2D8E]/50 hover:bg-[#7B2D8E]/5 text-[#7B2D8E]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex items-start gap-3 w-full text-left rounded-lg border bg-white px-3 py-2.5 transition-colors disabled:opacity-50',
        colorClasses,
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{label}</p>
        {hint && (
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
            {hint}
          </p>
        )}
      </div>
    </button>
  )
}

function TimelineItem({
  label,
  time,
  tone,
}: {
  label: string
  time: string
  tone: 'purple' | 'emerald' | 'rose'
}) {
  const dotColor =
    tone === 'emerald'
      ? 'bg-emerald-500'
      : tone === 'rose'
        ? 'bg-rose-500'
        : 'bg-[#7B2D8E]'
  return (
    <li className="ml-4">
      <span
        className={cn(
          'absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full ring-2 ring-white',
          dotColor,
        )}
      />
      <p className="text-sm text-gray-900">{label}</p>
      <p className="text-[11px] text-gray-500">{formatDateTime(time)}</p>
    </li>
  )
}
