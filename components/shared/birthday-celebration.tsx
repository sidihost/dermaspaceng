'use client'

/**
 * CelebrationBanner (BirthdayCelebration)
 * ---------------------------------------------------------------
 * Signed-in-only seasonal & milestone banner mounted globally in
 * ClientShell. Triggers once per user per occasion per year:
 *   1. Birthday on DOB (highest priority)
 *   2. Christmas season (Dec 1–26) when admin `/api/festive` is active
 *   3. New Year season (Dec 31–Jan 7)
 *
 * Design system compliance:
 *   - Crisp white surface with #7B2D8E rail & hairline border
 *   - Zero gradients, zero drop-shadow blobs, zero Sparkles/Zap icons
 *   - Purple + white confetti only
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Cake, Clock, Snowflake, X } from 'lucide-react'
import { CURRENT_LEGAL_VERSION } from '@/lib/legal'
import { getLocalCalendarDate } from '@/lib/birthday'
import {
  getActiveCelebrationOccasion,
  getCelebrationBannerCopy,
  getCelebrationConfettiColors,
  getNewYearEdition,
  getSeasonalSeenKey,
  type CelebrationBannerCopy,
} from '@/lib/celebrations'

interface MeResponse {
  user?: {
    id?: string
    firstName?: string
    dateOfBirth?: string | null
    needsProfileCompletion?: boolean
    legalAcceptedVersion?: string | null
  }
}

interface FestiveResponse {
  enabled?: boolean
}

const BANNER_TTL_MS = 12000

export default function BirthdayCelebration() {
  const [banner, setBanner] = useState<CelebrationBannerCopy | null>(null)
  const [visible, setVisible] = useState(false)
  const [hoverPaused, setHoverPaused] = useState(false)

  const confettiFiredRef = useRef(false)
  const remainingMsRef = useRef(BANNER_TTL_MS)
  const lastTickRef = useRef(0)

  const checkAndTrigger = useCallback(async () => {
    try {
      const [meRes, festiveRes] = await Promise.all([
        fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/festive', {
          cache: 'no-store',
        }).catch(() => null),
      ])

      if (!meRes.ok) return
      const data = (await meRes.json()) as MeResponse

      const userId = data.user?.id
      const dob = data.user?.dateOfBirth ?? null
      const name = data.user?.firstName?.trim()
      if (!name) return
      if (data.user?.needsProfileCompletion) return
      if (
        data.user?.legalAcceptedVersion !== undefined &&
        data.user.legalAcceptedVersion !== CURRENT_LEGAL_VERSION
      ) {
        return
      }

      let festiveEnabled = true
      if (festiveRes && festiveRes.ok) {
        try {
          const festiveData = (await festiveRes.json()) as FestiveResponse
          festiveEnabled = festiveData.enabled !== false
        } catch {
          festiveEnabled = true
        }
      }

      const now = new Date()
      const occasion = getActiveCelebrationOccasion({
        dobIso: dob,
        festiveEnabled,
        now,
      })
      if (!occasion) return

      const cal = getLocalCalendarDate(now)
      const celebrationYear =
        occasion === 'new-year'
          ? getNewYearEdition(cal).targetYear
          : cal.year
      const seenKey = getSeasonalSeenKey(occasion, userId, celebrationYear)

      if (typeof window !== 'undefined') {
        try {
          if (window.localStorage.getItem(seenKey) === '1') return
          window.localStorage.setItem(seenKey, '1')
        } catch {
          // Storage blocked — continue showing once this mount
        }
      }

      const copy = getCelebrationBannerCopy({
        occasion,
        firstName: name,
        now,
      })

      remainingMsRef.current = BANNER_TTL_MS
      setBanner(copy)
      setVisible(true)

      if (!confettiFiredRef.current && typeof window !== 'undefined') {
        confettiFiredRef.current = true
        try {
          const mod = await import('canvas-confetti')
          const confetti = mod.default
          const colors = [...getCelebrationConfettiColors(occasion)]

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

  if (!visible || !banner) return null

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
              {banner.occasion === 'christmas' ? (
                <Snowflake className="h-5 w-5 text-[#7B2D8E]" aria-hidden="true" />
              ) : banner.occasion === 'new-year' ? (
                <Clock className="h-5 w-5 text-[#7B2D8E]" aria-hidden="true" />
              ) : (
                <Cake className="h-5 w-5 text-[#7B2D8E]" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-base font-bold text-gray-900 sm:text-lg">
                {banner.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600 sm:text-sm">
                {banner.subtitle}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <Link
                  href={banner.primaryCtaHref}
                  onClick={() => setVisible(false)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5A1D6A] active:scale-[0.98]"
                >
                  {banner.primaryCtaLabel}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href={banner.secondaryCtaHref}
                  onClick={() => setVisible(false)}
                  className="inline-flex items-center rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]"
                >
                  {banner.secondaryCtaLabel}
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label={banner.dismissAriaLabel}
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
