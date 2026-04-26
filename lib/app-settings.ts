// ---------------------------------------------------------------------------
// lib/app-settings.ts
//
// Tiny key/value layer over the `app_settings` table. Used today for
// the maintenance-mode flag; designed to grow into other admin-flipped
// switches (read-only mode, signup disable, etc.) without further
// migrations.
//
// Everything is read-through cached for 5s in-process so the
// middleware (which fires on every request) doesn't hammer the DB.
// 5 seconds is short enough that an admin flipping the toggle sees
// the effect almost immediately, but long enough to absorb traffic
// bursts comfortably.
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'

export interface MaintenanceSettings {
  enabled: boolean
  message: string
  /** ISO 8601 string or null. UI surfaces this on the maintenance page. */
  eta: string | null
}

const DEFAULT_MAINTENANCE: MaintenanceSettings = {
  enabled: false,
  message: "We're polishing things up. Back in a moment.",
  eta: null,
}

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const CACHE_TTL_MS = 5_000
const cache = new Map<string, CacheEntry<unknown>>()

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const cached = cache.get(key) as CacheEntry<T> | undefined
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }
  try {
    const rows = await sql`
      SELECT value
      FROM app_settings
      WHERE key = ${key}
      LIMIT 1
    `
    const value = rows[0]?.value as T | undefined
    const out = value ?? fallback
    cache.set(key, { value: out, expiresAt: Date.now() + CACHE_TTL_MS })
    return out
  } catch (err) {
    // If `app_settings` doesn't exist yet (e.g. we're on a fresh
    // branch that hasn't run migrations), don't crash callers —
    // return the fallback. The middleware in particular MUST not
    // throw, or the whole site would 500.
    console.warn(`[app-settings] read failed for key=${key}:`, err)
    return fallback
  }
}

async function writeSetting<T>(key: string, value: T, updatedBy: string | null): Promise<void> {
  await sql`
    INSERT INTO app_settings (key, value, updated_by, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${updatedBy}, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value      = EXCLUDED.value,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
  `
  cache.delete(key)
}

/** Read the current maintenance flag. Cheap (cached) — safe to call from
 *  hot paths like middleware. */
export async function getMaintenance(): Promise<MaintenanceSettings> {
  const raw = await readSetting<Partial<MaintenanceSettings>>('maintenance', DEFAULT_MAINTENANCE)
  // Defensive normalisation — JSONB can in principle hold anything.
  return {
    enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : DEFAULT_MAINTENANCE.enabled,
    message: typeof raw?.message === 'string' && raw.message.trim() !== ''
      ? raw.message
      : DEFAULT_MAINTENANCE.message,
    eta: typeof raw?.eta === 'string' && raw.eta !== '' ? raw.eta : null,
  }
}

/** Persist a new maintenance state. Admin-only — caller is responsible
 *  for `requireAdmin()`. */
export async function setMaintenance(
  next: MaintenanceSettings,
  updatedBy: string | null,
): Promise<void> {
  await writeSetting('maintenance', next, updatedBy)
}

/** Force the in-process cache to drop a key. Useful from API routes
 *  that have just written a new value and want the next read on the
 *  same instance to see it immediately, without waiting on the TTL. */
export function invalidateAppSetting(key: string) {
  cache.delete(key)
}
