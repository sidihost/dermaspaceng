'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { CURRENT_LEGAL_VERSION } from '@/lib/legal'
import { LegalAcceptanceModal } from './legal-acceptance-modal'

/**
 * <LegalAcceptanceGate />
 * --------------------------------------------------------------
 * Mounted ONCE in `components/layout/client-shell.tsx` so the gate
 * follows the user across every customer surface — landing page,
 * /services, /blog, /booking, the dashboard, anywhere. It does NOT
 * dim or wrap the underlying page; it simply overlays the
 * acceptance modal on top of whatever the user is currently
 * looking at the moment they're signed in with a stale legal
 * version.
 *
 * Why mount it globally instead of only on /dashboard
 * ----------------------------------------------------
 * Previously the gate only appeared once a user navigated to
 * `/dashboard/*`. That meant a returning user who tapped a deep
 * link (e.g. /booking, a treatment page from search, the home
 * page) could browse and even check out without re-accepting the
 * latest legal pack — because they never crossed the dashboard
 * tree until later. The gate now triggers immediately after
 * sign-in, regardless of where the user lands first.
 *
 * Decision rules:
 *   • Path is in the exclusion list → render nothing. We never
 *     interrupt sign-in / sign-up flows, the legal pages
 *     themselves, the admin/staff consoles, or the offline page.
 *   • Not signed in → render nothing. The gate is for authed
 *     users only; guests don't have a profile to record against.
 *   • Still loading on first paint → render nothing. Avoids a
 *     phantom modal flashing in for the half-second between
 *     localStorage cache + the first /api/auth/me round-trip.
 *   • Signed in AND legal version matches → render nothing.
 *   • Signed in AND mismatch (null OR an older version string) →
 *     render the acceptance modal in fixed-overlay mode.
 *
 * Once the user clicks "I accept", the modal POSTs
 * /api/legal/accept, dispatches a `user-updated` window event,
 * and the gate naturally unmounts because `useAuth()` revalidates
 * and the new `legalAcceptedVersion` matches.
 */

// Surfaces where the gate must NOT appear. Anything that's part of
// the auth flow itself (you can't accept terms before you have a
// session), the legal documents the modal links to (so users can
// actually read them), or the admin/staff consoles (where the gate
// would interrupt operational work).
const EXCLUDED_PATH_PREFIXES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/complete-profile',
  '/verify-email',
  '/offline',
  '/terms',
  '/privacy',
  '/derma-ai-terms',
  '/legal',
  '/admin',
  '/staff',
]

export function LegalAcceptanceGate() {
  const { user, isLoading } = useAuth()
  // Pathname can be null pre-hydration; coerce to '' so the
  // `.startsWith()` calls below don't crash the tree.
  const pathname = usePathname() ?? ''
  // Local "accepted" flag — flipped on the moment the modal
  // confirms a successful POST, so the modal disappears
  // immediately even if SWR hasn't re-fetched /api/auth/me yet.
  // Without this you'd see the modal blink for ~50ms before the
  // revalidation lands.
  const [justAccepted, setJustAccepted] = useState(false)

  // If the signed-in user changes underneath us (e.g. the user
  // signs out and back in as a different account in the same tab),
  // reset the local flag so the gate re-evaluates against the new
  // user's acceptance state.
  useEffect(() => {
    setJustAccepted(false)
  }, [user?.id])

  // Path-based exclusion — runs before any auth checks so we
  // don't even peek at the user state on excluded surfaces.
  if (EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  if (isLoading) return null
  if (!user) return null
  if (justAccepted) return null
  if (user.legalAcceptedVersion === CURRENT_LEGAL_VERSION) return null

  return (
    <LegalAcceptanceModal
      surface="dashboard-gate"
      dismissible={false}
      onAccepted={() => setJustAccepted(true)}
    />
  )
}
