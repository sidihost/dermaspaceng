'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Check, Info, Mail, X } from 'lucide-react'
import {
  NEWSLETTER_STORAGE_KEYS,
  NEWSLETTER_SUBSCRIBED_EVENT,
  isNewsletterPopupSuppressedPath,
  parseStoredTimestamp,
  shouldShowNewsletterPopup,
} from '@/lib/newsletter-popup'
import { useAuth } from '@/hooks/use-auth'
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
    // Private browsing or quota errors: keep working in memory.
  }
}

export function NewsletterPopup() {
  const pathname = usePathname()
  const newsletterEnabled = useFeatureFlag('newsletter')
  const { user: authUser } = useAuth()
  const authRoleRef = useRef<string | null>(authUser?.role ?? null)
  const authEmailRef = useRef<string | null>(authUser?.email ?? null)
  authRoleRef.current = authUser?.role ?? null
  authEmailRef.current = authUser?.email ?? null

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const triggeredRef = useRef(false)
  const submittedRef = useRef(false)

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
    const onSubscribedElsewhere = () => {
      triggeredRef.current = true
      if (!submittedRef.current) {
        setOpen(false)
      }
    }
    window.addEventListener(NEWSLETTER_SUBSCRIBED_EVENT, onSubscribedElsewhere)
    return () => {
      window.removeEventListener(
        NEWSLETTER_SUBSCRIBED_EVENT,
        onSubscribedElsewhere,
      )
    }
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

      // Read server-bootstrapped auth state so admins/staff and
      // already-subscribed customers are never prompted (zero extra /api/auth/me calls).
      const role = authRoleRef.current
      const userEmail = authEmailRef.current
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
      submittedRef.current = true
      window.dispatchEvent(new Event(NEWSLETTER_SUBSCRIBED_EVENT))
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
      data-testid="newsletter-popup"
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-[#1a0d1f]/55 p-3 sm:p-5"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#7B2D8E]/20 grid md:grid-cols-[46%_54%]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Editorial sanctuary photo panel */}
        <div className="relative h-64 sm:h-72 md:h-auto md:min-h-[390px] bg-[#FAF6FB] border-b md:border-b-0 md:border-r border-[#7B2D8E]/15 overflow-hidden">
          <Image
            src="/images/newsletter-spa-portrait-clean.jpg"
            alt="Dark-skinned woman with luminous skin wearing a crisp white waffle spa robe and a plum silk drape"
            fill
            loading="eager"
            sizes="(max-width: 768px) 100vw, 320px"
            referrerPolicy="no-referrer"
            className="object-cover object-[center_20%]"
          />
        </div>

        {/* Content panel */}
        <div className="p-6 sm:p-8 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="inline-flex items-center gap-2 text-[#7B2D8E]">
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-[0.16em]">
                  Newsletter
                </span>
              </div>

              <button
                type="button"
                onClick={dismiss}
                aria-label="Close newsletter popup"
                className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:text-[#1a0d1f] hover:border-[#7B2D8E]/35 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="py-3">
                <div className="w-11 h-11 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center mb-4">
                  {alreadySubscribed ? (
                    <Info className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Check className="w-5 h-5" aria-hidden="true" />
                  )}
                </div>

                <h2
                  id="newsletter-popup-title"
                  className="text-xl font-bold text-[#1a0d1f] leading-snug mb-2"
                >
                  {alreadySubscribed
                    ? "You're already subscribed"
                    : "You're subscribed"}
                </h2>

                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {alreadySubscribed
                    ? "We already have your email saved, so you won't miss our next update."
                    : 'Thanks for subscribing. Watch your inbox for our next monthly update and seasonal offers.'}
                </p>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2
                  id="newsletter-popup-title"
                  className="text-xl sm:text-2xl font-bold text-[#1a0d1f] leading-snug text-balance mb-2.5"
                >
                  Skincare tips &amp; early booking access
                </h2>

                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  Subscribe for practical skincare advice from our aestheticians, seasonal offers, and early notice on weekend appointments.
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[#1a0d1f] placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:border-transparent"
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
                        <span>Subscribing...</span>
                      </>
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {!submitted && (
            <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>One email a month. Unsubscribe anytime.</span>
              <button
                type="button"
                onClick={dismiss}
                className="font-medium text-gray-600 hover:text-[#7B2D8E] transition-colors cursor-pointer py-1 px-1 shrink-0"
              >
                Maybe later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
