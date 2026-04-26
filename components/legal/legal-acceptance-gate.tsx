'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { CURRENT_LEGAL_VERSION } from '@/lib/legal'
import { LegalAcceptanceModal } from './legal-acceptance-modal'

/**
 * <LegalAcceptanceGate />
 * --------------------------------------------------------------
 * Mounted once at the dashboard layout level. It does NOT wrap or
 * dim the dashboard content — the dashboard pages render normally
 * underneath, and this component overlays the modal on top when
 * the currently-signed-in user hasn't accepted the latest legal
 * pack yet.
 *
 * Decision rules:
 *   * Not signed in → render nothing (gate is dashboard-only).
 *   * Still loading on first paint → render nothing (the rest of
 *     the dashboard will paint via its own loading states; we
 *     don't want a "phantom modal" flashing while we figure out
 *     who you are).
 *   * Signed in AND `legalAcceptedVersion === CURRENT_LEGAL_VERSION`
 *     → render nothing.
 *   * Signed in AND mismatch (null OR older string) → render the
 *     acceptance modal in fixed-overlay mode.
 *
 * Once the user clicks "I accept", the modal POSTs /api/legal/accept,
 * dispatches a `user-updated` event, and the gate naturally
 * unmounts because `useAuth()` revalidates and the new
 * `legalAcceptedVersion` matches.
 */
export function LegalAcceptanceGate() {
  const { user, isLoading } = useAuth()
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
