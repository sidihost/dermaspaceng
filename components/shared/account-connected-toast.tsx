'use client'

/**
 * Account-connected confirmation toast.
 *
 * Watches the URL for the `?connected=<provider>` query parameter
 * that the Google / X OAuth callbacks append on a successful link,
 * fires a single brand toast ("Account connected"), and then strips
 * the parameter from the URL so a refresh doesn't re-show the toast.
 *
 * Mounted on every page that can be the OAuth landing destination
 * (today: /dashboard, /complete-profile).
 *
 * Returns nothing visible — it's a pure side-effect component.
 */

import * as React from 'react'
import { useNotify } from './notify'

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  x: 'X',
}

export function AccountConnectedToast() {
  const notify = useNotify()
  // Guard against React 18 strict-mode / fast refresh re-runs firing
  // the toast twice. We dedupe by URL so a second mount on the same
  // page (after the param has been stripped) is a no-op.
  const firedRef = React.useRef(false)

  React.useEffect(() => {
    if (firedRef.current) return
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const provider = params.get('connected')
    if (!provider) return

    firedRef.current = true

    const label = PROVIDER_LABEL[provider] ?? provider
    notify.success(
      'Account connected',
      `Signed in with ${label}. Welcome back to Dermaspace.`,
      { duration: 3600 },
    )

    // Strip the param from the URL without triggering a navigation —
    // a refresh shouldn't replay the toast and we don't want the
    // confirmation to live on in the user's history.
    params.delete('connected')
    const next =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : '') +
      window.location.hash
    window.history.replaceState(window.history.state, '', next)
  }, [notify])

  return null
}
