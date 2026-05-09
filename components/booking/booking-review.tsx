'use client'

/**
 * <BookingReviewSection />
 * --------------------------------------------------------------
 * Shown on the customer-facing booking receipt page once the visit
 * has been marked `completed`. Two modes:
 *
 *   1. No review yet → an inline form with a 5-star headline rating,
 *      three optional facet ratings (cleanliness / staff / value),
 *      a free-text comment, and a thumbs-up "would you recommend us?"
 *      toggle. Submit posts to /api/bookings/[id]/review.
 *   2. Review exists → a polished read-only thank-you card with the
 *      same data, plus an "Edit" pencil that flips back to edit mode.
 *
 * The whole component is brand-purple-on-white, hairline borders, no
 * gradients — same vocabulary as the receipt it sits underneath.
 */

import * as React from 'react'
import useSWR from 'swr'
import {
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Smile,
} from 'lucide-react'

interface ReviewPayload {
  id: string
  rating: number
  cleanliness_rating: number | null
  staff_rating: number | null
  value_rating: number | null
  body: string | null
  would_recommend: boolean | null
  created_at: string
  updated_at: string
}

interface ReviewResponse {
  review: ReviewPayload | null
  canReview: boolean
  bookingStatus: string
}

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export function BookingReviewSection({
  bookingReference,
}: {
  bookingReference: string
}) {
  const endpoint = `/api/bookings/${encodeURIComponent(
    bookingReference,
  )}/review`
  const { data, isLoading, mutate } = useSWR<ReviewResponse>(endpoint, fetcher, {
    revalidateOnFocus: false,
  })

  const [editing, setEditing] = React.useState(false)

  // Show a faint placeholder while we wait for the first response —
  // keeps layout shift to a minimum on the receipt page.
  if (isLoading) {
    return (
      <section className="mt-4 rounded-3xl border border-gray-100 bg-white p-5 print:hidden">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#7B2D8E]" />
          Loading review…
        </div>
      </section>
    )
  }

  // The booking exists but it's not yet eligible for a review (still
  // pending / confirmed / cancelled). We render a soft hint so the
  // customer knows to come back after the visit.
  if (!data?.canReview && !data?.review) {
    if (data?.bookingStatus === 'cancelled' || data?.bookingStatus === 'no_show') {
      return null
    }
    return (
      <section className="mt-4 rounded-3xl border border-dashed border-gray-200 bg-white p-5 print:hidden">
        <div className="flex items-start gap-3">
          {/* Smiling face badge — soft, on-brand, and reads as
              "we're looking forward to hearing from you" without
              the throwaway sparkle motif. */}
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
            <Smile className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              How was it? You&apos;ll be able to leave a review here once your visit is complete.
            </p>
            <p className="mt-0.5 text-[12.5px] text-gray-500 leading-relaxed">
              We&apos;ll unlock this section the moment our team marks the appointment as done.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const review = data?.review ?? null

  // Read-only mode — review already submitted and not in edit mode.
  if (review && !editing) {
    return (
      <section
        className="mt-4 rounded-3xl border border-emerald-100 bg-white p-5 print:hidden"
        aria-label="Your review"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Thanks for the feedback
            </p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">
              Your review
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-1 text-[11.5px] font-semibold text-gray-600 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </header>

        <div className="mt-3 flex items-center gap-2">
          <Stars value={review.rating} readOnly size="lg" />
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {review.rating}.0
          </span>
        </div>

        {(review.cleanliness_rating ||
          review.staff_rating ||
          review.value_rating) && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <FacetReadout label="Cleanliness" value={review.cleanliness_rating} />
            <FacetReadout label="Our team" value={review.staff_rating} />
            <FacetReadout label="Value" value={review.value_rating} />
          </div>
        )}

        {review.body && (
          <blockquote className="mt-3 rounded-2xl bg-[#FBF9FC] border border-gray-100 p-3 text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
            {review.body}
          </blockquote>
        )}

        {review.would_recommend !== null && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600">
            {review.would_recommend ? (
              <>
                <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                You&apos;d recommend us — thank you.
              </>
            ) : (
              <>
                <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
                You wouldn&apos;t recommend us yet — we hear you.
              </>
            )}
          </p>
        )}
      </section>
    )
  }

  // Form mode — either no review yet or the customer hit "Edit".
  return (
    <ReviewForm
      endpoint={endpoint}
      review={review}
      onCancel={review ? () => setEditing(false) : undefined}
      onSaved={async () => {
        setEditing(false)
        await mutate()
      }}
    />
  )
}

// --- Form -----------------------------------------------------------

function ReviewForm({
  endpoint,
  review,
  onSaved,
  onCancel,
}: {
  endpoint: string
  review: ReviewPayload | null
  onSaved: () => void | Promise<void>
  onCancel?: () => void
}) {
  const [rating, setRating] = React.useState<number>(review?.rating ?? 0)
  const [cleanliness, setCleanliness] = React.useState<number>(
    review?.cleanliness_rating ?? 0,
  )
  const [staff, setStaff] = React.useState<number>(review?.staff_rating ?? 0)
  const [value, setValue] = React.useState<number>(review?.value_rating ?? 0)
  const [body, setBody] = React.useState<string>(review?.body ?? '')
  const [wouldRec, setWouldRec] = React.useState<boolean | null>(
    review?.would_recommend ?? null,
  )
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) {
      setError('Please pick an overall rating to continue.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          cleanlinessRating: cleanliness || null,
          staffRating: staff || null,
          valueRating: value || null,
          body: body.trim() || null,
          wouldRecommend: wouldRec,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Could not save your review.')
      } else {
        await onSaved()
      }
    } catch (err: any) {
      setError(err?.message || 'Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="mt-4 rounded-3xl border border-gray-100 bg-white p-5 print:hidden"
      aria-label="Leave a review"
    >
      <header>
        <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
          {/* A solid heart in the eyebrow — picks up the warmth of
              "your feedback goes straight to the team that took
              care of you" without leaning on the same Sparkles motif
              every other product uses. */}
          <Heart className="h-3.5 w-3.5 fill-current" />
          Leave a review
        </p>
        <h2 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
          {review ? 'Update your review' : 'How was your visit?'}
        </h2>
        <p className="mt-1 text-[12.5px] text-gray-500 leading-relaxed">
          Your feedback goes straight to the team that took care of you.
        </p>
      </header>

      <form onSubmit={submit} className="mt-4 space-y-4">
        {/* Overall rating */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Overall rating
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <Stars value={rating} onChange={setRating} size="lg" />
            <span className="text-sm font-semibold text-gray-900 tabular-nums w-7">
              {rating ? `${rating}.0` : '—'}
            </span>
          </div>
        </div>

        {/* Facets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FacetInput label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
          <FacetInput label="Our team"    value={staff}       onChange={setStaff}       />
          <FacetInput label="Value"       value={value}       onChange={setValue}       />
        </div>

        {/* Comment */}
        <div>
          <label
            htmlFor="review-body"
            className="block text-[11px] font-bold uppercase tracking-wider text-gray-500"
          >
            Tell us more (optional)
          </label>
          <textarea
            id="review-body"
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="What stood out? Anything we could do better?"
            className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
          />
          <p className="mt-1 text-right text-[11px] text-gray-400 tabular-nums">
            {body.length}/2000
          </p>
        </div>

        {/* Recommend toggle */}
        <fieldset>
          <legend className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Would you recommend us?
          </legend>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <RecBtn
              active={wouldRec === true}
              onClick={() => setWouldRec(wouldRec === true ? null : true)}
              tone="positive"
              icon={<ThumbsUp className="h-3.5 w-3.5" />}
              label="Yes"
            />
            <RecBtn
              active={wouldRec === false}
              onClick={() => setWouldRec(wouldRec === false ? null : false)}
              tone="negative"
              icon={<ThumbsDown className="h-3.5 w-3.5" />}
              label="Not yet"
            />
          </div>
        </fieldset>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-[12px] text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !rating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5A1D6A] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {review ? 'Save changes' : 'Submit review'}
          </button>
        </div>
      </form>
    </section>
  )
}

// --- Subcomponents --------------------------------------------------

function Stars({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: {
  value: number
  onChange?: (n: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim =
    size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'
  return (
    <div
      className="inline-flex items-center gap-1"
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value
        const Icon = (
          <Star
            className={`${dim} transition-colors ${
              active
                ? 'fill-[#F2B544] text-[#F2B544]'
                : 'fill-gray-100 text-gray-300'
            }`}
          />
        )
        if (readOnly) {
          return (
            <span key={n} aria-hidden>
              {Icon}
            </span>
          )
        }
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n === value ? 0 : n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            aria-checked={active}
            role="radio"
            className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30 active:scale-95 transition-transform"
          >
            {Icon}
          </button>
        )
      })}
    </div>
  )
}

function FacetInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-[#FBF9FC] px-3 py-2.5">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <div className="mt-1.5">
        <Stars value={value} onChange={onChange} size="sm" />
      </div>
    </div>
  )
}

function FacetReadout({
  label,
  value,
}: {
  label: string
  value: number | null
}) {
  if (!value) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-center">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="mt-1 text-[11.5px] text-gray-400">Not rated</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-center">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-center gap-1">
        <Stars value={value} readOnly size="sm" />
      </div>
    </div>
  )
}

function RecBtn({
  active,
  onClick,
  tone,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  tone: 'positive' | 'negative'
  icon: React.ReactNode
  label: string
}) {
  const activeCls =
    tone === 'positive'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : 'bg-rose-50 border-rose-200 text-rose-800'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
        active
          ? activeCls
          : 'border-gray-200 bg-white text-gray-600 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
