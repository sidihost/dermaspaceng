'use client'

import { usePathname } from 'next/navigation'

/**
 * PageLoader — replaces the ad-hoc
 * `<div className="min-h-screen flex items-center justify-center">`
 * loaders that were scattered across every page in the app.
 *
 * The old pattern centered the spinner in the *whole* viewport
 * (`min-h-screen` = 100vh), but the floating MobileNav covers the
 * bottom ~80px on every authenticated route. That meant the
 * spinner always rendered ~40px below the visual center of the
 * usable area. Users described this as "too much whitespace
 * around the spinner" — accurate, because the bottom whitespace
 * was effectively dead space hidden behind the nav.
 *
 * This component is pathname-aware: on routes that don't render
 * the MobileNav (auth funnel, admin / staff consoles, /offline)
 * it falls back to true full-viewport centering. Everywhere else
 * it shaves off the nav height so the spinner sits in the visual
 * middle of what the user actually sees.
 */
const NO_NAV_PAGES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/complete-profile',
  '/verify-email',
  '/offline',
  '/admin',
  '/staff',
]

export interface PageLoaderProps {
  /** Optional label rendered under the spinner. Pass `null` /
   *  omit to render just the spinner (e.g. for fast auth checks
   *  where adding a label would feel like noise). */
  label?: string
  /**
   * When the loader is rendered as a Suspense fallback inside an
   * already-padded layout (e.g. nested route segment), passing
   * `embedded` removes the `min-h` so the loader sizes to its
   * parent instead of trying to fill the viewport itself.
   */
  embedded?: boolean
}

export default function PageLoader({ label, embedded = false }: PageLoaderProps) {
  const pathname = usePathname() ?? ''
  const hasMobileNav = !NO_NAV_PAGES.some((p) => pathname.startsWith(p))

  // `100dvh` so the loader respects mobile browser chrome (URL bar
  // collapsing on scroll). On pages with the floating MobileNav we
  // subtract `5rem` (80px — the nav height + safe-area buffer) so
  // the spinner sits centered in the usable space, not behind the
  // nav. `md:` resets the subtraction because the nav is hidden
  // on tablet+.
  const heightClass = embedded
    ? ''
    : hasMobileNav
      ? 'min-h-[calc(100dvh-5rem)] md:min-h-[100dvh]'
      : 'min-h-[100dvh]'

  return (
    <div
      className={`flex items-center justify-center bg-white ${heightClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
        {label ? (
          <p className="mt-3 text-gray-500 text-sm">{label}</p>
        ) : (
          <span className="sr-only">Loading</span>
        )}
      </div>
    </div>
  )
}
