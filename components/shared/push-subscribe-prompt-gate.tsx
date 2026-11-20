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
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useFeatureFlag } from '@/lib/use-feature-flag'
import { shouldEnablePushPrompt } from '@/lib/push-prompt-helpers'
import { syncBrowserPushSubscription } from './permissions-panel'
import { PushSubscribePrompt } from './push-subscribe-prompt'

export function PushSubscribePromptGate() {
  const pathname = usePathname() ?? ''
  const { user, isAuthenticated } = useAuth()
  const pushEnabled = useFeatureFlag('push_notifs')
  const isSignedIn = isAuthenticated && Boolean(user?.id)
  const role = user?.role

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
