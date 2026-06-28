'use client'

/**
 * Shared logout flow.
 *
 * Why this exists
 * ---------------
 * Before this helper, every "Sign out" button in the product (admin
 * sidebar, staff sidebar, mobile nav, header dropdown, dashboard,
 * Derma AI confirm card, etc.) implemented the same handler:
 *
 *   await fetch('/api/auth/logout', { method: 'POST' })
 *   window.location.href = '/'
 *
 * That looks correct, but it's missing one critical step — clearing
 * the localStorage user cache (`dermaspace.auth.user.v1`) that
 * `useAuth()` seeds SWR with on every render. After the redirect the
 * cookie is gone, but the cached user payload survives, so the FIRST
 * paint of the next page shows the previous user's name and avatar.
 * `useAuth` then revalidates against `/api/auth/me`, gets a 401,
 * clears the cache, and re-renders signed-out — but the user has
 * already seen a brief "still logged in" flash that reads as a bug
 * ("logging out doesn't seem to actually log me out").
 *
 * What this does
 * --------------
 * 1. POSTs `/api/auth/logout` to delete the session row + clear the
 *    `session_id` HTTP cookie server-side.
 * 2. Wipes the localStorage cache via `clearCachedUser()` so the
 *    next page paint has no fallback user to render from.
 * 3. Hard-navigates to the destination (default: `/`). The full
 *    page reload also drops the SWR in-memory cache and any other
 *    component-local state tied to the previous session.
 *
 * Errors are swallowed deliberately — if the network call fails, we
 * still want to clear the local cache and redirect so a stale tab
 * never reads as signed-in indefinitely.
 */

import { clearCachedUser } from '@/lib/auth-cache'

/**
 * Paints a lightweight, on-brand "Signing you out…" overlay over the
 * whole viewport while the logout request + redirect happen.
 *
 * Why a DOM-injected overlay instead of a React component: every
 * sign-out entry point in the app funnels through `logoutAndRedirect`,
 * which is a plain async function (not a component), and the flow ends
 * in a hard `window.location` navigation that tears down the React
 * tree. A self-contained DOM node is the simplest way to give the user
 * immediate feedback that "something is happening" without threading a
 * loading state through six different menus. It uses brand purple +
 * neutrals only, no gradients, no shadows — consistent with the design
 * system. Failure to mount (SSR, blocked DOM) is swallowed.
 */
function showSigningOutOverlay(): void {
  if (typeof document === 'undefined') return
  try {
    if (document.getElementById('ds-logout-overlay')) return

    const overlay = document.createElement('div')
    overlay.id = 'ds-logout-overlay'
    overlay.setAttribute('role', 'status')
    overlay.setAttribute('aria-live', 'polite')
    overlay.setAttribute('aria-label', 'Signing you out')
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:center',
      'gap:14px',
      'background:rgba(255,255,255,0.92)',
      '-webkit-backdrop-filter:blur(2px)',
      'backdrop-filter:blur(2px)',
      'opacity:0',
      'transition:opacity 150ms ease-out',
    ].join(';')

    // Brand-purple ring spinner (CSS-only, no asset, no shadow).
    const spinner = document.createElement('div')
    spinner.style.cssText = [
      'width:34px',
      'height:34px',
      'border-radius:9999px',
      'border:3px solid rgba(123,45,142,0.18)',
      'border-top-color:#7B2D8E',
      'animation:ds-logout-spin 0.7s linear infinite',
    ].join(';')

    const label = document.createElement('p')
    label.textContent = 'Signing you out…'
    label.style.cssText = [
      'margin:0',
      'font-size:13px',
      'font-weight:600',
      'letter-spacing:0.01em',
      'color:#374151',
    ].join(';')

    const style = document.createElement('style')
    style.textContent =
      '@keyframes ds-logout-spin{to{transform:rotate(360deg)}}'

    overlay.appendChild(style)
    overlay.appendChild(spinner)
    overlay.appendChild(label)
    document.body.appendChild(overlay)

    // Next frame → fade in (so the transition actually runs).
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
    })
  } catch {
    /* DOM unavailable / blocked — proceed silently with the logout. */
  }
}

/**
 * Sign the current user out and hard-redirect.
 *
 * @param redirectTo  Path to land on after logout. Defaults to '/'.
 *                    Pass `/signin` if you want the user to be able
 *                    to sign back in immediately on the auth page.
 */
export async function logoutAndRedirect(redirectTo: string = '/'): Promise<void> {
  // 0. Immediate feedback: paint the "Signing you out…" overlay before
  //    any network work so the tap registers instantly.
  showSigningOutOverlay()

  // 1. Server-side: delete the session row and the session_id cookie.
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    /* network failure — proceed to local cleanup so the tab still
       reflects "signed out" instead of getting stuck mid-logout. */
  }

  // 2. Local cache: nuke the cached user payload so /api/auth/me's
  //    upcoming 401 isn't preceded by a "logged-in" flash.
  try {
    clearCachedUser()
  } catch {
    /* localStorage might be disabled (private mode) — fine, the
       7-day TTL on the cache is long but the next /me 401 will
       still clear it before any signed-in surface paints. */
  }

  // 3. Hard navigate. `window.location.href` triggers a full reload
  //    which is the only reliable way to drop the SWR cache, the
  //    React tree, and every other piece of in-memory state tied to
  //    the previous user.
  window.location.href = redirectTo
}
