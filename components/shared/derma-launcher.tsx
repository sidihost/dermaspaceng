'use client'

/**
 * DermaLauncher
 * ---------------------------------------------------------------
 * The floating purple "Ask Derma" button that lives on every
 * public / member surface.
 *
 * This used to live inside `components/shared/derma-ai.tsx`, but
 * that single component had grown to ~6,600 lines of speech
 * recognition, voice synthesis, tool-call handling, and chat
 * rendering. If ANY of that crashed at render/effect time the
 * `RootErrorBoundary` would catch it and render `null` — which
 * took the launcher down with it.
 *
 * By splitting the launcher into its own small component we give
 * it:
 *   1. An independent error boundary scope (one in <DermaAIMount/>
 *      per subtree) — a crash inside the chat body no longer hides
 *      the entry point.
 *   2. A much smaller initial bundle on first paint so the button
 *      appears instantly, even while the heavy DermaAI module is
 *      still being hydrated in the background.
 *   3. A clean "fire and forget" contract: the launcher just
 *      dispatches the `openDermaAI` window event that the chat
 *      component already listens for — no prop drilling, no
 *      shared state.
 *
 * Features kept at parity with the old launcher:
 *   - Drag-to-reposition with edge snap (iOS AssistiveTouch style).
 *   - localStorage persistence across reloads and navigations.
 *   - A tap vs drag disambiguation — finger jitter under 6px still
 *     counts as a tap.
 *   - Hides itself while the chat is open (listens for
 *     `dermaAIOpen` / `dermaAIClose` events dispatched by DermaAI).
 */

import { useEffect, useRef, useState } from 'react'
import { ButterflyLogo } from './butterfly-logo'

const SIZE = 52
const DRAG_THRESHOLD = 6
const STORAGE_KEY = 'derma-launcher-pos'

export default function DermaLauncher() {
  // `null` = hasn't been dragged yet → use the default bottom-right
  // Tailwind classes. Once dragged, we switch to absolute pixel
  // positioning from state so the user's placement sticks.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // The DermaAI chat panel sends open/close events — we hide the
  // launcher while the chat is up so it doesn't overlap the close
  // button.
  const [chatOpen, setChatOpen] = useState(false)

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const dragStateRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
    pointerId: number
  } | null>(null)
  // Mirror of `moved` — we read this inside the synthetic click
  // handler, which fires in the same React tick as pointerup on
  // mobile (so state would still be batched). A ref is flushed
  // synchronously and never lies.
  const draggedRef = useRef(false)

  // Hydrate the persisted drag position once on mount, clamped to
  // the current viewport so a rotation / window resize doesn't leave
  // the button off-screen.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { x: number; y: number }
      if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return
      const maxX = Math.max(0, window.innerWidth - SIZE)
      const maxY = Math.max(0, window.innerHeight - SIZE)
      setPos({
        x: Math.min(Math.max(0, parsed.x), maxX),
        y: Math.min(Math.max(0, parsed.y), maxY),
      })
    } catch {
      /* malformed storage — fall back to defaults */
    }
  }, [])

  // Sync visibility with the chat panel's open state.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onOpen = () => setChatOpen(true)
    const onClose = () => setChatOpen(false)
    window.addEventListener('dermaAIOpen', onOpen)
    window.addEventListener('dermaAIClose', onClose)
    return () => {
      window.removeEventListener('dermaAIOpen', onOpen)
      window.removeEventListener('dermaAIClose', onClose)
    }
  }, [])

  // Clamp the persisted position on window resize so the button
  // never floats off-screen after the soft keyboard dismisses or
  // the device rotates.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => {
      setPos((p) => {
        if (!p) return p
        const maxX = Math.max(0, window.innerWidth - SIZE)
        const maxY = Math.max(0, window.innerHeight - SIZE)
        const x = Math.min(Math.max(0, p.x), maxX)
        const y = Math.min(Math.max(0, p.y), maxY)
        return x === p.x && y === p.y ? p : { x, y }
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const openChat = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('openDermaAI'))
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Open Derma AI — drag to reposition"
      onClick={() => {
        // Swallow the synthetic click that fires after a drag —
        // otherwise lifting your finger to finish repositioning
        // would also pop the chat open.
        if (draggedRef.current) {
          draggedRef.current = false
          return
        }
        openChat()
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
      }}
      onPointerMove={(e) => {
        const s = dragStateRef.current
        if (!s || s.pointerId !== e.pointerId) return
        const dx = e.clientX - s.startX
        const dy = e.clientY - s.startY
        if (!s.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        // First crossing of the threshold — lock in the drag and
        // capture the pointer so we keep receiving moves even if
        // the finger drifts off the button.
        if (!s.moved) {
          s.moved = true
          draggedRef.current = true
          setIsDragging(true)
          try {
            buttonRef.current?.setPointerCapture(e.pointerId)
          } catch {
            /* not all browsers support capture — move events still reach us */
          }
        }
        const maxX = Math.max(0, window.innerWidth - SIZE)
        const maxY = Math.max(0, window.innerHeight - SIZE)
        const x = Math.min(Math.max(0, s.originX + dx), maxX)
        const y = Math.min(Math.max(0, s.originY + dy), maxY)
        setPos({ x, y })
      }}
      onPointerUp={(e) => {
        const s = dragStateRef.current
        dragStateRef.current = null
        try {
          buttonRef.current?.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        if (!s || !s.moved) {
          // Simple tap — let the click handler fire naturally.
          setIsDragging(false)
          return
        }
        // Snap to the nearest horizontal edge for a tidy resting
        // position, then persist.
        const rect = buttonRef.current?.getBoundingClientRect()
        if (rect) {
          const centerX = rect.left + SIZE / 2
          const snappedX =
            centerX < window.innerWidth / 2 ? 8 : window.innerWidth - SIZE - 8
          const maxY = Math.max(0, window.innerHeight - SIZE)
          const y = Math.min(Math.max(8, rect.top), maxY - 8)
          const next = { x: snappedX, y }
          setPos(next)
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          } catch {
            /* quota exceeded — ignore */
          }
        }
        setIsDragging(false)
      }}
      onPointerCancel={() => {
        dragStateRef.current = null
        draggedRef.current = false
        setIsDragging(false)
      }}
      style={
        pos
          ? { position: 'fixed', top: pos.y, left: pos.x, right: 'auto', bottom: 'auto' }
          : undefined
      }
      className={`${
        pos ? '' : 'fixed bottom-24 md:bottom-6 right-4'
      } z-[55] select-none group transition-opacity duration-200 ${
        chatOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <span
        className={`relative block w-12 h-12 md:w-[52px] md:h-[52px] rounded-full bg-[#7B2D8E] flex items-center justify-center ring-1 ring-black/5 transition-transform ${
          isDragging ? 'scale-110' : 'group-hover:scale-[1.04] group-active:scale-95'
        }`}
        style={{ touchAction: 'none' }}
      >
        <ButterflyLogo className="w-5 h-5 md:w-6 md:h-6 text-white" />
      </span>

      {/* Hover label — desktop only. Hidden on touch so there's no
          stuck tooltip after a tap. */}
      <span
        className="pointer-events-none hidden md:inline-flex absolute right-full top-1/2 -translate-y-1/2 mr-2 items-center px-2.5 py-1 rounded-full bg-gray-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
        aria-hidden="true"
      >
        Ask Derma
      </span>
    </button>
  )
}
