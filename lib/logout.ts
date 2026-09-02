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
 * Sign the current user out.
 *
 * Rather than doing the network work inline and tearing the tree down
 * under a DOM overlay, every sign-out entry point now hands off to the
 * dedicated `/logout` page. That page is the single, visible "Signing
 * you out…" surface: it performs the same three steps (POST logout →
 * clear local cache → hard navigate) but as a real route, so the user
 * always lands on a proper "we're logging you out" screen instead of a
 * flash of overlay. Keeping this function as the shared entry point
 * means all six call sites (header, mobile nav, admin/staff sidebars,
 * dashboard, Derma AI) keep working unchanged.
 *
 * @param redirectTo  Where to land *after* logout completes. Defaults
 *                    to '/'. Pass `/signin` to drop the user straight
 *                    on the auth page.
 */
export async function logoutAndRedirect(redirectTo: string = '/'): Promise<void> {
  // Clear every client-side representation of the signed-in user before
  // navigating. This makes headers, bottom navigation, and other mounted
  // auth consumers switch to their signed-out state immediately instead of
  // waiting for the logout route's network request to finish.
  clearCachedUser()
  window.dispatchEvent(new Event('auth-logout'))

  // Immediate feedback for the gap between tap and the /logout page
  // painting, then hand off. The overlay is torn down by the full
  // navigation that follows.
  showSigningOutOverlay()
  window.location.href = `/logout?redirect=${encodeURIComponent(redirectTo)}`
}

/**
 * The actual teardown, called from the `/logout` page once it has
 * painted its "Signing you out…" screen.
 *
 * 1. POST `/api/auth/logout` to delete the session row + clear the
 *    `session_id` cookie server-side.
 * 2. Wipe the localStorage user cache so the next page's first paint
 *    has no stale "logged-in" fallback to render from.
 * 3. Hard navigate to the destination — a full reload is the only
 *    reliable way to drop the SWR cache and all session-tied state.
 *
 * Errors are swallowed deliberately: a failed network call must never
 * leave the user stranded on a "logging out" screen forever.
 */
export async function performLogout(redirectTo: string = '/'): Promise<void> {
  // The logout page is deliberately visible for a short moment. Clear local
  // auth state first so a slow network request cannot preserve a stale user
  // in another mounted surface or in the page we navigate to afterwards.
  try {
    clearCachedUser()
    window.dispatchEvent(new Event('auth-logout'))
  } catch {
    /* browser globals unavailable — continue with the server logout */
  }

  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    /* network failure — proceed to local cleanup anyway */
  }

  window.location.href = redirectTo
}
