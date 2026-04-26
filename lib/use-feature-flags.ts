'use client'

/**
 * Client-side feature-flag hook.
 *
 * Pulls the public flag map from /api/feature-flags and exposes it
 * via SWR. Components call `useFeature('booking')` and re-render
 * automatically when the flag changes (revalidates on focus + once
 * a minute via the public route's cache headers).
 *
 * Unknown keys default to TRUE — same default as the server-side
 * `isFeatureEnabled` — so a new feature added in the codebase is
 * never silently broken before its row exists in the DB.
 */

import useSWR from 'swr'

type FlagsResponse = { flags: Record<string, boolean> }

const fetcher = (url: string) =>
  fetch(url).then((r) => (r.ok ? r.json() : { flags: {} }))

export function useFeatureFlags() {
  const { data, isLoading } = useSWR<FlagsResponse>('/api/feature-flags', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  })
  const flags = data?.flags ?? {}
  return { flags, isLoading }
}

/** Convenience: single-flag hook. Returns true while loading. */
export function useFeature(key: string): boolean {
  const { flags, isLoading } = useFeatureFlags()
  if (isLoading && !(key in flags)) return true
  return flags[key] !== false
}
