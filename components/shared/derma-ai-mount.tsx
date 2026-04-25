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
  { children: ReactNode; onReset?: () => void },
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
    // Auto-recover after a short delay so a transient render error
    // (e.g. a momentary network hiccup during dynamic import) doesn't
    // permanently kill the chat tree. The user's NEXT tap will land
    // on a freshly-mounted DermaAI instead of the boundary's null
    // fallback, which is exactly what they expect from the launcher.
    setTimeout(() => {
      if (this.state.hasError) {
        this.setState({ hasError: false })
        this.props.onReset?.()
      }
    }, 1000)
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
 * ## Why the launcher lives HERE (not inside DermaAI)
 *
 * DermaAI is a ~6,600-line component that touches speech APIs,
 * media devices, geolocation, IndexedDB, and streaming AI. Any
 * uncaught error in that tree is swallowed by the surrounding
 * `RootErrorBoundary` — which is correct behaviour for the chat
 * panel (we'd rather hide the widget than white-screen the site)
 * but becomes a user-visible regression when the LAUNCHER is also
 * inside that boundary: the purple butterfly chip disappears and
 * users have no way to reopen the assistant without refreshing.
 *
 * ## How Mount and DermaAI talk to each other
 *
 * The two halves are intentionally decoupled and communicate ONLY
 * via global window events. There's no controlled-prop bridge
 * (we tried that — see git history for "controlled mode bridge",
 * which dead-locked under flaky chunk loads). The contract is:
 *
 *   Mount → DermaAI:
 *     - `openDermaAI`  fires when the user taps the launcher.
 *       `window.__dermaAIPendingOpen` is also set to `true` to
 *       cover the race where the user taps BEFORE DermaAI's lazy
 *       chunk has finished loading (the in-flight event would be
 *       missed by the listener-attached-on-mount). DermaAI checks
 *       the flag in its own mount-time effect and self-opens if
 *       it's set.
 *     - `closeDermaAI` is fired by the inner panel boundary if
 *       it traps a crash, by the dedicated `/derma-ai` deep-link
 *       cards, and by the panel's own close button.
 *
 *   DermaAI → Mount:
 *     - `dermaAIPanelReady` fires every time DermaAI's internal
 *       `isOpen` transitions to true. Mount reacts by hiding the
 *       launcher chip — so the chip stays visible right up until
 *       the panel is genuinely on screen, even if the chunk took
 *       a few seconds to download on a flaky network.
 *     - `closeDermaAI` is also fired by DermaAI's internal close
 *       handlers so Mount can restore the chip the instant the
 *       panel exits.
 *
 * This split means there's no scenario where Mount thinks the
 * panel is open while DermaAI thinks it's closed (or vice-versa) —
 * Mount's `panelVisible` is purely a mirror of what DermaAI told
 * it last, never an independent guess. And because both sides
 * listen for the same events, every external opener (voice
 * toggle, deep-link cards, page-mode unmount) keeps working
 * unchanged.
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''
  const blocked = BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  // `panelVisible` is a one-way MIRROR of DermaAI's internal open
  // state, derived purely from the events it broadcasts. We never
  // set it speculatively (e.g. the moment the user taps) because
  // doing so was the root cause of the "click → launcher hides →
  // nothing happens" bug: if the chunk hadn't loaded yet, the
  // launcher disappeared and we had no reliable way to confirm
  // the panel really opened. Now the chip stays put until the
  // panel itself confirms it's on screen.
  const [panelVisible, setPanelVisible] = useState(false)
  // Saved draggable position. Same storage key DermaAI used
  // historically so returning users keep their dragged position.
  const [launcherPos, setLauncherPos] = useState<{ x: number; y: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  // Did the pointer actually move during this gesture? Read inside
  // onClick (synthetic click fires in the same tick as pointerup
  // on mobile, so the `isDragging` state would still be batched).
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

  // Restore saved launcher position.
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

  // Listen for DermaAI's lifecycle events so the launcher can hide
  // itself ONLY once the panel is actually visible, and reappear
  // the instant the panel exits. See the file header for the
  // event contract.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleReady = () => {
      console.log('[v0] launcher: dermaAIPanelReady received → hiding launcher')
      setPanelVisible(true)
    }
    const handleClose = () => {
      console.log('[v0] launcher: closeDermaAI received → showing launcher')
      setPanelVisible(false)
    }
    window.addEventListener('dermaAIPanelReady', handleReady)
    window.addEventListener('closeDermaAI', handleClose)
    return () => {
      window.removeEventListener('dermaAIPanelReady', handleReady)
      window.removeEventListener('closeDermaAI', handleClose)
    }
  }, [])

  const openPanel = useCallback(() => {
    if (typeof window === 'undefined') return
    console.log('[v0] launcher: openPanel called')
    // Set the pending-open flag BEFORE dispatching the event. If
    // DermaAI's chunk is still loading and its event listener
    // hasn't attached yet, the dispatched event will be a no-op
    // — but the flag survives, and DermaAI's mount-time effect
    // checks it and self-opens. Result: tapping the launcher works
    // even on a cold load with the chunk still mid-flight.
    try {
      ;(window as unknown as { __dermaAIPendingOpen?: boolean }).__dermaAIPendingOpen = true
      console.log('[v0] launcher: __dermaAIPendingOpen flag set')
    } catch {
      /* read-only window in some embedded contexts — the event
         dispatch below still works for the already-mounted case */
    }
    window.dispatchEvent(new Event('openDermaAI'))
    console.log('[v0] launcher: openDermaAI event dispatched')
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
          console.log('[v0] launcher: onClick fired, draggedRef =', draggedRef.current)
          // Swallow the click if it was actually the tail-end of a
          // drag gesture. Otherwise lifting your finger after
          // repositioning would also open the chat.
          if (draggedRef.current) {
            console.log('[v0] launcher: click swallowed (drag tail)')
            draggedRef.current = false
            return
          }
          openPanel()
        }}
        onPointerDown={(e) => {
          if (!buttonRef.current) return
          // CRITICAL: reset the dragged flag at the START of every
          // pointer interaction. The previous version only cleared
          // it inside the swallowed onClick handler, but mobile
          // browsers SUPPRESS the synthetic click event entirely
          // when the pointer moves more than the system drag
          // threshold during the gesture — so after any real drag
          // the click never fires, the flag is left as `true`, and
          // the user's NEXT tap is permanently swallowed by the
          // "if (draggedRef.current) return" guard. That was the
          // exact "click does nothing, no panel opens" symptom
          // users were reporting after they had ever repositioned
          // the launcher. Resetting on pointerdown guarantees a
          // clean slate for every gesture.
          draggedRef.current = false
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
        // Hide the launcher only once the panel CONFIRMS it's open
        // (`panelVisible`) — never speculatively on click. If the
        // dynamic chunk is still downloading, the chip stays put
        // until DermaAI is mounted and broadcasts
        // `dermaAIPanelReady`. If something fails along the way,
        // the chip is already visible — no recovery refresh needed.
        className={`${
          launcherPos ? '' : 'fixed bottom-28 md:bottom-6 right-4'
        } z-[55] touch-none select-none group transition-[opacity,transform] duration-300 ${
          panelVisible
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

      {/* The heavy chat tree. Wrapped in `DermaAIPanelBoundary` so
          a render crash in the chat tree only kills the chat tree
          — the launcher above stays alive and dispatches a
          `closeDermaAI` event to roll Mount's `panelVisible`
          state back to false. `hideLauncher` stops DermaAI from
          rendering its own internal draggable launcher so users
          never see two stacked buttons.

          DermaAI runs in UNCONTROLLED mode — Mount has no `open`
          / `onOpenChange` props bridging state. Communication is
          purely via window events (`openDermaAI`,
          `dermaAIPanelReady`, `closeDermaAI`) plus the
          `__dermaAIPendingOpen` window flag for the chunk-not-yet-
          loaded case. The previous controlled-mode bridge created
          a deadlock when the dynamic import was slow: Mount would
          flag `open=true` synchronously but DermaAI hadn't mounted
          yet to read the prop, the panel never appeared, and the
          launcher never got the confirmation event back. */}
      <DermaAIPanelBoundary>
        <DermaAI hideLauncher />
      </DermaAIPanelBoundary>
    </>
  )
}
