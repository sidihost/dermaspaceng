'use client'

/**
 * Client-side feature flag hook.
 *
 * Wraps SWR around `/api/feature-flags`, which returns a flat
 * `{ key: enabled }` map of every flag in the database. The hook
 * keeps a single shared SWR cache key so dozens of gated components
 * across the tree de-dupe to ONE network request and ONE in-memory
 * map per page.
 *
 * Defaults:
 *  - While SWR is loading the first response, the flag returns
 *    `true`. This is intentional. We never want a brief pre-hydration
 *    window where, say, the AI launcher pops in and out — flags are
 *    used to TURN OFF features that already exist, so "show by
 *    default" is the safe answer.
 *  - Unknown keys (flag doesn't exist in the DB) also return `true`
 *    — same reasoning. A typo in a flag key must never silently kill
 *    a production feature.
 */

import useSWR from 'swr'

type FlagsResponse = { flags: Record<string, boolean> }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useFeatureFlag(key: string): boolean {
  const { data } = useSWR<FlagsResponse>(
    '/api/feature-flags',
    fetcher,
    {
      revalidateOnFocus: false,
      // Re-poll every 2 minutes so admin toggles propagate without
      // requiring a hard reload. Cheap because the response is
      // CDN-cached for 30s with SWR.
      refreshInterval: 2 * 60_000,
    },
  )
  if (!data) return true
  if (!(key in data.flags)) return true
  return data.flags[key]
}

/**
 * Bulk variant — returns the whole map. Useful for admin dashboards
 * that surface multiple gated capabilities in one render and want
 * to avoid calling the hook in a loop.
 */
export function useFeatureFlags(): Record<string, boolean> {
  const { data } = useSWR<FlagsResponse>('/api/feature-flags', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 2 * 60_000,
  })
  return data?.flags ?? {}
}
