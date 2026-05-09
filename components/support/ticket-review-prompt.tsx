'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Loader2,
  CheckCircle2,
  Send,
  AlertCircle,
} from 'lucide-react'

/**
 * Post-resolution CSAT card for a support ticket.
 *
 * Visual language
 * ---------------
 * The previous version painted everything in amber / gold which clashed
 * with the rest of the dashboard (the entire Dermaspace surface is on
 * the brand purple #7B2D8E). It also rendered enormous stars (w-8 to
 * w-9) and a tall card that overflowed mobile viewports — the user
 * specifically reported "that ticket rating stuff is big not using our
 * color and size, should be responsive".
 *
 * This rewrite:
 *   1. Uses the brand purple as the primary accent (header chip,
 *      filled stars, send button, focus ring) so the card sits in the
 *      same colour world as the page around it.
 *   2. Shrinks the rating row to w-6 / w-7 stars and gives the card
 *      compact mobile padding (p-4 sm:p-5) so it fits inside the
 *      narrow phone viewports the screenshots were taken on.
 *   3. Stays responsive: header copy reflows, the helpful toggle and
 *      submit button drop to full-width on small screens, and the
 *      comment textarea respects the min container width.
 *   4. Keeps the same data contract so the API and the parent page
 *      don't have to change.
 *
 * The interaction model is unchanged:
 *   1. 1–5 stars with a live "headline" that updates as the customer
 *      hovers — the rating itself feels rewarding.
 *   2. A thumbs-up / thumbs-down "Was this helpful?" toggle that
 *      captures a binary signal independent of the stars.
 *   3. A short, optional comment field.
 *   4. After submit, the form collapses into a tasteful "thanks"
 *      card the customer can tap to edit.
 *
 * Data is owned by `/api/tickets/[ticketId]/review` (GET to hydrate,
 * POST to upsert). The component is self-contained.
 */

interface ExistingReview {
  id: number
  rating: number
  was_helpful: boolean | null
  body: string | null
  created_at: string
  updated_at: string
}

interface ReviewResponse {
  review: ExistingReview | null
  canReview: boolean
  ticketStatus: 'open' | 'in_progress' | 'resolved' | 'closed'
}

const HEADLINES: Record<number, string> = {
  0: 'How did we do?',
  1: 'Sorry we missed the mark',
  2: "We'll do better",
  3: 'Thanks for the honest feedback',
  4: 'Glad we could help',
  5: 'Thank you, that means a lot',
}

const SUBHEADS: Record<number, string> = {
  0: 'Tap a star to rate this experience.',
  1: 'Tell us what went wrong and we\u2019ll make it right.',
  2: 'What could we have done differently?',
  3: 'Anything we should know to keep improving?',
  4: 'Anything that would have made this 5 stars?',
  5: 'Mind sharing what stood out to you?',
}

const BRAND = '#7B2D8E'
const BRAND_DARK = '#5A1D6A'

export function TicketReviewPrompt({
  ticketId,
  status,
}: {
  ticketId: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
}) {
  const eligible = status === 'resolved' || status === 'closed'

  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState<ExistingReview | null>(null)
  const [editing, setEditing] = useState(false)

  // Form state
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate the existing review (if any) on mount. We guard with
  // `eligible` so we don't burn an API call on still-active tickets,
  // which the API would reject anyway.
  useEffect(() => {
    if (!eligible) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/review`)
        if (!res.ok) return
        const data: ReviewResponse = await res.json()
        if (cancelled) return
        if (data.review) {
          setExisting(data.review)
          setRating(data.review.rating)
          setHelpful(data.review.was_helpful)
          setComment(data.review.body ?? '')
        }
      } catch {
        /* fail soft — the prompt simply won't appear */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ticketId, eligible])

  const displayedRating = hovered || rating
  const headline = HEADLINES[displayedRating] ?? HEADLINES[0]
  const subhead = SUBHEADS[displayedRating] ?? SUBHEADS[0]

  // The "thank you" card the customer sees after submitting (or on
  // page load if they reviewed earlier). Now styled in the brand
  // purple to match the rest of the resolved view, instead of the
  // emerald gradient that used to clash.
  const submittedCard = useMemo(() => {
    if (!existing || editing) return null
    return (
      <div
        className="rounded-2xl border border-[#7B2D8E]/15 bg-gradient-to-br from-[#7B2D8E]/[0.05] to-white p-4 sm:p-5"
        data-testid="ticket-review-thanks"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: BRAND }}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                Thanks for the feedback
              </h3>
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                    style={{
                      color: i < existing.rating ? BRAND : '#E5E7EB',
                    }}
                    fill={i < existing.rating ? BRAND : 'none'}
                    strokeWidth={2}
                  />
                ))}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {existing.body
                ? `\u201C${existing.body}\u201D`
                : 'Your rating helps us build a kinder, faster Dermaspace experience.'}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 text-xs font-medium text-[#7B2D8E] hover:text-[#5A1D6A] underline-offset-2 hover:underline"
            >
              Edit my review
            </button>
          </div>
        </div>
      </div>
    )
  }, [existing, editing])

  if (!eligible) return null

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4 sm:p-5 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#7B2D8E] animate-spin" />
      </div>
    )
  }

  if (submittedCard) return submittedCard

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          wasHelpful: helpful,
          body: comment.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not save your review.')
      }
      const data = (await res.json()) as { review: ExistingReview }
      setExisting(data.review)
      setEditing(false)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#7B2D8E]/15 bg-gradient-to-br from-[#7B2D8E]/[0.04] via-white to-white p-4 sm:p-5"
      data-testid="ticket-review-prompt"
    >
      {/* Header — brand-purple chip with a star, headline that
          updates as the customer hovers, and a tight subhead. The
          row stays single-line on tablet+ and stacks on phones. */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: BRAND }}
        >
          <Star
            className="w-4 h-4 sm:w-5 sm:h-5 text-white"
            fill="currentColor"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight text-pretty">
            {headline}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 text-pretty">
            {subhead}
          </p>
        </div>
      </div>

      {/* Star strip — sized down for phones (24px) and tablet (28px),
          with snug spacing so all five stars fit comfortably inside a
          360-wide viewport. */}
      <div
        className="flex items-center justify-center gap-1 sm:gap-2 mb-4 select-none"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= displayedRating
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onFocus={() => setHovered(n)}
              onBlur={() => setHovered(0)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              className={`p-1.5 sm:p-2 rounded-full transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/40 ${
                active ? 'scale-110' : 'scale-100 hover:scale-105'
              }`}
            >
              <Star
                className="w-6 h-6 sm:w-7 sm:h-7 transition-colors"
                style={{
                  color: active ? BRAND : '#D1D5DB',
                }}
                fill={active ? BRAND : 'none'}
                strokeWidth={1.6}
              />
            </button>
          )
        })}
      </div>

      {/* Helpful toggle — appears once a rating is chosen. Brand
          purple instead of emerald/rose so the card stays mono-tone
          and consistent with the rest of the Dermaspace UI. The row
          stacks on phones so the buttons keep large enough tap
          targets. */}
      {rating > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3 mb-4">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500">
            Was this helpful?
          </span>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setHelpful(helpful === true ? null : true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                helpful === true
                  ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
              }`}
              aria-pressed={helpful === true}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Yes
            </button>
            <button
              type="button"
              onClick={() => setHelpful(helpful === false ? null : false)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                helpful === false
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
              aria-pressed={helpful === false}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              Not really
            </button>
          </div>
        </div>
      )}

      {/* Optional comment — only mounts after a rating exists so the
          card doesn't look like a wall of inputs at first glance. */}
      {rating > 0 && (
        <div className="mb-3">
          <label
            htmlFor="ticket-review-body"
            className="block text-[11px] sm:text-xs font-medium text-gray-500 mb-1.5"
          >
            Anything else? <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="ticket-review-body"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={
              rating >= 4
                ? 'What did you love about the help you received?'
                : 'What should we have done differently?'
            }
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition resize-none bg-white"
          />
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-start gap-2 text-xs sm:text-sm text-rose-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Footer — privacy hint hidden on phones so the button gets
          full width on small viewports. Send button uses the brand
          purple to match the rest of the dashboard. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <p className="text-[11px] text-gray-500 hidden sm:block">
          Your review is private to the Dermaspace team.
        </p>
        <button
          type="submit"
          disabled={rating < 1 || submitting}
          className="w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-sm font-medium rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor:
              rating < 1 || submitting ? BRAND : BRAND,
          }}
          onMouseEnter={(e) => {
            if (rating >= 1 && !submitting)
              e.currentTarget.style.backgroundColor = BRAND_DARK
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BRAND
          }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving
            </>
          ) : existing ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Update review
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send feedback
            </>
          )}
        </button>
      </div>
    </form>
  )
}
