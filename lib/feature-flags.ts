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
import { getCurrentUserCached } from './auth'

/**
 * A flag's visibility is a 3-way state:
 *   'on'      -> everyone sees it
 *   'preview' -> only admins + staff see it (internal testing)
 *   'off'     -> nobody sees it
 *
 * The legacy `enabled` boolean is kept in sync (enabled = visibility !== 'off')
 * so older code that reads `enabled` still behaves, while the preview
 * restriction is enforced by the role-aware helpers below.
 */
export type FeatureVisibility = 'on' | 'preview' | 'off'

export type FeatureFlag = {
  key: string
  label: string
  description: string | null
  scope: 'site' | 'dashboard' | 'admin'
  enabled: boolean
  visibility: FeatureVisibility
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
  // than a few dozen rows. Redis being unavailable (e.g. env vars not
  // set in a preview environment) must NOT break flag reads, so this is
  // fully best-effort.
  if (!force) {
    try {
      const cached = await getJson<FeatureFlag[]>(KEYS.featureFlags)
      if (cached) {
        memo = { at: Date.now(), rows: cached }
        return cached
      }
    } catch {
      /* Redis unavailable — fall through to Postgres. */
    }
  }

  try {
    const rows = (await sql`
      SELECT key, label, description, scope, enabled,
             COALESCE(visibility, CASE WHEN enabled THEN 'on' ELSE 'off' END) AS visibility,
             updated_at
      FROM feature_flags
      ORDER BY scope, label
    `) as unknown as FeatureFlag[]

    memo = { at: Date.now(), rows }

    // Best-effort write-through. A Redis failure here must never discard
    // the rows we just read from Postgres — wrap it separately so the
    // outer catch is reserved for real "can't read flags" failures.
    try {
      await setJson(KEYS.featureFlags, rows, REDIS_TTL_SECONDS)
    } catch {
      /* Redis unavailable — the next request just re-reads Postgres. */
    }

    return rows
  } catch {
    // Table missing in dev / before migration runs — treat as empty so
    // the site still works.
    return memo?.rows ?? []
  }
}

/**
 * Whether the current session is allowed to see features that are in
 * 'preview' (admin-only) mode. Admins and staff qualify; everyone else
 * (regular users, signed-out, background jobs with no request context)
 * does not.
 */
async function currentUserCanPreview(): Promise<boolean> {
  try {
    const user = await getCurrentUserCached()
    return !!user && (user.role === 'admin' || user.role === 'staff')
  } catch {
    // No request context (cron/QStash/background) — treat as public.
    return false
  }
}

/** Resolve a visibility value against a preview-capable flag. */
export function resolveVisibility(
  visibility: FeatureVisibility,
  canPreview: boolean,
): boolean {
  if (visibility === 'on') return true
  if (visibility === 'off') return false
  return canPreview // 'preview'
}

/**
 * Role-aware feature check. Returns true when the CURRENT viewer should
 * see the feature:
 *   - 'on'      -> always
 *   - 'off'     -> never
 *   - 'preview' -> only admins + staff
 *
 * Unknown keys default to TRUE so a missing flag never silently takes
 * down a feature. Because this resolves the current user, every server
 * gate that already calls `isFeatureEnabled` (booking page, API routes,
 * gift-cards, vouchers, signups) automatically supports admin preview
 * with no further changes.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getAllFlags()
  const flag = flags.find((f) => f.key === key)
  if (!flag) return true
  if (flag.visibility === 'on') return true
  if (flag.visibility === 'off') return false
  return currentUserCanPreview()
}

/**
 * Like `isFeatureEnabled` but also reports whether the viewer is only
 * seeing the feature because they're an admin/staff previewing it while
 * it's hidden from the public. Used to render a "preview mode" banner.
 */
export async function getFeatureAccess(
  key: string,
): Promise<{ visible: boolean; previewOnly: boolean }> {
  const flags = await getAllFlags()
  const flag = flags.find((f) => f.key === key)
  if (!flag) return { visible: true, previewOnly: false }
  if (flag.visibility === 'on') return { visible: true, previewOnly: false }
  if (flag.visibility === 'off') return { visible: false, previewOnly: false }
  const canPreview = await currentUserCanPreview()
  return { visible: canPreview, previewOnly: canPreview }
}

/**
 * Build the flat { key: enabled } map the public/client endpoint serves,
 * resolved for the current viewer. Resolves the user at most once, and
 * only when at least one flag is actually in preview mode.
 */
export async function getEffectiveFlagMap(): Promise<Record<string, boolean>> {
  const flags = await getAllFlags()
  const hasPreview = flags.some((f) => f.visibility === 'preview')
  const canPreview = hasPreview ? await currentUserCanPreview() : false
  const map: Record<string, boolean> = {}
  for (const f of flags) map[f.key] = resolveVisibility(f.visibility, canPreview)
  return map
}

export async function setFeatureVisibility(
  key: string,
  visibility: FeatureVisibility,
  updatedBy: string,
): Promise<void> {
  // Keep the legacy `enabled` boolean mirrored so any un-migrated reader
  // still behaves (a preview flag reads as enabled; the role check is
  // what restricts it).
  await sql`
    UPDATE feature_flags
    SET visibility = ${visibility},
        enabled = ${visibility !== 'off'},
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE key = ${key}
  `
  await invalidateFeatureFlagCache()
}

export async function setFeatureEnabled(
  key: string,
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  await sql`
    UPDATE feature_flags
    SET enabled = ${enabled},
        visibility = ${enabled ? 'on' : 'off'},
        updated_by = ${updatedBy},
        updated_at = NOW()
    WHERE key = ${key}
  `
  await invalidateFeatureFlagCache()
}

export async function invalidateFeatureFlagCache(): Promise<void> {
  memo = null
  try {
    await delKey(KEYS.featureFlags)
  } catch {
    /* Redis unavailable — the in-process memo reset above is enough;
       the short MEMO_TTL means other instances re-read Postgres soon. */
  }
}
