/**
 * <FeatureGate flag="..."> — server-side feature flag wrapper.
 *
 * Renders `children` only when the flag in `feature_flags` is on.
 * Otherwise renders `fallback` (defaults to nothing).
 *
 * This is a server component on purpose:
 *   - The flag value comes from Postgres via the Redis-backed
 *     `getAllFlags()` cache, so there's no extra round-trip per
 *     gated section.
 *   - Server-side gating means the disabled feature literally
 *     doesn't ship to the browser — no flash of content while a
 *     client hook resolves, no chance of bypass via DevTools.
 *
 * Use this from any Server Component that wants to conditionally
 * render a section, navigation link, or page block. For client
 * components that need the flag value, see `useFeatureFlag()` in
 * `lib/use-feature-flag.ts`.
 */

import { isFeatureEnabled } from '@/lib/feature-flags'

export async function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const enabled = await isFeatureEnabled(flag)
  return <>{enabled ? children : fallback}</>
}
