'use client'

/**
 * BirthdayCelebration
 * ---------------------------------------------------------------
 * A signed-in-only, self-contained "it's your birthday" experience
 * that runs for exactly one calendar day.
 *
 * What it does:
 *   1. Fetches the current user from /api/auth/me.
 *   2. If the user's date_of_birth month + day matches today (in the
 *      user's browser local time, which is the same timezone they'll
 *      experience "their birthday" in), it:
 *        - Fires a confetti burst once per day (keyed in localStorage
 *          so navigating between dashboard pages doesn't re-spam it).
 *        - Shows a personalised, dismissible banner at the top of the
 *          viewport that lasts the whole day (or until dismissed).
 *   3. Does nothing (returns null) on any other day, for signed-out
 *      users, or for users without a DOB on file. Zero overhead.
 *
 * Mounted globally in app/layout.tsx so users see it on whichever
 * page they happen to be on when they log in on their birthday.
 */

import { useEffect, useState } from 'react'
import { Cake, X } from 'lucide-react'

interface MeResponse {
  user?: {
    firstName?: string
    dateOfBirth?: string | null
  }
}

/** Return YYYY-MM-DD in the user's local timezone (not UTC). */
function todayLocalISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Given a DOB in YYYY-MM-DD, check if its month+day match today's
 * month+day in local time. We parse the string manually rather than
 * `new Date(dob)` to avoid the infamous "yyyy-mm-dd parses as UTC
 * midnight and shifts by -1 day in WAT" bug.
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

export default function BirthdayCelebration() {
  const [firstName, setFirstName] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
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

        // Has this user already dismissed the banner today? If so we
        // respect that for the remainder of the day.
        const today = todayLocalISO()
        const dismissedKey = 'ds_bday_dismissed'
        const confettiKey = 'ds_bday_confetti_fired'

        if (typeof window !== 'undefined') {
          const dismissedOn = window.localStorage.getItem(dismissedKey)
          if (dismissedOn === today) return
        }

        setFirstName(name)
        setVisible(true)

        // Fire confetti at most once per day. Lazy-import so we don't
        // ship the library to every page view, only to users whose
        // birthday is actually today.
        if (typeof window !== 'undefined') {
          const alreadyFired = window.localStorage.getItem(confettiKey) === today
          if (!alreadyFired) {
            try {
              const mod = await import('canvas-confetti')
              const confetti = mod.default
              // Brand-aligned palette: primary purple + warm gold accent
              // + a couple of soft pinks. Deliberately avoids generic
              // rainbow confetti which would clash with the site theme.
              const colors = ['#7B2D8E', '#F5B841', '#F4A7B9', '#FFFFFF']

              // Two staggered bursts from opposite corners feels more
              // celebratory than a single centered burst.
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
              // A gentle lingering burst from the top
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

              window.localStorage.setItem(confettiKey, today)
            } catch {
              // Confetti is non-essential — fail silently.
            }
          }
        }
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

  const handleDismiss = () => {
    setVisible(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ds_bday_dismissed', todayLocalISO())
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3 pointer-events-none"
    >
      <div
        className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[#7B2D8E]/15 bg-white shadow-[0_10px_40px_-12px_rgba(123,45,142,0.35)] animate-in fade-in slide-in-from-top-4 duration-500"
      >
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
              onClick={handleDismiss}
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
