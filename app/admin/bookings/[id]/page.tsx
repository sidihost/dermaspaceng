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
  notes: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  completed_at: string | null
  created_at: string
  services: Array<{
    categoryName: string
    treatmentName: string
    duration: number
    priceKobo: number
  }>
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

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

      {/* Header card */}
      <section className="rounded-2xl border border-gray-200 bg-white px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">
                  {formatLongDate(booking.appointment_date)}
                </h1>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1',
                    STATUS_TONE[booking.status],
                  )}
                >
                  {booking.status.replace('_', ' ')}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1',
                    PAYMENT_TONE[booking.payment_status],
                  )}
                >
                  {booking.payment_status}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {booking.appointment_time} · {booking.total_duration} min
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {booking.location_name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  {booking.booking_reference}
                </span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right flex-shrink-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Total
            </p>
            <p className="text-2xl font-semibold text-[#7B2D8E] tabular-nums mt-0.5">
              {formatNaira(booking.total_price_kobo)}
            </p>
            {booking.payment_method && (
              <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-wider">
                via {booking.payment_method}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Two-column body. On mobile they stack. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Services */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#7B2D8E]" />
              Services
            </h2>
            <div className="divide-y divide-gray-100">
              {booking.services.map((s, idx) => (
                <div
                  key={`${s.treatmentName}-${idx}`}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.treatmentName}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {s.categoryName} · {s.duration} min
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatNaira(s.priceKobo)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Customer + booking metadata */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#7B2D8E]" />
              Customer
            </h2>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {(booking.customer_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-gray-900 truncate">
                  {booking.customer_name}
                </p>
                <div className="mt-1 space-y-1 text-sm text-gray-500">
                  <p className="inline-flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    {booking.customer_email}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    {booking.customer_phone}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    <ShieldCheck className="w-3 h-3" />
                    {booking.user.role || 'customer'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
                    <History className="w-3 h-3" />
                    {booking.user.bookings_count} previous
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    <Wallet className="w-3 h-3" />
                    {formatNaira(booking.user.total_spent_kobo)} lifetime
                  </span>
                </div>
              </div>
            </div>

            {booking.user_id && (
              <div className="mt-4">
                <Link
                  href={`/admin/users/${booking.user_id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:text-[#5A1D6A]"
                >
                  Open full customer profile
                  <ArrowLeft className="w-3 h-3 rotate-180" />
                </Link>
              </div>
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
          </section>
        </div>

        {/* Right: actions */}
        <aside className="space-y-5">
          {/* Status actions */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
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
