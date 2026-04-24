'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { ButterflyLogo } from './butterfly-logo'
import { RootErrorBoundary } from './root-error-boundary'

// DermaAI brings a lot of client-only state (speech recognition, audio
// context, localStorage, voice chime etc.), so we dynamic-import it with SSR
// off. That also keeps the main shell bundle slim for visitors who never
// see the assistant (users on admin/staff surfaces).
const DermaAI = dynamic(() => import('@/components/shared/derma-ai'), {
  ssr: false,
})

// Paths where the assistant should NOT mount. We keep it out of:
//   - Auth surfaces (sign-in flows, complete-profile, verify-email) so the
//     floating button never competes with onboarding CTAs.
//   - Admin / staff consoles (those have their own tooling and don't need
//     the customer concierge).
//   - The /offline and /blocked fallback pages (nothing to do there).
//   - The dedicated /derma-ai page route — that route mounts DermaAI
//     itself in page mode, so we'd render two launchers otherwise.
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
 * Renders the Derma AI floating assistant + chat on every public / member
 * surface. Guests get general help (services, pricing, locations) and a
 * soft prompt to log in for the personalized tools (wallet balance,
 * booking lookup, profile updates). DermaAI itself already handles the
 * guest-vs-member state internally, so we just need to mount it.
 *
 * This mount component is intentionally tiny: it owns the `isOpen`
 * state, the `openDermaAI` window-event listener, and the launcher
 * button render. That way, even if the heavy <DermaAI /> chat tree
 * throws during render/effects and gets swallowed by its inner error
 * boundary, the launcher is still visible and the global event still
 * fires — so external triggers (the homepage "Try Derma AI" button,
 * dashboard cards, etc.) keep working reliably.
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''
  const blocked = BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  // Single source of truth for the floating chat's open/close state.
  // Owned HERE rather than inside <DermaAI /> so the launcher and the
  // event listener below remain wired up even if the heavy chat tree
  // ever fails to render.
  const [isOpen, setIsOpen] = useState(false)

  // Global "open the chat" event — dispatched from all over the app
  // (the homepage Derma AI preview CTA, the dashboard welcome card,
  // the recent-chats list, etc.). Previously this listener lived
  // inside DermaAI, which meant it stopped working the moment that
  // component failed to mount. Now it lives here, so external
  // triggers always fire regardless.
  useEffect(() => {
    if (blocked) return
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('openDermaAI', handleOpen)
    return () => window.removeEventListener('openDermaAI', handleOpen)
  }, [blocked])

  // Centralized close handler — both the backdrop and the Close (X)
  // inside the chat panel call this via onOpenChange, and we also
  // pass it to the launcher so Esc / outside-click behave correctly.
  const handleOpenChange = useCallback((next: boolean) => {
    setIsOpen(next)
  }, [])

  // Never mount on auth / admin / staff surfaces.
  if (blocked) return null

  return (
    <>
      {/* The launcher lives OUTSIDE the DermaAI error boundary so that
          even if the heavy chat component throws, users can still see
          and tap it. Tapping sets isOpen=true which mounts/reveals the
          chat panel inside the boundary. The launcher is a flat brand
          chip — no shadow, no halo — matching the rest of Dermaspace's
          flat visual language. */}
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
          {/* Hover label — desktop only, slides in from the launcher
              to the left so it never clips off the viewport edge. */}
          <span
            aria-hidden="true"
            className="pointer-events-none hidden md:inline-flex absolute right-full top-1/2 -translate-y-1/2 mr-2 items-center px-2.5 py-1 rounded-full bg-gray-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          >
            Ask Derma
          </span>
        </button>
      )}

      {/* The chat panel itself. Wrapped in its own boundary so that
          even if any of its internals throw, the launcher above stays
          intact and users can try opening it again after a reload. */}
      <RootErrorBoundary label="derma-ai-panel">
        <DermaAI open={isOpen} onOpenChange={handleOpenChange} />
      </RootErrorBoundary>
    </>
  )
}
