'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ButterflyLogo } from './butterfly-logo'

/**
 * Panel-only error boundary for DermaAI.
 *
 * If the heavy chat tree throws during render or a lifecycle
 * method, this boundary catches it, dispatches a global
 * `closeDermaAI` event so any external listeners can react, and
 * — critically — calls the parent's `onReset` so Mount can flip
 * `isOpen` back to false. The launcher chip then reappears and
 * the user can try again. The boundary auto-clears its `hasError`
 * state shortly after so a transient hiccup (e.g. a momentary
 * network drop during the dynamic import) doesn't permanently
 * disable the chat tree.
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
        /* ignore — old browsers without Event() ctor support */
      }
    }
    // Hand control back to the parent so Mount's `isOpen` returns
    // to false, the launcher chip reappears, and the boundary's
    // own error flag is cleared on the next gesture.
    this.props.onReset?.()
    setTimeout(() => {
      if (this.state.hasError) this.setState({ hasError: false })
    }, 800)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

/**
 * DermaAI is large (~6,600 lines + speech / audio / map deps), so
 * we code-split it out of the main bundle with `next/dynamic`. SSR
 * is disabled because the component touches `window`, `navigator`,
 * `localStorage`, and the Web Speech API on mount — none of which
 * exist on the server.
 */
const DermaAI = dynamic(() => import('@/components/shared/derma-ai'), {
  ssr: false,
  loading: () => null,
})

// Paths where the assistant should NOT mount.
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
 * surface using a CONTROLLED-MODE bridge.
 *
 * ## Why controlled mode (and not events)
 *
 * The earlier version of this component used a `window`-event
 * pipeline: tap launcher → dispatch `openDermaAI` → DermaAI's
 * listener catches it → its internal `isOpen` flips → it
 * dispatches `dermaAIPanelReady` back to Mount → Mount hides the
 * chip. That has too many things that can fail:
 *
 *   - If DermaAI's lazy chunk hadn't finished downloading at the
 *     moment of the tap, no listener was attached and the event
 *     was silently lost.
 *   - If DermaAI mounted but its `useEffect` listener attached
 *     one tick AFTER the click (React 18 batching), the event
 *     was missed.
 *   - If the panel rendered but didn't fire `dermaAIPanelReady`
 *     for any reason (an error before the dispatch effect ran,
 *     a timing race with strict-mode double-invoke), Mount's chip
 *     stayed stuck visible/hidden depending on the variant.
 *
 * Controlled mode eliminates all of that. Mount owns the truth
 * (`isOpen`), passes it to DermaAI as a prop, and DermaAI just
 * renders the panel when the prop is true — no events, no
 * timing, no chunk-load races. If the chunk hasn't loaded yet,
 * the prop is simply queued by React: the moment DermaAI mounts
 * it sees `open={true}` and renders the panel synchronously.
 *
 * The launcher visibility is also driven by Mount's `isOpen`,
 * so the chip and the panel can never disagree.
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''
  const blocked = BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )

  // The single source of truth. `true` = panel showing, `false` =
  // launcher chip showing. Both DermaAI and the launcher react to
  // this one piece of state, so they can't drift apart.
  const [isOpen, setIsOpen] = useState(false)

  // Saved draggable position (legacy storage key so returning users
  // keep their dragged position).
  const [launcherPos, setLauncherPos] = useState<{ x: number; y: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
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

  // External openers (voice toggle, /derma-ai deep-link cards, the
  // `openDermaAI` window event used by some quick-action buttons
  // around the app) still work — Mount listens for them and flips
  // `isOpen` itself, then passes the new value down. DermaAI's
  // own internal `setIsOpen` calls also bubble up via the
  // `onOpenChange` prop, so close-from-inside (close button,
  // backdrop tap, keyboard escape) flips Mount's state and the
  // launcher returns automatically.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOpen = () => setIsOpen(true)
    const handleClose = () => setIsOpen(false)
    window.addEventListener('openDermaAI', handleOpen)
    window.addEventListener('closeDermaAI', handleClose)
    return () => {
      window.removeEventListener('openDermaAI', handleOpen)
      window.removeEventListener('closeDermaAI', handleClose)
    }
  }, [])

  const openPanel = useCallback(() => setIsOpen(true), [])
  const handlePanelOpenChange = useCallback((next: boolean) => setIsOpen(next), [])
  const handlePanelReset = useCallback(() => setIsOpen(false), [])

  if (blocked) return null

  return (
    <>
      {/* Floating launcher — intentionally NOT wrapped by any error
          boundary so it stays visible even if the chat tree below
          fails to mount. */}
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
          // Reset the dragged-flag at the START of every gesture.
          // Mobile browsers SUPPRESS the synthetic click event
          // entirely when the pointer moves more than the system
          // drag threshold during the gesture, so the onClick
          // handler never gets a chance to clear the flag — which
          // would leave it `true` forever and silently swallow
          // every subsequent tap. Resetting here guarantees a
          // clean slate per-gesture.
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
            /* iOS < 13 / very old browsers — drag still works,
               just no capture */
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
          // clear the drag flag in the next tick.
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
        // Hide the launcher whenever the panel is open. This is the
        // SAME state the panel uses (`isOpen`), so they can never
        // disagree.
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

      {/* Heavy chat tree, controlled by Mount's `isOpen`. The
          `hideLauncher` prop tells DermaAI to skip rendering its
          own internal launcher (we render the resilient one
          above). Wrapped in `DermaAIPanelBoundary` so a render
          crash inside the chat tree only kills the chat tree —
          the launcher stays visible, and the boundary calls
          `onReset` to flip `isOpen` back to false. */}
      <DermaAIPanelBoundary onReset={handlePanelReset}>
        <DermaAI
          mode="floating"
          hideLauncher
          open={isOpen}
          onOpenChange={handlePanelOpenChange}
        />
      </DermaAIPanelBoundary>
    </>
  )
}
