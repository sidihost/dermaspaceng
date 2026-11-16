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

const fetcher = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null))

export function PushSubscribePromptGate() {
  const pathname = usePathname() ?? ''
  const { data } = useSWR<{ user?: { id: string; role?: string } | null } | null>(
    '/api/auth/me',
    fetcher,
    { revalidateOnFocus: false },
  )
  const pushEnabled = useFeatureFlag('push_notifs')
  const isSignedIn = Boolean(data?.user?.id)
  const role = data?.user?.role

  React.useEffect(() => {
    if (!isSignedIn || !pushEnabled) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    void syncBrowserPushSubscription()
  }, [isSignedIn, pushEnabled])

  const enabled = shouldEnablePushPrompt({
    pathname,
    role,
    pushFlagEnabled: pushEnabled,
  })

  return <PushSubscribePrompt enabled={enabled} isSignedIn={isSignedIn} />
}
