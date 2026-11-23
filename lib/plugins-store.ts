// ---------------------------------------------------------------------------
// Server-side plugin registry storage
//
// Persists installed plugins in Postgres `app_settings` under key
// `'installed_plugins'`, following the same resilient pattern as
// `lib/christmas-settings.ts` (short in-process cache + graceful in-memory
// fallback when `DATABASE_URL` is absent in local preview).
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'
import type { InstalledPlugin } from '@/lib/plugins'

const SETTINGS_KEY = 'installed_plugins'
const CACHE_TTL_MS = 5_000

let memPlugins: InstalledPlugin[] = []
let cacheExpiresAt = 0

function normalizeList(raw: unknown): InstalledPlugin[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is InstalledPlugin =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as InstalledPlugin).slug === 'string' &&
      typeof (item as InstalledPlugin).name === 'string',
  )
}

export async function getInstalledPlugins(force = false): Promise<InstalledPlugin[]> {
  if (!force && cacheExpiresAt > Date.now()) {
    return memPlugins
  }

  if (!process.env.DATABASE_URL) {
    return memPlugins
  }

  try {
    const rows = (await sql`
      SELECT value
      FROM app_settings
      WHERE key = ${SETTINGS_KEY}
      LIMIT 1
    `) as Array<{ value: unknown }>

    if (rows && rows[0]?.value !== undefined) {
      memPlugins = normalizeList(rows[0].value)
      cacheExpiresAt = Date.now() + CACHE_TTL_MS
      return memPlugins
    }
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return memPlugins
  } catch (err) {
    console.warn('[plugins-store] read failed, using in-memory fallback:', err)
    return memPlugins
  }
}

export async function saveInstalledPlugins(
  next: InstalledPlugin[],
  updatedBy: string | null,
): Promise<InstalledPlugin[]> {
  memPlugins = next
  cacheExpiresAt = Date.now() + CACHE_TTL_MS

  if (!process.env.DATABASE_URL) {
    return memPlugins
  }

  try {
    await sql`
      INSERT INTO app_settings (key, value, updated_by, updated_at)
      VALUES (${SETTINGS_KEY}, ${JSON.stringify(next)}::jsonb, ${updatedBy}, NOW())
      ON CONFLICT (key) DO UPDATE
        SET value      = EXCLUDED.value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
    `
  } catch (err) {
    console.warn('[plugins-store] write failed, retained in memory:', err)
  }

  return memPlugins
}
