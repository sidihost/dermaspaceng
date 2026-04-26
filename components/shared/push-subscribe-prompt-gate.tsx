'use client'

/**
 * Auth + feature-flag gate around <PushSubscribePrompt />.
 *
 * The prompt itself is a "dumb" widget that takes an `enabled` boolean
 * — when true and the browser hasn't already opted in/out, it renders
 * the brand purple "Enable notifications" card after a short delay.
 *
 * This wrapper is the *policy* layer, kept separate so the prompt
 * stays trivially testable:
 *
 *   1. Only signed-in users get nudged. Anonymous visitors don't have
 *      a `user_id` to associate the push subscription with, so we'd
 *      just orphan rows in `push_subscriptions`.
 *   2. Admin can disable the entire push channel from
 *      /admin/features (`push_notifs` flag). Flipping it off makes
 *      the nudge disappear within ~30s site-wide without a deploy.
 *   3. Mounted at the layout root so the user gets the same
 *      one-time prompt no matter which page they first land on.
 */

import * as React from 'react'
import useSWR from 'swr'
import { useFeatureFlag } from '@/lib/use-feature-flag'
import { PushSubscribePrompt } from './push-subscribe-prompt'

const fetcher = (u: string) => fetch(u).then((r) => (r.ok ? r.json() : null))

export function PushSubscribePromptGate() {
  // SWR de-dupes with /api/auth/me calls elsewhere on the page (header,
  // dashboard, etc.) so this adds zero extra network cost.
  const { data } = useSWR<{ user?: { id: string } | null } | null>(
    '/api/auth/me',
    fetcher,
    { revalidateOnFocus: false },
  )
  const pushEnabled = useFeatureFlag('push_notifs')
  const isSignedIn = Boolean(data?.user?.id)
  return <PushSubscribePrompt enabled={isSignedIn && pushEnabled} />
}
