'use client'

import { useEffect } from 'react'

/**
 * useScrollLock — freeze the page underneath a modal/sheet without
 * the page "shaking" or losing its scroll position.
 *
 * The naive approach (`document.body.style.overflow = 'hidden'`)
 * has two visible problems on real devices:
 *
 *   1. On desktop, hiding the body's overflow removes the vertical
 *      scrollbar. The viewport instantly widens by ~15px, so every
 *      element with `mx-auto` jumps to the right. When the modal
 *      closes, the scrollbar reappears and everything jumps back.
 *      That's the horizontal "shake" users perceive.
 *
 *   2. On iOS Safari (and some Android Chromes), `overflow:hidden`
 *      on the body silently resets the scroll position to 0 — so
 *      closing the sheet drops the user back at the top of the
 *      page instead of where they were. That's the vertical
 *      "shake" / "jump back to top" complaint.
 *
 * The polished modal libraries (Radix UI, Material UI, vaul)
 * solve both with the same recipe used here:
 *
 *   • Save `window.scrollY` BEFORE the lock.
 *   • Pin the body with `position: fixed; top: -<scrollY>px`. The
 *     body's content stays exactly where the user was looking,
 *     visually frozen.
 *   • Add `padding-right: <scrollbar-width>` so the body keeps the
 *     same width once the scrollbar is gone — that's what kills
 *     the desktop horizontal shake.
 *   • On unlock, undo the styles and `window.scrollTo(0, scrollY)`
 *     to put the user back exactly where they were.
 *
 * Counted reference-style so multiple components can lock the body
 * concurrently (e.g. a confirm-dialog opened from inside a sheet)
 * without the inner one prematurely unlocking the outer one.
 */

// Module-scope reference count + saved snapshot. Module scope is
// safe in a Next.js client bundle: it's per-tab.
let lockCount = 0
let savedScrollY = 0
let savedBodyStyles: {
  position: string
  top: string
  left: string
  right: string
  width: string
  paddingRight: string
  overflow: string
} | null = null

function getScrollbarWidth(): number {
  if (typeof window === 'undefined') return 0
  // The width of the scrollbar gutter we're about to compensate
  // for is `innerWidth - documentElement.clientWidth`. On mobile
  // browsers with overlay scrollbars this is 0, which is exactly
  // what we want — no compensation needed.
  return Math.max(
    0,
    window.innerWidth - document.documentElement.clientWidth,
  )
}

function lock() {
  lockCount += 1
  if (lockCount > 1) return // already locked by an outer caller

  if (typeof document === 'undefined') return
  const body = document.body
  savedScrollY = window.scrollY
  savedBodyStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
    overflow: body.style.overflow,
  }

  const scrollbarWidth = getScrollbarWidth()

  body.style.position = 'fixed'
  body.style.top = `-${savedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  // Compensate for the now-gone scrollbar so the page doesn't
  // shift horizontally. Skipped automatically on mobile (where
  // scrollbarWidth is 0) — adding 0 is a no-op.
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`
  }
  // We deliberately do NOT set `overflow: hidden` on the body —
  // `position: fixed` already takes the body out of the scroll
  // flow, and adding overflow:hidden on top of that introduces
  // another layout pass on iOS that briefly flickers. The
  // `overflow` slot in `savedBodyStyles` is recorded so we can
  // restore any pre-existing inline value the rest of the app
  // might have set, but we don't write to it here.
}

function unlock() {
  if (lockCount <= 0) return
  lockCount -= 1
  if (lockCount > 0) return // still locked by an outer caller

  if (typeof document === 'undefined' || !savedBodyStyles) return
  const body = document.body
  body.style.position = savedBodyStyles.position
  body.style.top = savedBodyStyles.top
  body.style.left = savedBodyStyles.left
  body.style.right = savedBodyStyles.right
  body.style.width = savedBodyStyles.width
  body.style.paddingRight = savedBodyStyles.paddingRight
  body.style.overflow = savedBodyStyles.overflow
  savedBodyStyles = null

  // Restore the scroll position the user was at. We turn off
  // smooth scrolling for this single restore — otherwise the
  // browser animates from 0 → savedScrollY, which is exactly the
  // "jump back to top then scroll down" flash we're trying to
  // avoid.
  const html = document.documentElement
  const previousBehavior = html.style.scrollBehavior
  html.style.scrollBehavior = 'auto'
  window.scrollTo(0, savedScrollY)
  // Restore on the next frame so any same-tick `scrollTo({behavior: 'smooth'})`
  // calls from elsewhere in the app aren't disabled by us.
  requestAnimationFrame(() => {
    html.style.scrollBehavior = previousBehavior
  })
}

/**
 * Lock body scrolling for the lifetime of `active === true`.
 * Safe to call from multiple components simultaneously — they
 * share a reference count internally.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lock()
    return () => unlock()
  }, [active])
}
