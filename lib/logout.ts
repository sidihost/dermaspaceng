'use client'

/**
 * Shared logout flow — one call, no intermediate screens.
 *
 * Every "Sign out" button in the product funnels through
 * `logoutAndRedirect`. It:
 *
 * 1. Clears the localStorage user cache (`dermaspace.auth.user.v1`) that
 *    `useAuth()` seeds SWR with, and broadcasts `auth-logout` so every
 *    mounted auth consumer (header, bottom nav, sidebars) flips to its
 *    signed-out state in the same frame.
 * 2. POSTs `/api/auth/logout` to delete the session row and clear the
 *    `session_id` cookie server-side. `keepalive` lets the request finish
 *    even though we navigate straight after.
 * 3. Hard-navigates to the destination. The full reload drops the SWR
 *    in-memory cache and any component state tied to the old session.
 *
 * Errors are swallowed deliberately: a failed network call must never
 * leave a stale tab reading as signed-in.
 */

import { clearCachedUser } from '@/lib/auth-cache'

let inFlight = false

function clearLocalAuthState(): void {
  try {
    clearCachedUser()
    window.dispatchEvent(new Event('auth-logout'))
  } catch {
    /* browser globals unavailable — continue with the server logout */
  }
}

/**
 * Sign the current user out and land on `redirectTo` (default `/`).
 * Only same-origin paths are honoured so this can never open-redirect.
 */
export async function logoutAndRedirect(redirectTo: string = '/'): Promise<void> {
  if (inFlight) return
  inFlight = true

  const destination =
    redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/'

  clearLocalAuthState()

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
    })
  } catch {
    /* network failure — proceed to the redirect anyway */
  }

  window.location.replace(destination)
}

/**
 * Kept for the `/logout` route so deep links and the `/sign-out`
 * username aliases still work. Behaves identically to
 * `logoutAndRedirect`.
 */
export const performLogout = logoutAndRedirect
