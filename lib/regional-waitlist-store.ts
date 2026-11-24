// ---------------------------------------------------------------------------
// Server-side persistence for the Dermaspace Regional Expansion Waitlist.
//
// Stores entries as a JSONB array inside `app_settings` (`key =
// 'regional_waitlist'`), requiring zero new database migrations, with a
// graceful in-memory fallback when `DATABASE_URL` is absent.
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'
import type { RegionalWaitlistInput } from '@/lib/international-regions'

export interface RegionalWaitlistRecord extends RegionalWaitlistInput {
  detectedCountry: string | null
  createdAt: string
  updatedAt: string
}

const SETTINGS_KEY = 'regional_waitlist'
const MAX_ENTRIES = 2000

let memoryEntries: RegionalWaitlistRecord[] = []

async function readEntries(): Promise<RegionalWaitlistRecord[]> {
  if (!process.env.DATABASE_URL) {
    return memoryEntries
  }
  try {
    const rows = await sql`
      SELECT value
      FROM app_settings
      WHERE key = ${SETTINGS_KEY}
      LIMIT 1
    `
    const val = rows[0]?.value
    if (Array.isArray(val)) {
      return val as RegionalWaitlistRecord[]
    }
    return []
  } catch (err) {
    console.warn('[regional-waitlist] failed to read from DB, using memory fallback:', err)
    return memoryEntries
  }
}

export async function saveRegionalWaitlistEntry(
  input: RegionalWaitlistInput,
  detectedCountry: string | null,
): Promise<{ record: RegionalWaitlistRecord; alreadyJoined: boolean }> {
  const now = new Date().toISOString()
  const existing = await readEntries()

  const idx = existing.findIndex(
    (entry) =>
      entry.email.toLowerCase() === input.email.toLowerCase() &&
      entry.region.toUpperCase() === input.region.toUpperCase(),
  )

  let nextList: RegionalWaitlistRecord[]
  let record: RegionalWaitlistRecord
  let alreadyJoined = false

  if (idx !== -1) {
    alreadyJoined = true
    const prev = existing[idx]
    record = {
      ...prev,
      name: input.name || prev.name,
      city: input.city || prev.city,
      detectedCountry: detectedCountry || prev.detectedCountry,
      updatedAt: now,
    }
    nextList = [...existing]
    nextList[idx] = record
  } else {
    record = {
      ...input,
      detectedCountry,
      createdAt: now,
      updatedAt: now,
    }
    nextList = [record, ...existing].slice(0, MAX_ENTRIES)
  }

  memoryEntries = nextList

  if (process.env.DATABASE_URL) {
    try {
      await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (${SETTINGS_KEY}, ${JSON.stringify(nextList)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
      `
    } catch (err) {
      console.warn('[regional-waitlist] failed to persist to DB:', err)
    }
  }

  return { record, alreadyJoined }
}
