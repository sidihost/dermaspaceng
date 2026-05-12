'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'

/**
 * Cookie consent banner.
 *
 * Renders a small bottom-anchored banner the first time a visitor
 * lands on the site. Once they accept (or dismiss), we persist a
 * flag in localStorage so the banner never reappears for that
 * browser — same UX every major SaaS site uses for ePrivacy /
 * cookie notices.
 *
 * Storage:
 *   - localStorage["ds.cookies.consent"] === "accepted" | "dismissed"
 *
 * Visibility rules:
 *   - Only mounts on the client (SSR returns null) so there's no
 *     hydration mismatch when the flag is missing on the server.
 *   - Hidden on `/admin` and `/staff` consoles — those are
 *     authenticated team surfaces, the banner would only get in
 *     the way.
 *   - 600ms entrance delay so the banner doesn't fight the
 *     preloader / hero paint on first visit.
 *
 * Styling sticks to the brand palette: white card, brand-purple
 * accent on the icon + accept button, soft gray dismiss. No
 * gradients, no third-party widgets.
 */
const STORAGE_KEY = 'ds.cookies.consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // SSR safety + suppression on admin/staff surfaces.
    if (typeof window === 'undefined') return
    const path = window.location.pathname
    if (path.startsWith('/admin') || path.startsWith('/staff')) return

    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable (private mode in some browsers).
      // We still show the banner — they can dismiss it per visit.
    }

    if (stored === 'accepted' || stored === 'dismissed') return

    // Small delay so the banner doesn't pop in over the preloader.
    const timer = window.setTimeout(() => setVisible(true), 600)
    return () => window.clearTimeout(timer)
  }, [])

  const persist = (value: 'accepted' | 'dismissed') => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Swallow — we already control the in-memory state below.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:pb-4 sm:px-4 pointer-events-none"
    >
      <div className="mx-auto max-w-3xl pointer-events-auto">
        <div className="rounded-2xl border border-[#7B2D8E]/15 bg-white shadow-[0_12px_40px_-12px_rgba(17,24,39,0.18)] p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="hidden sm:inline-flex w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] items-center justify-center flex-shrink-0">
              <Cookie className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                We use cookies
              </p>
              <p className="mt-1 text-[12px] text-gray-600 leading-relaxed">
                Dermaspace uses cookies to keep you signed in, remember
                your preferences and improve the booking experience.
                Read our{' '}
                <Link
                  href="/privacy"
                  className="text-[#7B2D8E] font-medium hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => persist('dismissed')}
                className="px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:text-gray-900 rounded-full transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => persist('accepted')}
                className="px-4 py-1.5 text-[12px] font-semibold text-white bg-[#7B2D8E] hover:bg-[#5A1D6A] rounded-full transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
