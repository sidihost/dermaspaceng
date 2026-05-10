'use client'

/**
 * <BookingJourneyTracker />
 * --------------------------------------------------------------
 * Uber-/DoorDash-style horizontal progress strip that lives at the
 * top of the booking receipt page so customers can see, at a
 * glance, exactly where their visit is in the lifecycle:
 *
 *     Booked  →  Confirmed  →  Treatment day  →  Completed  →  Rated
 *
 * The component is purely presentational — it derives every piece
 * of state from the booking row (`status`, `payment_status`, the
 * appointment date) and a single optional `hasReview` boolean, so
 * the receipt page can keep all of its data-fetching in one place.
 *
 * Visual language
 * ---------------
 *   • One brand colour (#7B2D8E) for the active rail + node, neutral
 *     gray for upcoming steps, emerald for the final "completed" tick
 *     once the visit is done. No gradients, no Sparkles / Zap icons.
 *   • Each step has a circular icon node, a short label, and a tiny
 *     timestamp / hint underneath that updates contextually
 *     (e.g. "in 3 days", "today", "moments ago").
 *   • The connecting rails use a subtle inset shadow + a fill bar
 *     that animates left-to-right when a step advances — same
 *     "trip is moving" affordance as ride-hailing apps.
 *   • Cancelled / no-show paths short-circuit the tracker into a
 *     compact "this booking won't happen" banner so we never
 *     mislead the customer with a phantom "completed" tick.
 */

import * as React from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Star,
  Stethoscope,
  XCircle,
} from 'lucide-react'

type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed'

interface Props {
  status: BookingStatus
  paymentStatus: PaymentStatus
  /** ISO date string, e.g. "2025-06-14" — appointment day. */
  appointmentDate: string
  /** "HH:MM[:SS]" — appointment time of day. */
  appointmentTime: string
  /** True once the customer has submitted a review for this booking. */
  hasReview?: boolean
  /** ISO timestamp the booking was created. Drives the "Booked" hint. */
  createdAt?: string | null
  /** ISO timestamp the booking was confirmed (paid). */
  confirmedAt?: string | null
  /** ISO timestamp the visit was completed. */
  completedAt?: string | null
}

interface Step {
  key: 'booked' | 'confirmed' | 'visit' | 'completed' | 'rated'
  label: string
  Icon: React.ComponentType<{ className?: string }>
  hint: string
  state: 'done' | 'active' | 'upcoming'
}

/**
 * Tiny relative-time helper. Keeps the component self-contained
 * instead of pulling in date-fns/dayjs just for the tracker hints.
 * Returns short strings like "today", "in 3 days", "2 days ago".
 */
function relativeDay(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime()
  const days = Math.round(ms / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 1 && days <= 14) return `in ${days} days`
  if (days < -1 && days >= -14) return `${Math.abs(days)} days ago`
  return target.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function BookingJourneyTracker({
  status,
  paymentStatus,
  appointmentDate,
  appointmentTime,
  hasReview = false,
  createdAt,
  confirmedAt,
  completedAt,
}: Props) {
  // Cancelled / no-show short-circuit. Drawing a half-finished
  // tracker for a booking that's never going to happen would feel
  // dishonest, so we render a single "voided" pill instead.
  if (status === 'cancelled' || status === 'no_show') {
    // Branded "voided" banner — soft purple tint instead of the
    // alarming red. A cancellation is a neutral state change, not
    // an error, so we lean on the brand colour with a muted
    // background so it reads calm and on-brand. The icon tile uses
    // a darker brand fill to give the row a clear focal point
    // without shouting.
    return (
      <div
        className="mb-4 flex items-center gap-3 rounded-2xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.06] px-4 py-3 print:hidden"
        role="status"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20">
          <XCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-[#5A1D6A]">
            {status === 'cancelled'
              ? 'This booking was cancelled.'
              : 'You didn\u2019t make it to this appointment.'}
          </p>
          <p className="mt-0.5 text-[11.5px] text-[#7B2D8E]/80">
            {paymentStatus === 'refunded'
              ? 'Your refund is on its way.'
              : 'No further action needed on this one.'}
          </p>
        </div>
      </div>
    )
  }

  const now = new Date()
  // Build a Date at midnight UTC of the appointment so "today / in 3
  // days" comparisons aren't thrown off by the customer's timezone.
  const apptDay = new Date(`${appointmentDate}T00:00:00.000Z`)
  const apptDateTime = new Date(
    `${appointmentDate}T${(appointmentTime || '00:00').slice(0, 5)}:00.000Z`,
  )

  const isPaid = paymentStatus === 'paid'
  const isCompleted = status === 'completed'
  // "Treatment day" goes active from the morning of the visit until
  // the booking flips to completed. Before that it's upcoming;
  // after, it's done.
  const isVisitDayOrLater =
    apptDay.toDateString() === now.toDateString() || now > apptDay

  // We compute a rich label for each node so the tracker reads as
  // a tiny narrative rather than a row of generic dots.
  const steps: Step[] = [
    {
      key: 'booked',
      label: 'Booked',
      Icon: ClipboardCheck,
      hint: createdAt ? formatTimestamp(createdAt) : 'Reservation made',
      state: 'done',
    },
    {
      key: 'confirmed',
      label: isPaid ? 'Confirmed' : 'Awaiting payment',
      Icon: CalendarCheck,
      hint: isPaid
        ? confirmedAt
          ? formatTimestamp(confirmedAt)
          : 'Payment received'
        : 'Complete payment to confirm',
      state:
        status === 'confirmed' || status === 'completed'
          ? 'done'
          : isPaid
            ? 'done'
            : 'active',
    },
    {
      key: 'visit',
      label: 'Treatment day',
      Icon: Stethoscope,
      hint: isCompleted
        ? relativeDay(apptDateTime, now)
        : isVisitDayOrLater
          ? `Today \u00B7 ${appointmentTime.slice(0, 5)}`
          : `${relativeDay(apptDay, now)} \u00B7 ${appointmentTime.slice(0, 5)}`,
      state: isCompleted
        ? 'done'
        : isVisitDayOrLater
          ? 'active'
          : 'upcoming',
    },
    {
      key: 'completed',
      label: 'Completed',
      Icon: CheckCircle2,
      hint: isCompleted
        ? completedAt
          ? formatTimestamp(completedAt)
          : 'All done'
        : "We\u2019ll mark this once you\u2019re seen",
      state: isCompleted ? 'done' : 'upcoming',
    },
    {
      key: 'rated',
      label: hasReview ? 'Rated' : 'Rate your visit',
      Icon: Star,
      hint: hasReview
        ? 'Thanks for the feedback'
        : isCompleted
          ? 'Tap below to leave a review'
          : 'Available after your visit',
      state: hasReview
        ? 'done'
        : isCompleted
          ? 'active'
          : 'upcoming',
    },
  ]

  // Find the index of the right-most "done" step so we can colour
  // the rail from start to that node — the same trick Uber uses to
  // animate the "trip progress" line.
  const lastDone = steps.reduce(
    (acc, s, i) => (s.state === 'done' ? i : acc),
    -1,
  )
  // If something is currently active, the rail should reach halfway
  // into that node so it visually communicates "we're working on it".
  const activeIdx = steps.findIndex((s) => s.state === 'active')
  const railEnd =
    activeIdx > -1 ? activeIdx - 0.5 : Math.max(lastDone, 0)
  const railPct =
    steps.length <= 1 ? 0 : (Math.max(railEnd, 0) / (steps.length - 1)) * 100

  // Headline copy mirrors the active step so the page has one
  // dominant message without a second "you're booked" h1 above the
  // tracker.
  const { headline, sub } = (() => {
    if (isCompleted && hasReview) {
      return {
        headline: 'Visit wrapped up',
        sub: 'Thanks for sharing how it went \u2014 we read every review.',
      }
    }
    if (isCompleted) {
      return {
        headline: 'How was your visit?',
        sub: 'Take a moment to rate the team that took care of you.',
      }
    }
    if (isVisitDayOrLater) {
      return {
        headline: 'See you today',
        sub: `Your slot is at ${appointmentTime.slice(0, 5)}. We\u2019re ready when you are.`,
      }
    }
    if (isPaid) {
      return {
        headline: 'You\u2019re confirmed',
        sub: `${relativeDay(apptDay, now)} at ${appointmentTime.slice(0, 5)} \u2014 we\u2019ll send a reminder closer to the day.`,
      }
    }
    return {
      headline: 'Almost there',
      sub: 'Finish payment and your slot will be locked in.',
    }
  })()

  return (
    <section
      aria-label="Booking progress"
      className="mb-4 rounded-3xl border border-gray-100 bg-white p-4 sm:p-5 shadow-[0_8px_30px_-18px_rgba(123,45,142,0.18)] print:hidden"
    >
      {/* Headline strip — keeps the tracker meaningful even on the
          smallest screens where the step labels start to feel
          dense. */}
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-[15px] sm:text-base font-semibold text-gray-900 tracking-tight truncate">
            {headline}
          </h2>
          <p className="mt-0.5 text-[12px] text-gray-500 leading-relaxed">
            {sub}
          </p>
        </div>
        <span
          className={`shrink-0 hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.16em] ${
            isCompleted
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
              : isVisitDayOrLater
                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'
                : 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/15'
          }`}
        >
          {isCompleted ? 'Live: complete' : 'Live tracking'}
        </span>
      </header>

      {/* Track + nodes. We render the rail in two layers — a faint
          neutral baseline and a coloured fill that animates to the
          right as steps advance. The nodes sit on top with absolute
          positioning that maps 1:1 to the rail percentages, so the
          dots and the fill can never drift out of alignment. */}
      <div className="relative pt-2 pb-1">
        {/* Baseline rail */}
        <div
          aria-hidden="true"
          className="absolute left-[6%] right-[6%] top-[22px] h-[3px] rounded-full bg-gray-100"
        />
        {/* Fill rail — width animates whenever railPct changes. */}
        <div
          aria-hidden="true"
          className={`absolute left-[6%] top-[22px] h-[3px] rounded-full transition-all duration-700 ease-out ${
            isCompleted ? 'bg-emerald-500' : 'bg-[#7B2D8E]'
          }`}
          style={{ width: `calc(${(railPct / 100) * 88}%)` }}
        />

        <ol className="relative grid grid-cols-5 gap-1">
          {steps.map((s, i) => (
            <li
              key={s.key}
              className="flex flex-col items-center text-center px-0.5"
            >
              <Node step={s} isFinalDone={isCompleted && i === steps.length - 2} />
              <p
                className={`mt-2 text-[11px] sm:text-[11.5px] font-semibold tracking-tight leading-tight ${
                  s.state === 'upcoming' ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                {s.label}
              </p>
              <p
                className={`mt-0.5 text-[10px] sm:text-[10.5px] leading-snug ${
                  s.state === 'upcoming' ? 'text-gray-300' : 'text-gray-500'
                } line-clamp-2`}
              >
                {s.hint}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Node({
  step,
  isFinalDone,
}: {
  step: Step
  isFinalDone: boolean
}) {
  const { Icon, state } = step
  // Three visual treatments:
  //   • done     — solid brand fill (or emerald on the completed
  //                node) with a white tick / icon.
  //   • active   — white fill, brand ring, and a soft pulsing halo
  //                so the customer's eye lands on "where we are now".
  //   • upcoming — neutral fill, dashed ring to read as "to come".
  if (state === 'done') {
    return (
      <span
        className={`relative z-[1] flex h-[36px] w-[36px] items-center justify-center rounded-full text-white shadow-sm ${
          isFinalDone ? 'bg-emerald-500' : 'bg-[#7B2D8E]'
        }`}
        aria-current="false"
      >
        <Icon className="h-4 w-4" />
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span
        className="relative z-[1] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white text-[#7B2D8E] ring-2 ring-[#7B2D8E]"
        aria-current="step"
      >
        <span
          className="absolute inset-0 rounded-full bg-[#7B2D8E]/15 animate-ping"
          aria-hidden="true"
        />
        <Icon className="relative h-4 w-4" />
      </span>
    )
  }
  return (
    <span
      className="relative z-[1] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white text-gray-400 ring-2 ring-dashed ring-gray-200"
      aria-current="false"
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}
