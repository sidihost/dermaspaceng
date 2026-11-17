'use client'

/**
 * Auth + feature-flag policy gate around <PushSubscribePrompt />.
 *
 * Keeps route/role/feature-flag policy cleanly separated from the
 * presentational notification prompt, and automatically syncs a
 * Web Push subscription whenever a signed-in user already granted
 * browser notification permission.
 */

import * as React from 'react'
import useSWR from 'swr'
import { usePathname } from 'next/navigation'
import { useFeatureFlag } from '@/lib/use-feature-flag'
import { shouldEnablePushPrompt } from '@/lib/push-prompt-helpers'
import { syncBrowserPushSubscription } from './permissions-panel'
import { PushSubscribePrompt } from './push-subscribe-prompt'

const fetcher = async (u: string) => {
  const r = await fetch(u, { credentials: 'include', cache: 'no-store' })
  if (!r.ok) return null
  return r.json()
}

export function PushSubscribePromptGate() {
  const pathname = usePathname() ?? ''
  const { data, mutate } = useSWR<{ user?: { id: string; role?: string } | null } | null>(
    '/api/auth/me',
    fetcher,
    { revalidateOnFocus: false },
  )
  const pushEnabled = useFeatureFlag('push_notifs')
  const isSignedIn = Boolean(data?.user?.id)
  const role = data?.user?.role

  React.useEffect(() => {
    const onLogout = () => {
      void mutate(null, { revalidate: false })
    }
    const onUserUpdated = () => {
      void mutate()
    }
    window.addEventListener('auth-logout', onLogout)
    window.addEventListener('user-updated', onUserUpdated)
    return () => {
      window.removeEventListener('auth-logout', onLogout)
      window.removeEventListener('user-updated', onUserUpdated)
    }
  }, [mutate])

  React.useEffect(() => {
    if (!isSignedIn || !pushEnabled) return
    if (role === 'admin' || role === 'staff') return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    void syncBrowserPushSubscription()
  }, [isSignedIn, pushEnabled, role])

  const enabled = shouldEnablePushPrompt({
    pathname,
    isSignedIn,
    role,
    pushFlagEnabled: pushEnabled,
  })

  return <PushSubscribePrompt enabled={enabled} isSignedIn={isSignedIn} />
}
