'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Sparkles,
  Shield,
  ScrollText,
  Loader2,
} from 'lucide-react'
import {
  CURRENT_LEGAL_VERSION,
  LEGAL_CARDS,
  formatLegalVersion,
  type LegalCard,
} from '@/lib/legal'

/**
 * Visual icon shown in the rounded badge at the top of each card.
 * Kept off the LEGAL_CARDS shape because it's strictly presentation —
 * the lib layer should stay free of React imports.
 */
const CARD_ICONS: Record<LegalCard['id'], React.ComponentType<{ className?: string }>> = {
  'derma-ai': Sparkles,
  privacy: Shield,
  terms: ScrollText,
}

interface Props {
  /** Where the user accepted from — recorded in the audit log. */
  surface?: 'signup' | 'dashboard-gate' | 'admin' | (string & {})
  /**
   * Whether the modal can be dismissed without accepting. Defaults
   * to false (the dashboard gate must be a hard gate). The signup
   * flow uses the same component inline as a step, not a modal, so
   * it doesn't need dismiss either — but we leave the option open
   * for future surfaces (e.g. an info-only "what's new" preview).
   */
  dismissible?: boolean
  /** Called when the user successfully accepts and the API confirms. */
  onAccepted: () => void
  /** Optional handler for the dismiss/close button when allowed. */
  onDismiss?: () => void
  /**
   * "Inline" mode renders the card stack without the dimmed backdrop +
   * fixed positioning, so it can be embedded into the signup wizard as
   * a normal step. Default is the modal/sheet treatment used by the
   * dashboard gate.
   */
  inline?: boolean
  /**
   * Whether the "I accept" tap should POST to /api/legal/accept.
   * Default true — the dashboard-gate use case wants the
   * acceptance recorded immediately. The signup wizard sets this
   * to FALSE because the user has no session yet, and the
   * /api/auth/signup endpoint stamps the version onto the new
   * user row at account-creation time instead.
   */
  recordOnServer?: boolean
}

/**
 * <LegalAcceptanceModal />
 * ----------------------------------------------------------------
 * The big-tech-style "review and accept" flow. Three swipeable
 * cards (Derma AI → Privacy → Terms), a single "I accept" button at
 * the end, and a small effective-date badge at the foot.
 *
 * Interaction model:
 *   * Swipe / drag on touch devices — pulled with a 30px threshold
 *     so it doesn't fight vertical scrolling inside the card.
 *   * Next / Back arrows for desktop + a11y.
 *   * Pagination dots act as direct jump targets.
 *   * Accept button stays disabled until the user has reached the
 *     last card at least once — encourages reading them all.
 *
 * Why no portal: the dashboard gate already wraps the whole
 * `/dashboard` subtree, so the modal sits naturally above it via
 * `fixed inset-0` and the gate suspends pointer events on the
 * underlying content.
 */
export function LegalAcceptanceModal({
  surface = 'dashboard-gate',
  dismissible = false,
  onAccepted,
  onDismiss,
  inline = false,
  recordOnServer = true,
}: Props) {
  const [index, setIndex] = useState(0)
  const [seenLast, setSeenLast] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track if the user has reached the third card at least once. Only
  // then is the Accept button enabled — small but meaningful nudge
  // toward actually reading all three.
  useEffect(() => {
    if (index === LEGAL_CARDS.length - 1) {
      setSeenLast(true)
    }
  }, [index])

  // ── Touch swipe ────────────────────────────────────────────────
  // We track pointer down/up X to detect a horizontal swipe ≥ 50px,
  // and only when the gesture is more horizontal than vertical so
  // we never hijack a regular scroll.
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0 && index < LEGAL_CARDS.length - 1) setIndex((i) => i + 1)
    if (dx > 0 && index > 0) setIndex((i) => i - 1)
  }

  // ── Keyboard navigation ───────────────────────────────────────
  // ←/→ jump cards. Esc dismisses if the surface allows it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && index < LEGAL_CARDS.length - 1) {
        setIndex((i) => i + 1)
      } else if (e.key === 'ArrowLeft' && index > 0) {
        setIndex((i) => i - 1)
      } else if (e.key === 'Escape' && dismissible && onDismiss) {
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, dismissible, onDismiss])

  // ── Lock body scroll while the modal is open (overlay mode only).
  // The signup-step embedding renders inline, so it doesn't need to
  // lock — the page is otherwise empty in that wizard.
  useEffect(() => {
    if (inline) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [inline])

  const handleAccept = async () => {
    setError(null)
    setSubmitting(true)
    try {
      // Signup flow: the user doesn't have a session yet, so we
      // can't write to the server here. The signup API stamps
      // the version onto the new row instead. We just bubble the
      // acceptance up to the parent wizard.
      if (!recordOnServer) {
        onAccepted()
        return
      }

      const res = await fetch('/api/legal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Could not save your acceptance')
      }
      // Cross-component refresh — the SWR-backed useAuth hook
      // listens for this and re-fetches /api/auth/me so the gate
      // disappears immediately without a page reload.
      window.dispatchEvent(new Event('user-updated'))
      onAccepted()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // The card stack is the same in both modes — only the wrapper
  // changes (full-screen sheet vs. inline panel).
  const cardStack = (
    <div
      className={`relative w-full max-w-md mx-auto bg-white rounded-3xl shadow-[0_24px_60px_-20px_rgba(123,45,142,0.35)] border border-gray-100 overflow-hidden flex flex-col ${
        inline ? '' : 'max-h-[92vh]'
      }`}
    >
      {/* Brand-tinted header */}
      <div className="px-5 pt-5 pb-3 bg-gradient-to-b from-[#7B2D8E]/[0.06] to-transparent">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
            Before you continue
          </span>
          {/* Pagination dots — also act as click targets */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Document">
            {LEGAL_CARDS.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to ${LEGAL_CARDS[i].title}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-6 bg-[#7B2D8E]' : 'w-1.5 bg-[#7B2D8E]/25 hover:bg-[#7B2D8E]/45'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Card track — translateX'd by the active index. We render all
          three cards and clip to the viewport so we get a real
          horizontal scroll feel without the <input>-snapping
          baggage of native scroll-snap. */}
      <div
        ref={trackRef}
        className="flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {LEGAL_CARDS.map((card) => {
            const Icon = CARD_ICONS[card.id]
            return (
              <article
                key={card.id}
                className="w-full flex-shrink-0 px-5 py-5 sm:px-6"
                aria-labelledby={`legal-card-${card.id}-title`}
              >
                {/* Icon badge */}
                <div className="w-11 h-11 rounded-2xl bg-[#7B2D8E]/8 text-[#7B2D8E] flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" aria-hidden />
                </div>

                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#7B2D8E]/80">
                  {card.eyebrow}
                </p>
                <h2
                  id={`legal-card-${card.id}-title`}
                  className="mt-1 text-[18px] sm:text-[19px] font-bold text-gray-900 leading-snug tracking-tight"
                >
                  {card.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
                  {card.intro}
                </p>

                {/* Highlights — branded bullets like .blog-prose. */}
                <ul className="mt-4 space-y-2.5">
                  {card.highlights.map((line, i) => (
                    <li
                      key={i}
                      className="relative pl-5 text-[13px] leading-relaxed text-gray-700"
                    >
                      <span
                        aria-hidden
                        className="absolute left-0 top-[0.55em] w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
                      />
                      {line}
                    </li>
                  ))}
                </ul>

                {/* Read-the-full link */}
                <Link
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] hover:underline"
                >
                  {card.cta}
                  <ExternalLink className="w-3 h-3" aria-hidden />
                </Link>
              </article>
            )
          })}
        </div>
      </div>

      {/* Footer with nav + accept */}
      <div className="border-t border-gray-100 px-4 py-3 sm:px-5 bg-white">
        {error && (
          <div className="mb-2.5 px-3 py-2 rounded-lg bg-red-50 text-[12px] font-medium text-red-700 border border-red-100">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="h-9 w-9 rounded-xl border border-gray-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center justify-center"
            aria-label="Previous"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {index < LEGAL_CARDS.length - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(LEGAL_CARDS.length - 1, i + 1))}
              className="flex-1 h-9 rounded-xl bg-[#7B2D8E] text-white text-[13px] font-semibold hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-1.5"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAccept}
              disabled={!seenLast || submitting}
              className="flex-1 h-9 rounded-xl bg-[#7B2D8E] text-white text-[13px] font-semibold hover:bg-[#5A1D6A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  I accept
                </>
              )}
            </button>
          )}
        </div>

        {/* Effective date pill + dismiss link (when allowed) */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <span
              aria-hidden
              className="w-1 h-1 rounded-full bg-gray-400"
            />
            Effective {formatLegalVersion(CURRENT_LEGAL_VERSION)}
          </span>
          {dismissible && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 hover:underline"
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // Inline mode — drop the cardstack into the surrounding layout
  // exactly as-is. The signup wizard wraps it in its own card.
  if (inline) return cardStack

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Review our terms, privacy and Derma AI policies"
    >
      <div className="w-full sm:w-auto sm:max-w-md">{cardStack}</div>
    </div>
  )
}
