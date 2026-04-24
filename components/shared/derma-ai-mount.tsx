'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { RootErrorBoundary } from './root-error-boundary'

/**
 * DermaAI is large (≈6,600 lines + speech / audio / map deps), so we
 * code-split it out of the main bundle with `next/dynamic`. SSR is
 * disabled because the component touches `window`, `navigator`,
 * `localStorage`, and the Web Speech API on mount — none of which
 * exist on the server.
 *
 * The chunk download starts as soon as this mount component
 * hydrates. By the time the user taps (usually several seconds
 * later) the chunk is already parsed and the panel can render
 * synchronously.
 */
const DermaAI = dynamic(() => import('@/components/shared/derma-ai'), {
  ssr: false,
  loading: () => null,
})

// Paths where the assistant should NOT mount. We keep it out of:
//   - Auth surfaces (sign-in flows, complete-profile, verify-email)
//     so the floating button never competes with onboarding CTAs.
//   - Admin / staff consoles (those have their own tooling and
//     don't need the customer concierge).
//   - The /offline and /blocked fallback pages.
//   - The dedicated /derma-ai page route — that route mounts
//     DermaAI itself in page mode, so we'd render two launchers
//     otherwise.
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
 * surface.
 *
 * History note — earlier revisions of this component owned the
 * `open` state and passed it down to DermaAI as a controlled prop,
 * with a stripped-down launcher rendered here. That approach broke
 * two things at once:
 *
 *   1. The launcher hid the moment `isOpen` flipped true, but if
 *      DermaAI threw mid-render the error boundary wrapped around
 *      it returned null — leaving the user with NO launcher AND
 *      NO panel until they refreshed. This was the exact "click
 *      and nothing happens, refresh and it's back" symptom users
 *      reported.
 *   2. DermaAI's own draggable launcher is gated by
 *      `!isControlled`, so passing controlled props disabled the
 *      drag-to-reposition + snap-to-edge UX that ships with the
 *      chat component.
 *
 * Both problems go away by letting DermaAI manage its own state
 * and own launcher. We just decide WHERE to mount it and wrap it
 * in an error boundary so a render crash inside the chat tree
 * can't take down the rest of the app chrome.
 */
export default function DermaAIMount() {
  const pathname = usePathname() || ''
  const blocked = BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )
  if (blocked) return null

  return (
    <RootErrorBoundary label="derma-ai">
      <DermaAI />
    </RootErrorBoundary>
  )
}
