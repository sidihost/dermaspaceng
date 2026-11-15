'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Check, Info, Mail, X } from 'lucide-react'
import {
  NEWSLETTER_STORAGE_KEYS,
  isNewsletterPopupSuppressedPath,
  parseStoredTimestamp,
  shouldShowNewsletterPopup,
} from '@/lib/newsletter-popup'
import { useFeatureFlag } from '@/lib/use-feature-flag'

const DWELL_MS = 10_000
const SCROLL_MIN_DWELL_MS = 4_000
const SCROLL_THRESHOLD = 0.3

function readStorage(key: string, storage: 'local' | 'session'): string | null {
  try {
    return storage === 'local'
      ? window.localStorage.getItem(key)
      : window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string, storage: 'local' | 'session') {
  try {
    if (storage === 'local') {
      window.localStorage.setItem(key, value)
    } else {
      window.sessionStorage.setItem(key, value)
    }
  } catch {
    // Private browsing or quota errors — keep working in memory.
  }
}

export function NewsletterPopup() {
  const pathname = usePathname()
  const newsletterEnabled = useFeatureFlag('newsletter')

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const triggeredRef = useRef(false)

  const suppress =
    !newsletterEnabled || isNewsletterPopupSuppressedPath(pathname)

  const dismiss = useCallback(() => {
    writeStorage(
      NEWSLETTER_STORAGE_KEYS.dismissedAt,
      String(Date.now()),
      'local',
    )
    setOpen(false)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || suppress || triggeredRef.current) {
      return
    }

    let cancelled = false
    let dwellTimer: number | null = null
    let mountedAt = Date.now()

    const evaluateAndMaybeOpen = async (forceCheck: boolean) => {
      if (cancelled || triggeredRef.current) return

      const subscribed =
        readStorage(NEWSLETTER_STORAGE_KEYS.subscribed, 'local') === '1'
      const shownInSession =
        readStorage(NEWSLETTER_STORAGE_KEYS.sessionShown, 'session') === '1'
      const dismissedAt = parseStoredTimestamp(
        readStorage(NEWSLETTER_STORAGE_KEYS.dismissedAt, 'local'),
      )
      const lastShownAt = parseStoredTimestamp(
        readStorage(NEWSLETTER_STORAGE_KEYS.lastShownAt, 'local'),
      )

      if (
        !shouldShowNewsletterPopup({
          pathname,
          isFeatureEnabled: newsletterEnabled,
          userRole: null,
          subscribed,
          shownInSession,
          dismissedAt,
          lastShownAt,
          now: Date.now(),
        })
      ) {
        return
      }

      if (!forceCheck) return

      // Check auth & subscription status just before revealing so
      // admins/staff and customers already on the list are never prompted.
      let role: string | null = null
      let userEmail: string | null = null
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (meRes.ok) {
          const meJson = await meRes.json()
          role = meJson?.user?.role ?? null
          userEmail = meJson?.user?.email ?? null
        }
      } catch {
        // Guest visitor — proceed.
      }
      if (cancelled) return

      if (role === 'admin' || role === 'staff') return

      if (userEmail) {
        try {
          const chkRes = await fetch('/api/newsletter/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail }),
          })
          if (chkRes.ok) {
            const chkJson = await chkRes.json()
            if (chkJson?.subscribed) {
              writeStorage(NEWSLETTER_STORAGE_KEYS.subscribed, '1', 'local')
              return
            }
          }
        } catch {
          // Non-fatal; continue gracefully.
        }
        if (cancelled) return
        setEmail((prev) => prev || userEmail || '')
      }

      const now = Date.now()
      if (
        !shouldShowNewsletterPopup({
          pathname,
          isFeatureEnabled: newsletterEnabled,
          userRole: role,
          subscribed:
            readStorage(NEWSLETTER_STORAGE_KEYS.subscribed, 'local') === '1',
          shownInSession:
            readStorage(NEWSLETTER_STORAGE_KEYS.sessionShown, 'session') ===
            '1',
          dismissedAt: parseStoredTimestamp(
            readStorage(NEWSLETTER_STORAGE_KEYS.dismissedAt, 'local'),
          ),
          lastShownAt: parseStoredTimestamp(
            readStorage(NEWSLETTER_STORAGE_KEYS.lastShownAt, 'local'),
          ),
          now,
        })
      ) {
        return
      }

      triggeredRef.current = true
      writeStorage(NEWSLETTER_STORAGE_KEYS.lastShownAt, String(now), 'local')
      writeStorage(NEWSLETTER_STORAGE_KEYS.sessionShown, '1', 'session')
      setOpen(true)
    }

    // Quick pre-check: avoid registering scroll listeners if already blocked.
    const subscribed =
      readStorage(NEWSLETTER_STORAGE_KEYS.subscribed, 'local') === '1'
    const shownInSession =
      readStorage(NEWSLETTER_STORAGE_KEYS.sessionShown, 'session') === '1'
    const dismissedAt = parseStoredTimestamp(
      readStorage(NEWSLETTER_STORAGE_KEYS.dismissedAt, 'local'),
    )
    const lastShownAt = parseStoredTimestamp(
      readStorage(NEWSLETTER_STORAGE_KEYS.lastShownAt, 'local'),
    )
    if (
      !shouldShowNewsletterPopup({
        pathname,
        isFeatureEnabled: newsletterEnabled,
        userRole: null,
        subscribed,
        shownInSession,
        dismissedAt,
        lastShownAt,
        now: Date.now(),
      })
    ) {
      return
    }

    mountedAt = Date.now()
    dwellTimer = window.setTimeout(() => {
      void evaluateAndMaybeOpen(true)
    }, DWELL_MS)

    const onScroll = () => {
      if (Date.now() - mountedAt < SCROLL_MIN_DWELL_MS) return
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      const ratio = window.scrollY / docHeight
      if (ratio >= SCROLL_THRESHOLD) {
        window.removeEventListener('scroll', onScroll)
        if (dwellTimer !== null) window.clearTimeout(dwellTimer)
        void evaluateAndMaybeOpen(true)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelled = true
      if (dwellTimer !== null) window.clearTimeout(dwellTimer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [pathname, newsletterEnabled, suppress])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, dismiss])

  if (!open || suppress) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'popup' }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setErrorMsg(data?.error || 'Could not subscribe right now. Try again.')
        return
      }

      writeStorage(NEWSLETTER_STORAGE_KEYS.subscribed, '1', 'local')
      setAlreadySubscribed(Boolean(data?.alreadySubscribed))
      setSubmitted(true)
    } catch {
      setErrorMsg('Network issue. Please try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-popup-title"
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] p-3 sm:p-4"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden bg-white border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Solid Dermaspace plum header */}
        <div className="bg-[#7B2D8E] px-5 py-5 sm:px-6 text-white flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/85 mb-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/15">
                <Mail className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              </span>
              <span>Monthly Journal</span>
            </div>
            <h2
              id="newsletter-popup-title"
              className="text-lg sm:text-xl font-bold leading-snug text-balance"
            >
              {submitted
                ? alreadySubscribed
                  ? "You're already on the list"
                  : "You're subscribed"
                : 'Skincare notes & early slot access'}
            </h2>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Close newsletter popup"
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {submitted ? (
            <div className="text-center py-2">
              <div className="w-11 h-11 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
                {alreadySubscribed ? (
                  <Info className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Check className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                {alreadySubscribed
                  ? "We already have your address saved. You'll receive our next monthly issue on the first."
                  : 'Welcome to the Dermaspace list. Expect one calm email a month with skin tips and member perks.'}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                One thoughtful email a month — seasonal facial offers, skin care
                guidance, and priority appointment openings in VI &amp; Ikoyi.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <label htmlFor="newsletter-popup-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-popup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent"
                />

                {errorMsg && (
                  <p className="text-xs text-rose-600" role="alert">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Subscribing…</span>
                    </>
                  ) : (
                    <>
                      <span>Subscribe</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-gray-400">
                <span>No spam. Unsubscribe anytime.</span>
                <button
                  type="button"
                  onClick={dismiss}
                  className="font-medium text-gray-500 hover:text-[#7B2D8E] transition-colors cursor-pointer py-1 px-1"
                >
                  Maybe later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
