'use client'

/**
 * DermaIntentResumer
 * ---------------------------------------------------------------
 * Globally-mounted listener that picks up a Derma AI "intent"
 * cookie after the user finishes signing in (or signing up) and
 * dispatches it to the Derma AI panel so the original request
 * resumes automatically.
 *
 *   1. On mount, calls `/api/auth/me` to confirm there's a real
 *      session. Skipping this would mean we'd consume the cookie
 *      mid-OAuth and leak the intent to the wrong page.
 *
 *   2. If authenticated, calls `/api/derma/intent/consume`. The
 *      server-side route reads + clears the cookie atomically so
 *      a refresh can never replay the same intent.
 *
 *   3. Waits a short tick for `<DermaAIMount />` to mount its
 *      panel listener, then dispatches the `derma:resume-intent`
 *      CustomEvent on `window` carrying the original query.
 *
 * Renders nothing — it's effectful only. Safe to mount globally
 * (we early-out on every page where there's no intent).
 */

import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

export default function DermaIntentResumer() {
  const { user, isAuthenticated } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    if (!isAuthenticated || !userId) return
    let cancelled = false

    const run = async () => {
      try {
        // Consume the intent (read + clear). If there is no pending
        // intent the route returns `{ intent: null }`.
        const consumeRes = await fetch('/api/derma/intent/consume', {
          method: 'POST',
          credentials: 'same-origin',
        })
        if (!consumeRes.ok) return
        const { intent } = await consumeRes.json().catch(() => ({ intent: null }))
        if (!intent || cancelled) return

        // Dispatch with a small delay so the Derma AI panel
        // (lazy-loaded via next/dynamic) has a chance to mount its
        // event listener before we fire.
        setTimeout(() => {
          if (cancelled) return
          window.dispatchEvent(
            new CustomEvent('derma:resume-intent', { detail: intent }),
          )
        }, 600)
      } catch {
        // Non-fatal — gracefully degrades to normal post-login experience.
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userId])

  return null
}
