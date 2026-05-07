'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * <PageViewTracker />
 *
 * Logs every client-side route change to /api/track/pageview so the
 * admin user-detail page can render the "Pages visited" panel. The
 * tracker is deliberately silent — it never blocks navigation, never
 * surfaces errors to the user, and de-duplicates rapid path repeats
 * (Next dev double-renders, hash-only updates, etc.) so a single
 * browse doesn't generate ten rows.
 *
 * Mounted from app/layout.tsx exactly once; rendering it elsewhere
 * is a no-op aside from the wasted React render.
 */
export function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastLoggedRef = useRef<string>('')

  useEffect(() => {
    if (!pathname) return

    // Skip tracking for admin / staff dashboards and obvious noise
    // (auth callbacks, API debug routes). Admins watching the
    // dashboard would otherwise pollute every customer's timeline.
    const skip =
      pathname.startsWith('/admin') ||
      pathname.startsWith('/staff') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next')
    if (skip) return

    // Build the full path with non-sensitive query params so the
    // admin can see "/services?category=face" not just "/services".
    // Strips token-like params to avoid leaking them into the
    // activity feed.
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    for (const sensitive of ['token', 'reset', 'invite', 'code', 'access_token']) {
      params.delete(sensitive)
    }
    const qs = params.toString()
    const fullPath = qs ? `${pathname}?${qs}` : pathname

    if (lastLoggedRef.current === fullPath) return
    lastLoggedRef.current = fullPath

    // Persist (or reuse) a per-tab session id so we can group
    // sequences in analytics later without needing a real session.
    let sessionId = ''
    try {
      sessionId = sessionStorage.getItem('ds_pv_sid') || ''
      if (!sessionId) {
        sessionId =
          (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ||
          `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
        sessionStorage.setItem('ds_pv_sid', sessionId)
      }
    } catch {
      /* storage may be disabled — anonymous fall-through is fine */
    }

    const payload = {
      path: fullPath,
      title: typeof document !== 'undefined' ? document.title : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      sessionId,
    }

    // Fire-and-forget. We use keepalive so the request still goes
    // out if the user is mid-navigation when the effect runs.
    try {
      fetch('/api/track/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* ignore */
    }
  }, [pathname, searchParams])

  return null
}
