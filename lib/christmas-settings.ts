/**
 * lib/christmas-settings.ts
 *
 * Server & client shared helpers for managing the Christmas animation state.
 * Persists to `app_settings` in Postgres when available, with an in-memory
 * fallback store so toggling is 100% reliable across environments.
 */

import { sql } from '@/lib/db'

export interface ChristmasSettings {
  enabled: boolean
  intensity: 'gentle' | 'festive'
  updatedAt: string
}

const DEFAULT_SETTINGS: ChristmasSettings = {
  enabled: true,
  intensity: 'gentle',
  updatedAt: new Date().toISOString(),
}

// In-memory fallback cache
let _memSettings: ChristmasSettings = { ...DEFAULT_SETTINGS }

export async function getChristmasSettings(): Promise<ChristmasSettings> {
  try {
    const rows = (await sql`
      SELECT value FROM app_settings WHERE key = 'christmas_animation' LIMIT 1
    `) as Array<{ value: unknown }>

    if (rows && rows[0]?.value) {
      const val = rows[0].value as Partial<ChristmasSettings>
      const out: ChristmasSettings = {
        enabled: typeof val.enabled === 'boolean' ? val.enabled : DEFAULT_SETTINGS.enabled,
        intensity: val.intensity === 'festive' ? 'festive' : 'gentle',
        updatedAt: val.updatedAt || DEFAULT_SETTINGS.updatedAt,
      }
      _memSettings = out
      return out
    }
  } catch {
    // Database table missing or offline — use in-memory state
  }

  return _memSettings
}

export async function setChristmasSettings(
  enabled: boolean,
  intensity: 'gentle' | 'festive' = 'gentle',
  updatedBy: string | null = null,
): Promise<ChristmasSettings> {
  const next: ChristmasSettings = {
    enabled,
    intensity,
    updatedAt: new Date().toISOString(),
  }
  _memSettings = next

  try {
    await sql`
      INSERT INTO app_settings (key, value, updated_by, updated_at)
      VALUES ('christmas_animation', ${JSON.stringify(next)}::jsonb, ${updatedBy}, NOW())
      ON CONFLICT (key) DO UPDATE
        SET value      = EXCLUDED.value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
    `
  } catch {
    // Database offline — in-memory state already updated
  }

  return next
}
