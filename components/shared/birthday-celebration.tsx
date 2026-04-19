'use client'

/**
 * BirthdayCelebration
 * ---------------------------------------------------------------
 * A signed-in-only, self-contained "it's your birthday" experience
 * that runs exactly ONCE per birthday year — big-tech style.
 *
 * Behaviour:
 *   1. Fetches the current user from /api/auth/me.
 *   2. If the user's date_of_birth month+day matches today in their
 *      local timezone AND they haven't seen this year's greeting yet,
 *      we fire ONE confetti burst and show a warm, personalised
 *      banner that auto-dismisses after ~8 seconds.
 *   3. We stamp `ds_bday_seen = <YYYY>` the moment the greeting is
 *      scheduled to show, so any subsequent page load (refresh,
 *      navigation, re-open app) on the same birthday — or any
 *      mid-session re-mount — is a complete no-op for the rest of
 *      the year. Next year it runs again.
 *   4. On any other day, for signed-out users, or users without a
 *      DOB on file, the component renders null and does nothing.
 *
 * Mounted globally in app/layout.tsx so the greeting can appear on
 * whichever page the user lands on first on their birthday.
 */

import { useEffect, useRef, useState } from 'react'
import { Cake, X } from 'lucide-react'

interface MeResponse {
  user?: {
    firstName?: string
    dateOfBirth?: string | null
  }
}

/**
 * Check if a DOB (YYYY-MM-DD) matches today's month+day in local time.
 * We parse the string manually instead of `new Date(dob)` to avoid the
 * well-known "yyyy-mm-dd parses as UTC midnight and shifts by -1 day
 * in WAT" bug.
 */
function isBirthdayToday(dob: string): boolean {
  const [, mm, dd] = dob.split('-')
  if (!mm || !dd) return false
  const today = new Date()
  return (
    parseInt(mm, 10) === today.getMonth() + 1 &&
    parseInt(dd, 10) === today.getDate()
  )
}

// localStorage key — stamped with the current year so the greeting is
// automatically re-armed every birthday the user has with us.
const SEEN_KEY = 'ds_bday_seen_year'

// How long the banner lingers before auto-dismissing. Long enough to
// read comfortably, short enough that it feels like a "moment" rather
// than persistent chrome the user has to close.
const BANNER_TTL_MS = 8000

export default function BirthdayCelebration() {
  const [firstName, setFirstName] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  // Guard against React 18 StrictMode running the effect twice in dev,
  // and against a quick unmount/remount during route transitions — we
  // only ever want to schedule the greeting once per full page load.
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true

    let cancelled = false

    async function check() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (!res.ok) return
        const data = (await res.json()) as MeResponse

        const dob = data.user?.dateOfBirth
        const name = data.user?.firstName
        if (!dob || !name) return
        if (!isBirthdayToday(dob)) return
        if (cancelled) return

        // Already shown this year? Then it's done — no banner, no
        // confetti, no work. Exactly once per birthday year.
        const currentYear = String(new Date().getFullYear())
        if (typeof window !== 'undefined') {
          if (window.localStorage.getItem(SEEN_KEY) === currentYear) return
          // Stamp BEFORE we show anything so concurrent tabs or a
          // rapid remount can't double-fire the confetti.
          window.localStorage.setItem(SEEN_KEY, currentYear)
        }

        setFirstName(name)
        setVisible(true)

        // Fire the single confetti moment. Lazy-imported so only users
        // whose birthday is actually today ever download the library.
        if (typeof window !== 'undefined') {
          try {
            const mod = await import('canvas-confetti')
            const confetti = mod.default
            // Brand-aligned palette: primary purple + warm gold accent
            // + a soft pink + white. Deliberately avoids generic
            // rainbow confetti which would clash with the site theme.
            const colors = ['#7B2D8E', '#F5B841', '#F4A7B9', '#FFFFFF']

            // Two staggered side bursts plus a gentle top fall — feels
            // celebratory without being overwhelming.
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { x: 0.15, y: 0.6 },
              colors,
            })
            setTimeout(() => {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { x: 0.85, y: 0.6 },
                colors,
              })
            }, 250)
            setTimeout(() => {
              confetti({
                particleCount: 50,
                angle: 270,
                spread: 120,
                startVelocity: 25,
                gravity: 0.6,
                origin: { x: 0.5, y: 0 },
                colors,
              })
            }, 500)
          } catch {
            // Confetti is non-essential — fail silently.
          }
        }

        // Auto-dismiss the banner after its TTL. Because SEEN_KEY is
        // already stamped, the greeting will NOT reappear later today
        // even if the user navigates or refreshes.
        window.setTimeout(() => {
          if (!cancelled) setVisible(false)
        }, BANNER_TTL_MS)
      } catch {
        // Auth failures / network errors should never break the page.
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  if (!visible || !firstName) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[#7B2D8E]/15 bg-white shadow-[0_10px_40px_-12px_rgba(123,45,142,0.35)] animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-stretch">
          {/* Brand colour rail — same primary used across the product. */}
          <div className="w-1.5 flex-shrink-0 bg-[#7B2D8E]" aria-hidden="true" />

          <div className="flex flex-1 items-center gap-3 p-4 sm:p-5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10">
              <Cake className="h-5 w-5 text-[#7B2D8E]" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                Happy Birthday, {firstName}!
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600 sm:text-sm">
                Wishing you the softest, glowiest year yet &mdash; from everyone at Dermaspace.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Dismiss birthday greeting"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
