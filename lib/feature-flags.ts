/**
 * Feature flags
 *
 * Tiny server-side helper around the `feature_flags` table. Used by
 * both API routes (`/api/feature-flags`, admin endpoints) and any
 * server component that wants to gate rendering on a flag being on.
 *
 * In-memory cache keeps DB reads to roughly one per minute per
 * serverless instance — flag checks should never be a hot path.
 */

import { sql } from './db'

export type FeatureFlag = {
  key: string
  label: string
  description: string | null
  scope: 'site' | 'dashboard' | 'admin'
  enabled: boolean
  updated_at: string
}

const CACHE_TTL_MS = 60_000
let cache: { at: number; rows: FeatureFlag[] } | null = null

export async function getAllFlags(force = false): Promise<FeatureFlag[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.rows
  }
  try {
    const rows = (await sql`
      SELECT key, label, description, scope, enabled, updated_at
      FROM feature_flags
      ORDER BY scope, label
    `) as unknown as FeatureFlag[]
    cache = { at: Date.now(), rows }
    return rows
  } catch {
    // Table missing in dev / before migration runs — treat as empty so
    // the site still works.
    return cache?.rows ?? []
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
  cache = null
}

export function invalidateFeatureFlagCache() {
  cache = null
}
