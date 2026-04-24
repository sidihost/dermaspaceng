'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { ButterflyLogo } from './butterfly-logo'
import { RootErrorBoundary } from './root-error-boundary'

/**
 * DermaAI is large (≈6,600 lines + speech / audio / map deps), so we
 * code-split it out of the main bundle with `next/dynamic`. SSR is
 * disabled because the component touches `window`, `navigator`,
 * `localStorage`, and the Web Speech API on mount — none of which
 * exist on the server.
 *
 * We deliberately DO NOT gate the import behind a "user showed
 * intent" flag (it used to). That gate created the worst possible
 * UX: tapping the launcher hid the launcher via `{!isOpen && ...}`
 * AND simultaneously started the network fetch for the DermaAI
 * chunk. Users on slower connections saw the launcher disappear
 * and then ~1–2 seconds of nothing — the exact "launcher just
 * disappears, nothing shows" symptom reported.
 *
 * Instead, we start the chunk download as soon as this mount
 * component hydrates. By the time the user taps (usually several
 * seconds later) the chunk is already parsed and the panel can
 * flip to visible synchronously.
 */
const DermaAI = dynamic(() => import('@/components/shared/derma-ai'), {
  ssr: false,
  loading: () => null,
})

// Paths where the assistant should NOT mount. We keep it out of:
//   - Auth surfaces (sign-in flows, complete-profile, verify-email)
//     so the floating button never competes with onboarding CTAs.
//   - Admin / staff consoles (those have their own tooling and
//     don't need the customer concierge).
//   - The /offline and /blocked fallback pages.
//   - The dedicated /derma-ai page route — that route mounts
//     DermaAI itself in page mode, so we'd render two launchers
//     otherwise.
const BLOCKED_PREFIXES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/complete-profile',
  '/accept-invite',
  '/admin',
  '/staff',
  '/offline',
  '/blocked',
  '/derma-ai',
]

/**
 * Renders the Derma AI floating assistant on every public / member
 * surface. Owns the launcher + open/close state so DermaAI can be
 * treated as a controlled panel — which means if DermaAI ever
 * throws during render, the launcher still works and the global
 * `openDermaAI` event still fires.
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''
  const blocked = BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  const [isOpen, setIsOpen] = useState(false)

  // Global "open the chat" event — dispatched from all over the app
  // (the homepage Derma AI preview CTA, the dashboard welcome card,
  // the recent-chats list, etc.). Lives HERE rather than inside
  // DermaAI so external triggers always fire regardless of whether
  // the heavy chat tree successfully rendered.
  useEffect(() => {
    if (blocked) return
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('openDermaAI', handleOpen)
    return () => window.removeEventListener('openDermaAI', handleOpen)
  }, [blocked])

  const handleOpenChange = useCallback((next: boolean) => {
    setIsOpen(next)
  }, [])

  if (blocked) return null

  return (
    <>
      {/* The launcher lives OUTSIDE the DermaAI error boundary so
          that even if the heavy chat component throws, users can
          still see and tap it. We only hide it once `isOpen` flips
          to true — at that point the DermaAI chunk is already
          loaded (we started fetching it at mount time via the
          `next/dynamic` import above) and its panel renders in the
          same React commit that hides the launcher, so there is no
          visible gap. */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Derma AI"
          className="fixed bottom-28 md:bottom-6 right-4 z-[55] group"
        >
          <div className="relative w-12 h-12 md:w-[52px] md:h-[52px] rounded-full bg-[#7B2D8E] flex items-center justify-center transition-transform ring-1 ring-black/5 group-hover:scale-[1.04] group-active:scale-95">
            <ButterflyLogo className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none hidden md:inline-flex absolute right-full top-1/2 -translate-y-1/2 mr-2 items-center px-2.5 py-1 rounded-full bg-gray-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          >
            Ask Derma
          </span>
        </button>
      )}

      {/* DermaAI is mounted eagerly (no `hasIntent` gate) so the
          chunk is parsed and ready long before the user taps. If
          anything inside it throws we swallow the error silently —
          the launcher above keeps working and the user can
          reload / retry. */}
      <RootErrorBoundary label="derma-ai-panel">
        <DermaAI open={isOpen} onOpenChange={handleOpenChange} />
      </RootErrorBoundary>
    </>
  )
}
