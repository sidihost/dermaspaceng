'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ButterflyLogo } from './butterfly-logo'

/**
 * DermaAI is large (≈6,600 lines + speech / audio / map deps), so we
 * code-split it out of the main bundle with `next/dynamic`. SSR is
 * disabled because the component touches `window`, `navigator`,
 * `localStorage`, and the Web Speech API on mount — none of which
 * exist on the server.
 *
 * The chunk download starts as soon as this mount component
 * hydrates. By the time the user taps (usually several seconds
 * later) the chunk is already parsed and the panel can render
 * synchronously.
 */
const DermaAI = dynamic(() => import('@/components/shared/derma-ai'), {
  ssr: false,
  loading: () => null,
})

// Paths where the assistant should NOT mount. We keep it out of:
//   - Auth surfaces (sign-in flows, complete-profile, verify-email)
//     so the floating button never competes with onboarding CTAs.
//   - Admin / staff consoles (those have their own tooling).
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
 * surface.
 *
 * Why the launcher lives HERE (not inside DermaAI):
 * ---------------------------------------------------------------
 * DermaAI is a ~6,600-line component that touches speech APIs,
 * media devices, geolocation, IndexedDB, and streaming AI. If
 * anything in that tree throws, we still want the user to be able
 * to reopen the assistant. So this component splits the two
 * concerns:
 *
 *   1. A tiny, always-safe launcher button lives here, OUTSIDE
 *      any error boundary. It has zero external dependencies
 *      (no network calls, no heavy state, no third-party libs),
 *      so it can be trusted to render on every page load.
 *   2. DermaAI internally wraps its own panel body in a
 *      `DermaAIPanelBoundary` that shows a recoverable "Derma AI
 *      hit a snag" fallback inside the panel — keeping the
 *      launcher visible even if the chat itself can't render.
 *
 * Important history note (so we don't regress):
 * ---------------------------------------------------------------
 * Earlier versions of this file wrapped `<DermaAI>` in a SECOND
 * outer error boundary that auto-dispatched `closeDermaAI` on any
 * caught error. That created the symptom users have repeatedly
 * reported as "the launcher keeps disappearing on click":
 *   1. User taps launcher → `isOpen = true` → launcher hides.
 *   2. DermaAI render emits a transient warning (StrictMode
 *      double-invoke, hot-reload tombstone, async fetch race…).
 *   3. Outer boundary catches → fires `closeDermaAI` → `isOpen`
 *      flips back to `false` → launcher pops back in.
 *   4. The boundary's `hasError` flag never resets, so the next
 *      tap renders `null` and the cycle repeats forever.
 * The outer boundary has been removed. The inner one inside
 * DermaAI handles render failures gracefully without yanking the
 * launcher out from under the user.
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''
  const blocked = BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  // Mirror DermaAI's open/close state so our launcher can hide
  // itself while the panel is visible. We listen for the same global
  // events DermaAI uses to toggle itself (the voice button, the
  // book-a-facial CTA card and the `/derma-ai` deep-link all use
  // them). This keeps the two state machines in lock-step.
  const [isOpen, setIsOpen] = useState(false)
  // Timestamp of the most recent open transition. Used by the
  // backdrop in `derma-ai.tsx` to ignore phantom clicks fired by
  // mobile Safari / older Android right after a tap (the
  // synthetic `click` lands at the original touch coordinates ~300ms
  // after touchend — if React has already painted the backdrop
  // there, the backdrop's `onClick={close}` fires immediately and
  // the panel slams shut). We expose this via a CustomEvent so
  // DermaAI can read it without us having to thread props through
  // controlled mode. See the backdrop handler in `derma-ai.tsx`.
  const openedAtRef = useRef(0)
  // Also track the draggable position so the launcher restores to
  // wherever the user last left it.
  const [launcherPos, setLauncherPos] = useState<{ x: number; y: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  // Ref mirror of "did the pointer actually move during this
  // gesture?" — we read this inside onClick (synthetic click fires
  // in the same tick as pointerup on mobile, so the `isDragging`
  // state update is still batched and would be stale).
  const draggedRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
    pointerId: number
  } | null>(null)

  // Restore saved launcher position. Same storage key DermaAI used
  // previously, so returning users keep their dragged position
  // without a forced reset.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem('derma-launcher-pos')
      if (saved) {
        const { x, y } = JSON.parse(saved) as { x: number; y: number }
        if (Number.isFinite(x) && Number.isFinite(y)) {
          const maxX = Math.max(0, window.innerWidth - 64)
          const maxY = Math.max(0, window.innerHeight - 64)
          setLauncherPos({
            x: Math.min(Math.max(0, x), maxX),
            y: Math.min(Math.max(0, y), maxY),
          })
        }
      }
    } catch {
      /* malformed JSON / quota — fall back to default bottom-right anchor */
    }
  }, [])

  // Listen for open/close events so we can hide the launcher while
  // the chat panel is visible and restore it when the panel closes.
  // External openers (voice, quick actions, /derma-ai deep-link
  // cards, the panel's own backdrop/close handlers) all dispatch
  // these so we stay in sync without polling DermaAI's internal
  // state.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOpen = () => {
      openedAtRef.current = Date.now()
      // Republish the timestamp on a CustomEvent so DermaAI's
      // backdrop can read it without prop drilling.
      try {
        window.dispatchEvent(
          new CustomEvent('dermaAIPanelOpenedAt', { detail: openedAtRef.current }),
        )
      } catch {
        /* old browsers — backdrop falls back to its own opened-at ref */
      }
      setIsOpen(true)
    }
    const handleClose = () => setIsOpen(false)
    window.addEventListener('openDermaAI', handleOpen)
    window.addEventListener('closeDermaAI', handleClose)
    return () => {
      window.removeEventListener('openDermaAI', handleOpen)
      window.removeEventListener('closeDermaAI', handleClose)
    }
  }, [])

  const openPanel = useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('openDermaAI'))
  }, [])

  if (blocked) return null

  return (
    <>
      {/* Floating launcher — intentionally NOT wrapped by any error
          boundary so it stays visible even if the chat tree below
          fails to mount. Mirrors the historical purple butterfly
          chip the brand has shipped since day one. */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open Derma AI — drag to reposition"
        onClick={() => {
          // Swallow the click if it was actually the tail-end of a
          // drag gesture. Otherwise lifting your finger after
          // repositioning would also open the chat.
          if (draggedRef.current) {
            draggedRef.current = false
            return
          }
          openPanel()
        }}
        onPointerDown={(e) => {
          if (!buttonRef.current) return
          const rect = buttonRef.current.getBoundingClientRect()
          dragStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originX: rect.left,
            originY: rect.top,
            moved: false,
            pointerId: e.pointerId,
          }
          try {
            buttonRef.current.setPointerCapture(e.pointerId)
          } catch {
            /* iOS < 13 / very old browsers — drag still works, just
               no capture */
          }
        }}
        onPointerMove={(e) => {
          const s = dragStateRef.current
          if (!s || s.pointerId !== e.pointerId) return
          const dx = e.clientX - s.startX
          const dy = e.clientY - s.startY
          // 6px threshold — soft fingers should still count as a tap.
          if (!s.moved && Math.hypot(dx, dy) < 6) return
          s.moved = true
          draggedRef.current = true
          if (!isDragging) setIsDragging(true)
          const size = 56
          const maxX = Math.max(0, window.innerWidth - size)
          const maxY = Math.max(0, window.innerHeight - size)
          const x = Math.min(Math.max(0, s.originX + dx), maxX)
          const y = Math.min(Math.max(0, s.originY + dy), maxY)
          setLauncherPos({ x, y })
        }}
        onPointerUp={(e) => {
          const s = dragStateRef.current
          dragStateRef.current = null
          if (!s || !s.moved) {
            setIsDragging(false)
            return
          }
          // Snap to nearest horizontal edge for a tidy resting
          // position (iOS AssistiveTouch pattern), persist, and
          // clear the drag flag in the next tick so the synthetic
          // click fires AFTER we've marked it as a drag.
          const size = 56
          const rect = buttonRef.current?.getBoundingClientRect()
          if (rect) {
            const centerX = rect.left + size / 2
            const snappedX =
              centerX < window.innerWidth / 2
                ? 8
                : window.innerWidth - size - 8
            const maxY = Math.max(0, window.innerHeight - size)
            const y = Math.min(Math.max(8, rect.top), maxY - 8)
            setLauncherPos({ x: snappedX, y })
            try {
              localStorage.setItem(
                'derma-launcher-pos',
                JSON.stringify({ x: snappedX, y }),
              )
            } catch {
              /* quota — persistence is best-effort */
            }
          }
          try {
            buttonRef.current?.releasePointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          setTimeout(() => setIsDragging(false), 0)
        }}
        onPointerCancel={() => {
          dragStateRef.current = null
          draggedRef.current = false
          setIsDragging(false)
        }}
        style={
          launcherPos
            ? {
                position: 'fixed',
                top: launcherPos.y,
                left: launcherPos.x,
                right: 'auto',
                bottom: 'auto',
              }
            : undefined
        }
        className={`${
          launcherPos ? '' : 'fixed bottom-28 md:bottom-6 right-4'
        } z-[55] touch-none select-none group transition-[opacity,transform] duration-300 ${
          isOpen
            ? 'scale-0 opacity-0 pointer-events-none'
            : 'scale-100 opacity-100'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div
          className={`relative w-12 h-12 md:w-[52px] md:h-[52px] rounded-full bg-[#7B2D8E] flex items-center justify-center transition-transform ring-1 ring-black/5 ${
            isDragging
              ? 'scale-110'
              : 'group-hover:scale-[1.04] group-active:scale-95'
          }`}
        >
          <ButterflyLogo className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </div>
      </button>

      {/* The heavy chat tree.
          - `hideLauncher` stops DermaAI from rendering its own
            internal draggable launcher (we render a resilient one
            above instead) so the user never sees two stacked chips.
          - `open` / `onOpenChange` put DermaAI in CONTROLLED mode.
            This is what makes the very first tap reliable: the
            chunk is dynamically imported, so when the user taps
            BEFORE it has finished loading, DermaAI's own internal
            `openDermaAI` listener doesn't exist yet and the event
            would otherwise vanish into the void. Controlled mode
            sidesteps that — the lazy module reads `open=true`
            synchronously the moment it finishes loading and opens
            the panel immediately. The legacy `openDermaAI` /
            `closeDermaAI` window events keep working unchanged for
            everything else that drives the chat.
          - There is intentionally NO outer error boundary here.
            The previous outer boundary auto-closed the panel on
            any error — that was the source of the long-running
            "launcher keeps disappearing on click" bug (see header
            comment for the full failure mode). DermaAI internally
            wraps its risky chat tree in `DermaAIPanelBoundary`
            and renders a recoverable fallback in-place, so any
            real render error degrades to a "Derma AI hit a snag"
            card the user can retry from. */}
      <DermaAI
        hideLauncher
        open={isOpen}
        onOpenChange={(next) => setIsOpen(next)}
      />
    </>
  )
}
