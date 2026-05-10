'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Loader2,
  CheckCircle2,
  Send,
  AlertCircle,
} from 'lucide-react'

/**
 * Post-resolution CSAT card for a support ticket.
 *
 * The interaction model mirrors what Apple Support, Google Pay, Stripe,
 * Linear, and Intercom converge on:
 *
 *   1. A 1–5 star strip with a live "headline" that updates as the
 *      customer hovers — the rating itself feels rewarding, not just a
 *      data-collection chore.
 *   2. A single thumbs-up / thumbs-down "Was this helpful?" toggle.
 *      Captures a binary signal independent of the stars (helpful even
 *      when the rating is mid-range, e.g. 3 stars + thumbs-up means
 *      "got my answer but the wait was long").
 *   3. A short, optional comment field. Apple's review sheet is the
 *      canonical example of "ask for more if they're typing" — we keep
 *      it inline rather than as a modal so it never feels like a
 *      blocker.
 *   4. After submit, the form collapses into a tasteful "Thanks for
 *      letting us know" card, which the customer can tap to edit.
 *
 * Data is owned by `/api/tickets/[ticketId]/review` (GET to hydrate,
 * POST to upsert). The component is self-contained and only needs the
 * ticket id + a fail-soft "isLoaded" callback so the parent can hide
 * its own skeleton when the review state is known.
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
  // page load if they reviewed earlier). Keeps the style consistent
  // with the resolved-status hero so the page reads as one composition.
  const submittedCard = useMemo(() => {
    if (!existing || editing) return null
    return (
      <div
        className="rounded-2xl border border-[#7B2D8E]/15 bg-gradient-to-br from-[#7B2D8E]/[0.05] to-white p-4 sm:p-5"
        data-testid="ticket-review-thanks"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#7B2D8E]/20">
            <Heart className="w-4 h-4" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900">
                Thanks for the feedback
              </h3>
              <span className="inline-flex items-center gap-0.5 text-[#7B2D8E]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3 h-3"
                    fill={i < existing.rating ? 'currentColor' : 'none'}
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
      <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-5 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
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
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#7B2D8E]/20">
          <Star className="w-4 h-4" fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
            {headline}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">{subhead}</p>
        </div>
      </div>

      {/* Star strip — keep it tappable but no longer a billboard.
          Sized to sit comfortably under the headline without
          dominating the ticket thread on mobile. */}
      <div
        className="flex items-center justify-center gap-1 sm:gap-1.5 mb-4 select-none"
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
              className={`p-1.5 rounded-full transition-all ${
                active ? 'scale-110' : 'scale-100 hover:scale-105'
              }`}
            >
              <Star
                className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                  active
                    ? 'text-[#7B2D8E]'
                    : 'text-gray-300 hover:text-[#7B2D8E]/60'
                }`}
                fill={active ? 'currentColor' : 'none'}
                strokeWidth={1.6}
              />
            </button>
          )
        })}
      </div>

      {/* Helpful toggle — appears once a rating is chosen so the card
          eases the customer into committing instead of presenting
          everything at once. Keeps to brand purple so the review
          card reads as one composition instead of a colour mix. */}
      {rating > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 mr-1">
            Was this helpful?
          </span>
          <button
            type="button"
            onClick={() => setHelpful(helpful === true ? null : true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              helpful === true
                ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B2D8E]/40'
            }`}
            aria-pressed={helpful === true}
          >
            <ThumbsUp className="w-3 h-3" />
            Yes
          </button>
          <button
            type="button"
            onClick={() => setHelpful(helpful === false ? null : false)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              helpful === false
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
            aria-pressed={helpful === false}
          >
            <ThumbsDown className="w-3 h-3" />
            Not really
          </button>
        </div>
      )}

      {/* Optional comment — only mounts after a rating exists so the
          card doesn't look like a wall of inputs at first glance. */}
      {rating > 0 && (
        <div className="mb-4">
          <label
            htmlFor="ticket-review-body"
            className="block text-xs font-medium text-gray-500 mb-1.5"
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
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/30 outline-none transition resize-none bg-white"
          />
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10.5px] text-gray-500 hidden sm:block">
          Your review is private to the Dermaspace team.
        </p>
        <button
          type="submit"
          disabled={rating < 1 || submitting}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-[#7B2D8E] text-white text-xs font-medium rounded-lg hover:bg-[#6B2278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving
            </>
          ) : existing ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Update review
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Send feedback
            </>
          )}
        </button>
      </div>
    </form>
  )
}
