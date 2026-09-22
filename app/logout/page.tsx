'use client'

/**
 * /logout
 *
 * Fallback route for deep links (bookmarks, the `/sign-out` username
 * aliases). Sign-out buttons in the app call `logoutAndRedirect`
 * directly and never land here. On mount it immediately performs the
 * logout and hard-navigates to the (same-origin only) redirect target,
 * so the page is effectively invisible.
 */

import * as React from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { performLogout } from '@/lib/logout'

function safeRedirect(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

function LogoutRunner() {
  const params = useSearchParams()
  const redirectTo = safeRedirect(params.get('redirect'))

  React.useEffect(() => {
    void performLogout(redirectTo)
  }, [redirectTo])

  return null
}

export default function LogoutPage() {
  return (
    <main className="min-h-[100dvh] bg-white" aria-busy="true">
      <span className="sr-only">Signing you out</span>
      <Suspense fallback={null}>
        <LogoutRunner />
      </Suspense>
    </main>
  )
}
