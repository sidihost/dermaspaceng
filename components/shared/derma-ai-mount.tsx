'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ButterflyLogo } from './butterfly-logo'

/**
 * Panel-only error boundary for DermaAI.
 *
 * Differs from `RootErrorBoundary` in one critical way: when it
 * catches a render/lifecycle error, it dispatches a global
 * `closeDermaAI` window event before rendering null. That event is
 * what the parent `DermaAIMount` listens for to restore its
 * launcher state.
 *
 * Without this dispatch, the failure mode users were reporting
 * happened reliably:
 *   1. User taps launcher → Mount marks `isOpen = true` (launcher
 *      hides via opacity/scale).
 *   2. DermaAI panel throws during render (auth gate, transient
 *      hook order glitch, fetch race, etc.).
 *   3. Generic boundary catches and renders null — panel gone.
 *   4. Launcher stays hidden forever because Mount's `isOpen`
 *      never flipped back. User has no way to recover except
 *      hard-refresh.
 *
 * With the close-event dispatch, the launcher comes back the moment
 * the panel fails, so the user can tap again (or, if the failure
 * is permanent, at least see the chip and know the assistant
 * exists).
 */
class DermaAIPanelBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[v0] DermaAIPanelBoundary caught error:', error, info?.componentStack)
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new Event('closeDermaAI'))
      } catch {
        /* very old browsers — Mount will still recover on next
           pointer interaction since we're rendering null below */
      }
    }
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

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
 * surface.
 *
 * Why the launcher lives HERE (not inside DermaAI):
 * ---------------------------------------------------------------
 * DermaAI is a ~6,600-line component that touches speech APIs,
 * media devices, geolocation, IndexedDB, and streaming AI. Any
 * uncaught error in that tree is swallowed by the surrounding
 * `RootErrorBoundary` — which is correct behaviour for the chat
 * panel (we'd rather hide the widget than white-screen the site)
 * but becomes a user-visible regression when the LAUNCHER is also
 * inside that boundary: the purple butterfly chip disappears and
 * users have no way to reopen the assistant without refreshing.
 *
 * This component fixes that by splitting the two concerns:
 *
 *   1. A tiny, always-safe launcher button lives here, OUTSIDE
 *      the error boundary. It has zero external dependencies
 *      (no network calls, no heavy state, no third-party libs),
 *      so it can be trusted to render on every page load.
 *   2. DermaAI receives `hideLauncher` so it skips its own
 *      internal launcher render — avoiding two stacked buttons.
 *      The chat panel + all of DermaAI's state machine is still
 *      wrapped by `RootErrorBoundary` so a crash there only
 *      kills the panel, not the launcher.
 *   3. Clicks on our launcher fire the global `openDermaAI`
 *      window event that DermaAI already listens for. Uses the
 *      component's existing uncontrolled state machine — no
 *      controlled props, no risk of mid-flight prop-change
 *      warnings, and the `openDermaAI` / `closeDermaAI` events
 *      are the canonical cross-component way to drive the chat
 *      (the voice toggle, the book-a-facial CTA card, and the
 *      /derma-ai deep-link all use them already).
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''
  const blocked = BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  // Mirror DermaAI's open/close state so our launcher can hide
  // itself while the panel is visible. We can't read DermaAI's
  // internal `isOpen` directly (different component tree), so we
  // listen for the same global events DermaAI uses to toggle
  // itself. This keeps the two state machines in lock-step without
  // making the launcher brittle to DermaAI crashing — the events
  // still fire from user interaction (backdrop tap, close button,
  // voice exit) whether or not DermaAI is healthy.
  const [isOpen, setIsOpen] = useState(false)
  // `panelReady` mirrors whether the chat panel has actually
  // mounted and become visible. Decoupled from `isOpen` (which is
  // just our REQUEST to open) so the launcher stays visible until
  // the heavy chunk has finished loading and the panel has
  // confirmed it's on screen. Without this, taps on the launcher
  // hid the chip immediately even if the dynamic import was slow,
  // failing, or blocked — leaving users staring at an empty page
  // with nothing to retry.
  const [panelReady, setPanelReady] = useState(false)
  // Watchdog timer ID. Started when the user requests the panel,
  // cleared when the panel confirms it's visible. If it fires
  // before confirmation arrives, we assume the dynamic chunk
  // failed to load or the panel crashed silently and roll the
  // launcher back to its idle state so the user can try again.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Also track the draggable position so the launcher restores to
  // wherever the user last left it. This used to live inside
  // DermaAI; moving it here means the stored position survives the
  // chat tree failing to mount.
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

  // Restore saved launcher position. Same storage key that DermaAI
  // used previously, so returning users keep their dragged
  // position without a forced reset.
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

  // Watchdog window — how long we wait for `dermaAIPanelOpen`
  // confirmation before assuming the dynamic chunk failed to load
  // or the panel crashed during render. Tuned generously so users
  // on slow 3G can still reach the panel: a fast device + cached
  // chunk confirms in <100ms, a cold mobile load is typically
  // ~1-3s, and 6s is the cliff where we'd rather show the
  // launcher again than leave the user staring at nothing.
  const PANEL_OPEN_TIMEOUT_MS = 6000

  // Listen for open/close events so we can hide the launcher while
  // the chat panel is visible and restore it when the panel closes.
  // External openers (voice, quick actions, /derma-ai deep-link
  // cards, the panel's own backdrop/close handlers) all dispatch
  // these so we stay in sync without polling DermaAI's internal
  // state.
  //
  // The launcher's HIDE state is gated on `panelReady`, not
  // `isOpen` — see the rendering block at the bottom of the file
  // for the full rationale. This effect just translates the four
  // global events DermaAI uses into local state transitions.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const clearWatchdog = () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current)
        watchdogRef.current = null
      }
    }

    const handleOpen = () => {
      // Mark that we want the panel open. The launcher won't hide
      // yet — it waits for `dermaAIPanelOpen` confirmation. If
      // that never arrives within PANEL_OPEN_TIMEOUT_MS the
      // watchdog rolls us back to the idle state.
      setIsOpen(true)
      clearWatchdog()
      watchdogRef.current = setTimeout(() => {
        // No confirmation in time — most likely the dynamic chunk
        // failed to fetch (offline, blocked CDN, fresh deploy
        // with stale hash in the SW cache) or the panel threw
        // during render before the boundary could catch. Reset
        // state so the launcher is fully usable again.
        console.warn(
          '[v0] DermaAI panel did not confirm open within',
          PANEL_OPEN_TIMEOUT_MS,
          'ms — restoring launcher',
        )
        setIsOpen(false)
        setPanelReady(false)
        watchdogRef.current = null
      }, PANEL_OPEN_TIMEOUT_MS)
    }
    const handleClose = () => {
      setIsOpen(false)
      setPanelReady(false)
      clearWatchdog()
    }
    // DermaAI fires `dermaAIPanelReady` from a useEffect that runs
    // every time `isOpen` flips to true on its side, which only
    // happens after the dynamic chunk has loaded, the heavy chat
    // tree has mounted, and the panel is in the DOM. That's our
    // cue to actually hide the launcher and cancel the watchdog —
    // the user is now looking at the chat.
    const handlePanelReady = () => {
      setPanelReady(true)
      clearWatchdog()
    }

    window.addEventListener('openDermaAI', handleOpen)
    window.addEventListener('closeDermaAI', handleClose)
    window.addEventListener('dermaAIPanelReady', handlePanelReady)
    return () => {
      window.removeEventListener('openDermaAI', handleOpen)
      window.removeEventListener('closeDermaAI', handleClose)
      window.removeEventListener('dermaAIPanelReady', handlePanelReady)
      clearWatchdog()
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
        // Hide the launcher only once the panel has actually
        // CONFIRMED it's open (`panelReady`) — not the moment we
        // request it (`isOpen`). The original code hid the
        // launcher on request, so a slow / failed dynamic import
        // left the user with no launcher AND no panel until they
        // refreshed. Tying the hide animation to confirmation
        // means: tap → launcher stays put → chunk loads → panel
        // mounts → DermaAI fires `dermaAIPanelOpen` → launcher
        // fades out. If the chunk never resolves, the watchdog
        // restores `isOpen=false` and the launcher is already
        // visible — no recovery action needed from the user.
        className={`${
          launcherPos ? '' : 'fixed bottom-28 md:bottom-6 right-4'
        } z-[55] touch-none select-none group transition-[opacity,transform] duration-300 ${
          panelReady
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

      {/* The heavy chat tree — wrapped by `DermaAIPanelBoundary`
          (NOT the generic RootErrorBoundary) so a render crash in
          DermaAI is contained AND the boundary fires
          `closeDermaAI`, which flips Mount's `isOpen` back to
          false and brings the launcher above out of its hidden
          state. `hideLauncher` stops DermaAI from rendering its
          own internal draggable launcher, so users never see two
          stacked buttons.

          IMPORTANT — `open` / `onOpenChange` are passed so DermaAI
          runs in CONTROLLED mode. This is the only thing that
          makes the first-click reliably open the panel: DermaAI is
          dynamically imported (≈6.6k lines + speech/audio/map
          deps), so when the user taps the launcher BEFORE the
          chunk has loaded, DermaAI's internal `openDermaAI`
          listener doesn't exist yet and the event vanishes into
          the void. With controlled mode, DermaAI reads `open=true`
          synchronously the moment its lazy module finishes
          loading, so it opens immediately even though it missed
          the original event. The launcher hide-behaviour, the
          watchdog, and the legacy `openDermaAI` / `closeDermaAI`
          window events keep working unchanged for everything else
          that drives the chat (voice toggle, deep-links, etc.). */}
      <DermaAIPanelBoundary>
        <DermaAI
          hideLauncher
          open={isOpen}
          onOpenChange={(next) => setIsOpen(next)}
        />
      </DermaAIPanelBoundary>
    </>
  )
}
