'use client'

/**
 * BirthdayCelebration
 * ---------------------------------------------------------------
 * Signed-in-only birthday banner that triggers once per user per year
 * when their DOB matches today's local calendar date (with Feb 29
 * leap-year support).
 *
 * Design system compliance:
 *   - Crisp white surface with #7B2D8E rail & hairline border (matches NotifyCard)
 *   - Zero gradients, zero drop-shadow blobs, zero Sparkles icons
 *   - Purple + white confetti only
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Cake, X } from 'lucide-react'
import {
  BIRTHDAY_CONFETTI_COLORS,
  getBirthdaySeenKey,
  isBirthdayTodayLocal,
} from '@/lib/birthday'
import { CURRENT_LEGAL_VERSION } from '@/lib/legal'

interface MeResponse {
  user?: {
    id?: string
    firstName?: string
    dateOfBirth?: string | null
    needsProfileCompletion?: boolean
    legalAcceptedVersion?: string | null
  }
}

const BANNER_TTL_MS = 12000

export default function BirthdayCelebration() {
  const [firstName, setFirstName] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [hoverPaused, setHoverPaused] = useState(false)

  const confettiFiredRef = useRef(false)
  const remainingMsRef = useRef(BANNER_TTL_MS)
  const lastTickRef = useRef(0)

  const checkAndTrigger = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = (await res.json()) as MeResponse

      const userId = data.user?.id
      const dob = data.user?.dateOfBirth
      const name = data.user?.firstName?.trim()
      if (!dob || !name) return
      if (!isBirthdayTodayLocal(dob)) return
      if (data.user?.needsProfileCompletion) return
      if (
        data.user?.legalAcceptedVersion !== undefined &&
        data.user.legalAcceptedVersion !== CURRENT_LEGAL_VERSION
      ) {
        return
      }

      const currentYear = new Date().getFullYear()
      const seenKey = getBirthdaySeenKey(userId, currentYear)

      if (typeof window !== 'undefined') {
        try {
          if (window.localStorage.getItem(seenKey) === '1') return
          window.localStorage.setItem(seenKey, '1')
        } catch {
          // Storage blocked (private mode) — continue showing once this mount
        }
      }

      remainingMsRef.current = BANNER_TTL_MS
      setFirstName(name)
      setVisible(true)

      if (!confettiFiredRef.current && typeof window !== 'undefined') {
        confettiFiredRef.current = true
        try {
          const mod = await import('canvas-confetti')
          const confetti = mod.default
          const colors = [...BIRTHDAY_CONFETTI_COLORS]

          confetti({
            particleCount: 70,
            spread: 68,
            origin: { x: 0.15, y: 0.6 },
            colors,
          })
          window.setTimeout(() => {
            confetti({
              particleCount: 70,
              spread: 68,
              origin: { x: 0.85, y: 0.6 },
              colors,
            })
          }, 240)
          window.setTimeout(() => {
            confetti({
              particleCount: 45,
              angle: 270,
              spread: 110,
              startVelocity: 24,
              gravity: 0.6,
              origin: { x: 0.5, y: 0 },
              colors,
            })
          }, 480)
        } catch {
          /* non-essential */
        }
      }
    } catch {
      /* Auth or network failure must never disturb page rendering */
    }
  }, [])

  // Initial check on mount + listen for profile DOB updates
  useEffect(() => {
    void checkAndTrigger()

    const onUserUpdated = () => {
      void checkAndTrigger()
    }
    window.addEventListener('user-updated', onUserUpdated)
    return () => {
      window.removeEventListener('user-updated', onUserUpdated)
    }
  }, [checkAndTrigger])

  // Auto-dismiss timer that pauses when the user hovers/focuses the card
  useEffect(() => {
    if (!visible || hoverPaused) return
    lastTickRef.current = Date.now()

    const timer = window.setTimeout(() => {
      setVisible(false)
    }, Math.max(250, remainingMsRef.current))

    return () => {
      window.clearTimeout(timer)
      const elapsed = Date.now() - lastTickRef.current
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed)
    }
  }, [visible, hoverPaused])

  if (!visible || !firstName) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3 pointer-events-none"
    >
      <div
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onFocusCapture={() => setHoverPaused(true)}
        onBlurCapture={() => setHoverPaused(false)}
        className="pointer-events-auto relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#7B2D8E]/20 bg-white animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <div className="flex items-stretch">
          <div className="w-1.5 flex-shrink-0 bg-[#7B2D8E]" aria-hidden="true" />

          <div className="flex flex-1 items-start gap-3.5 p-4 sm:items-center sm:p-5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10">
              <Cake className="h-5 w-5 text-[#7B2D8E]" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-base font-bold text-gray-900 sm:text-lg">
                Happy Birthday, {firstName}!
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600 sm:text-sm">
                Your Glow Year recap is ready &mdash; revisit your year of self-care at
                Dermaspace.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <Link
                  href="/birthday"
                  onClick={() => setVisible(false)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5A1D6A] active:scale-[0.98]"
                >
                  Open Glow Year
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href="/booking"
                  onClick={() => setVisible(false)}
                  className="inline-flex items-center rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]"
                >
                  Book a birthday visit
                </Link>
              </div>
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
