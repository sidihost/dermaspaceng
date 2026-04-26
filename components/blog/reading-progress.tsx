'use client'

// ---------------------------------------------------------------------------
// components/blog/reading-progress.tsx
//
// Thin brand-purple bar fixed to the top of the viewport on the blog
// detail page. Gives readers a "how far am I" affordance without
// adding a chrome-heavy reading bar or sticky header.
//
// Implementation notes
// --------------------
// * Pure CSS-driven width via inline style updated on `scroll`.
// * Throttled with `requestAnimationFrame` so we never schedule more
//   than one update per frame even on rapid scrolls.
// * We compute progress against the document, not a specific article
//   element, because the article shares its scroll container with the
//   "Continue reading" rail and the CTA — readers expect the bar to
//   only fill once they've actually reached the bottom of the page,
//   not just the article body.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0

    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const max =
        (document.documentElement.scrollHeight || document.body.scrollHeight) -
        window.innerHeight
      const next = max <= 0 ? 0 : Math.min(100, Math.max(0, (scrollTop / max) * 100))
      setProgress(next)
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      className="fixed top-0 left-0 right-0 h-0.5 z-40 pointer-events-none"
      aria-hidden
    >
      <div
        className="h-full bg-[#7B2D8E] transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
