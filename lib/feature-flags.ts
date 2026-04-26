/**
 * Feature flags
 *
 * Tiny server-side helper around the `feature_flags` table. Used by
 * both API routes (`/api/feature-flags`, admin endpoints) and any
 * server component that wants to gate rendering on a flag being on.
 *
 * Caching strategy
 * ----------------
 * Flag checks happen on EVERY page render — header, footer, chat
 * widget, every gated component. We layer two caches:
 *
 *   1. Redis (Upstash, shared across every serverless instance).
 *      60s TTL means an admin toggle propagates everywhere within a
 *      minute and we never hammer Postgres for this read.
 *
 *   2. In-process memory (5s TTL). The Redis call still costs a HTTP
 *      round-trip; this layer absorbs the burst when one request
 *      reads three or four flags in quick succession (the home
 *      page does exactly that).
 *
 * Writes invalidate BOTH layers. The in-process layer being so short
 * means we don't need a fan-out invalidation channel — the next read
 * on any other instance will hit Redis (fresh) within 5s anyway.
 */

import { sql } from './db'
import { delKey, getJson, KEYS, setJson } from './redis'

export type FeatureFlag = {
  key: string
  label: string
  description: string | null
  scope: 'site' | 'dashboard' | 'admin'
  enabled: boolean
  updated_at: string
}

const REDIS_TTL_SECONDS = 60
const MEMO_TTL_MS = 5_000
let memo: { at: number; rows: FeatureFlag[] } | null = null

export async function getAllFlags(force = false): Promise<FeatureFlag[]> {
  if (!force && memo && Date.now() - memo.at < MEMO_TTL_MS) {
    return memo.rows
  }

  // Layer 1: shared Redis cache. The whole `feature_flags` table fits
  // comfortably under Redis's payload limits — there'll never be more
  // than a few dozen rows.
  if (!force) {
    const cached = await getJson<FeatureFlag[]>(KEYS.featureFlags)
    if (cached) {
      memo = { at: Date.now(), rows: cached }
      return cached
    }
  }

  try {
    const rows = (await sql`
      SELECT key, label, description, scope, enabled, updated_at
      FROM feature_flags
      ORDER BY scope, label
    `) as unknown as FeatureFlag[]

    memo = { at: Date.now(), rows }
    // Best-effort write-through. Failure here just means the next
    // request takes the Postgres path — no correctness impact.
    await setJson(KEYS.featureFlags, rows, REDIS_TTL_SECONDS)
    return rows
  } catch {
    // Table missing in dev / before migration runs — treat as empty so
    // the site still works.
    return memo?.rows ?? []
  }
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getAllFlags()
  const flag = flags.find((f) => f.key === key)
  // Default to TRUE for unknown keys so a missing flag never silently
  // takes down a feature in production.
  return flag ? flag.enabled : true
}

export async function setFeatureEnabled(
  key: string,
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  await sql`
    UPDATE feature_flags
    SET enabled = ${enabled}, updated_by = ${updatedBy}, updated_at = NOW()
    WHERE key = ${key}
  `
  await invalidateFeatureFlagCache()
}

export async function invalidateFeatureFlagCache(): Promise<void> {
  memo = null
  await delKey(KEYS.featureFlags)
}
