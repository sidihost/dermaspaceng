'use client'

/**
 * /logout
 *
 * The dedicated "Signing you out…" screen. Every sign-out button in
 * the app funnels through `logoutAndRedirect`, which now hands off to
 * this route instead of doing the teardown under a transient overlay.
 * Landing on a real page means the user always gets a clear, on-brand
 * confirmation that the logout is happening rather than a flicker.
 *
 * On mount it calls `performLogout`, which deletes the session
 * server-side, clears the cached user, and hard-navigates to the
 * (validated, internal-only) redirect target.
 */

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { performLogout } from '@/lib/logout'

// Only allow same-origin paths as the post-logout destination so the
// `?redirect=` param can never be turned into an open redirect.
function safeRedirect(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

function LogoutRunner() {
  const params = useSearchParams()
  const redirectTo = safeRedirect(params.get('redirect'))

  React.useEffect(() => {
    // Small, deliberate beat so the message is readable without delaying
    // the signed-out state after the user has explicitly tapped Sign out.
    const t = window.setTimeout(() => {
      void performLogout(redirectTo)
    }, 250)
    return () => window.clearTimeout(t)
  }, [redirectTo])

  return null
}

export default function LogoutPage() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-white px-6 text-center"
    >
      <Suspense fallback={null}>
        <LogoutRunner />
      </Suspense>

      <div
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#7B2D8E]/20 border-t-[#7B2D8E]"
      />
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Signing you out…</h1>
        <p className="mt-1 text-sm text-gray-500">
          Hang tight — we&apos;re ending your session securely.
        </p>
      </div>
    </main>
  )
}
