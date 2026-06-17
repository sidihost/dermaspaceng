"use client"

/**
 * Staff › Appointment detail
 *
 * Read-mostly view of a single booking the staff member is allowed
 * to see. If their access row in `staff_booking_access` carries
 * `can_edit = true` (or they're admin), they get the same status-
 * change controls the admin booking page exposes. Otherwise it's a
 * polished read-only profile so they can prepare for the visit.
 *
 * Visual rules are inherited from the staff dashboard: single
 * brand-purple, hairline borders, no gradients, no sparkle icons.
 */

import * as React from "react"
import { use as usePromise } from "react"
import Link from "next/link"
import useSWR, { mutate } from "swr"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  Wallet,
  StickyNote,
  Receipt,
  ShieldCheck,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquareQuote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotify } from "@/components/shared/notify"

interface StaffReview {
  rating: number
  cleanlinessRating: number | null
  staffRating: number | null
  valueRating: number | null
  body: string | null
  wouldRecommend: boolean | null
  createdAt: string
  updatedAt: string
}

interface StaffBooking {
  id: string
  booking_reference: string
  appointment_date: string
  appointment_time: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  customer_avatar_url: string | null
  location_name: string
  status: string
  payment_status: string
  total_price_kobo: number
  notes: string | null
  can_edit: boolean
  access_role: "assigned" | "granted"
  services: Array<{
    categoryName: string | null
    treatmentName: string
    duration: number
    priceKobo: number
  }>
  review: StaffReview | null
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error("Failed to load")
    return r.json()
  })

function formatNaira(kobo: number): string {
  return `NGN ${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-NG", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function StaffAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = usePromise(params)
  const router = useRouter()
  const notify = useNotify()
  const { data, error, isLoading } = useSWR<{ booking: StaffBooking }>(
    `/api/staff/appointments/${id}`,
    fetcher,
    { revalidateOnFocus: false },
  )
  const [updating, setUpdating] = React.useState(false)

  const booking = data?.booking

  async function patch(action: string, payload: Record<string, unknown> = {}) {
    if (!booking) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/staff/appointments/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      })
      const body = await res.json()
      if (!res.ok) {
        notify.error("Could not update", body.error || "Try again.")
        return
      }
      await mutate(`/api/staff/appointments/${booking.id}`)
      notify.success("Saved", "Booking updated.")
    } finally {
      setUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Link
          href="/staff/appointments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7B2D8E]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to appointments
        </Link>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-900">
          We couldn&apos;t load this booking. It may have been moved or
          you might not have access.
        </div>
      </div>
    )
  }

  const isTerminal =
    booking.status === "completed" ||
    booking.status === "cancelled" ||
    booking.status === "no_show"

  return (
    <div className="space-y-5">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Hero — booking reference, appointment headline, status pill */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#7B2D8E]" aria-hidden />
        <div className="flex items-start gap-4">
          {/* Real customer avatar — falls back to brand-purple initials
              for walk-ins or seeded accounts that haven't picked a
              portrait yet. */}
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7B2D8E]/10 text-base font-bold uppercase text-[#7B2D8E] ring-1 ring-[#7B2D8E]/15">
            {booking.customer_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={booking.customer_avatar_url}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
              />
            ) : (
              (booking.customer_name || "?")
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase() || "?"
            )}
          </span>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" aria-hidden />
              Appointment
              <span className="font-mono text-gray-400 normal-case tracking-normal">
                · {booking.booking_reference}
              </span>
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
              {booking.customer_name}
            </h1>
            <p className="text-sm text-gray-500">
              {formatLongDate(booking.appointment_date)} · {booking.appointment_time}
            </p>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1 ${
                  booking.status === "confirmed"
                    ? "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/25"
                    : booking.status === "completed"
                      ? "bg-[#7B2D8E] text-white ring-[#7B2D8E]"
                      : booking.status === "cancelled" || booking.status === "no_show"
                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                }`}
              >
                {booking.status}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1 ${
                  booking.payment_status === "paid"
                    ? "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/25"
                    : "bg-gray-50 text-gray-600 ring-gray-200"
                }`}
              >
                {booking.payment_status}
              </span>
              {booking.access_role === "granted" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider">
                  shared
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Customer */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-[#7B2D8E]" />
              Customer
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field icon={<User className="w-4 h-4" />} label="Name" value={booking.customer_name} />
              <Field
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={booking.customer_email ?? "—"}
              />
              <Field
                icon={<Phone className="w-4 h-4" />}
                label="Phone"
                value={booking.customer_phone ?? "—"}
              />
              <Field
                icon={<MapPin className="w-4 h-4" />}
                label="Location"
                value={booking.location_name}
              />
            </div>
          </section>

          {/* Services */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#7B2D8E]" />
              Services
            </h2>
            <ul className="divide-y divide-gray-100">
              {booking.services.map((s, i) => (
                <li key={i} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.treatmentName}
                    </p>
                    <p className="text-[11.5px] text-gray-500">
                      {s.categoryName || "Service"} · {s.duration} min
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-gray-900 flex-shrink-0">
                    {formatNaira(s.priceKobo)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Total
              </span>
              <span className="text-base font-bold tabular-nums text-[#7B2D8E]">
                {formatNaira(booking.total_price_kobo)}
              </span>
            </div>
          </section>

          {/* Notes */}
          {booking.notes && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-[#7B2D8E]" />
                Notes
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {booking.notes}
              </p>
            </section>
          )}

          {/* Customer review — only present once the customer has
              actually submitted feedback through the receipt page. The
              card stays read-only on the staff side; we don't allow
              editing customer reviews here. */}
          {booking.review ? (
            <CustomerReviewCard review={booking.review} />
          ) : booking.status === "completed" ? (
            <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-[#7B2D8E]" />
                Customer review
              </h2>
              <p className="text-[12.5px] text-gray-500 leading-relaxed">
                The customer hasn&apos;t left a review yet. They can do
                so any time from their booking receipt.
              </p>
            </section>
          ) : null}
        </div>

        {/* Right column — actions */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#7B2D8E]" />
              {booking.can_edit ? "Status" : "Access"}
            </h2>
            <p className="text-[11.5px] text-gray-500 mb-3 leading-relaxed">
              {booking.can_edit
                ? "Update the appointment status. The customer is notified instantly."
                : "You have view-only access to this booking. Ask an admin for edit rights to change the status."}
            </p>

            {!booking.can_edit ? (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-[12.5px] text-gray-600">
                Read-only — you can prepare for the visit but cannot change
                status, payment or notes.
              </div>
            ) : isTerminal ? (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-[12.5px] text-gray-600">
                This booking is finalised and locked. Contact an admin if you
                need to reopen it.
              </div>
            ) : (
              <div className="grid gap-2">
                {booking.status !== "confirmed" && (
                  <Button
                    onClick={() => patch("set_status", { status: "confirmed" })}
                    disabled={updating}
                    className="w-full justify-start gap-2 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark confirmed
                  </Button>
                )}
                <Button
                  onClick={() => patch("set_status", { status: "completed" })}
                  disabled={updating}
                  className="w-full justify-start gap-2 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark completed
                </Button>
                <Button
                  onClick={() => {
                    if (!confirm("Mark as no-show?")) return
                    patch("set_status", { status: "no_show" })
                  }}
                  disabled={updating}
                  variant="outline"
                  className="w-full justify-start gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <Ban className="w-4 h-4" />
                  Mark no-show
                </Button>
                <Button
                  onClick={() => {
                    const reason = prompt("Cancellation reason (optional)") || ""
                    if (!confirm("Cancel this booking?")) return
                    patch("set_status", { status: "cancelled", reason })
                  }}
                  disabled={updating}
                  variant="outline"
                  className="w-full justify-start gap-2 border-rose-300 text-rose-800 hover:bg-rose-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel booking
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#7B2D8E]" />
              Payment
            </h2>
            <p className="text-[11.5px] text-gray-500 mb-2">Current status</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              {booking.payment_status}
            </p>
            <p className="mt-2 text-[11.5px] text-gray-500">Total charged</p>
            <p className="text-base font-bold tabular-nums text-[#7B2D8E]">
              {formatNaira(booking.total_price_kobo)}
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#7B2D8E]" />
              When
            </h2>
            <Field
              icon={<Calendar className="w-4 h-4" />}
              label="Date"
              value={formatLongDate(booking.appointment_date)}
            />
            <div className="h-2" />
            <Field
              icon={<Clock className="w-4 h-4" />}
              label="Time"
              value={booking.appointment_time}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

function StaticStars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${dim} ${
            n <= value
              ? "fill-primary text-primary"
              : "fill-gray-100 text-gray-300"
          }`}
        />
      ))}
    </span>
  )
}

function FacetSummary({
  label,
  value,
}: {
  label: string
  value: number | null
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-[#FBF9FC] px-3 py-2 text-center">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-center">
        {value ? (
          <StaticStars value={value} size="sm" />
        ) : (
          <span className="text-[11px] text-gray-400">—</span>
        )}
      </div>
    </div>
  )
}

function CustomerReviewCard({ review }: { review: StaffReview }) {
  const submitted = new Date(review.createdAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-[#7B2D8E]" />
            Customer review
          </h2>
          <p className="mt-0.5 text-[11.5px] text-gray-500">
            Submitted {submitted}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StaticStars value={review.rating} />
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {review.rating}.0
          </span>
        </div>
      </header>

      {(review.cleanlinessRating ||
        review.staffRating ||
        review.valueRating) && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FacetSummary label="Cleanliness" value={review.cleanlinessRating} />
          <FacetSummary label="Our team" value={review.staffRating} />
          <FacetSummary label="Value" value={review.valueRating} />
        </div>
      )}

      {review.body && (
        <blockquote className="mt-3 rounded-xl bg-[#FBF9FC] border border-gray-100 p-3 text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
          {review.body}
        </blockquote>
      )}

      {review.wouldRecommend !== null && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium">
          {review.wouldRecommend ? (
            <>
              <ThumbsUp className="h-3.5 w-3.5 text-[#7B2D8E]" />
              <span className="text-[#7B2D8E]">Would recommend us</span>
            </>
          ) : (
            <>
              <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
              <span className="text-rose-700">Would not recommend</span>
            </>
          )}
        </p>
      )}
    </section>
  )
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <p className="text-[13px] font-medium text-gray-900 break-words">
          {value}
        </p>
      </div>
    </div>
  )
}
