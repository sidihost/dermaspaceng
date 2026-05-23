import type { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

/**
 * Internal helper: append a row to `profile_change_log` whenever a
 * user-visible profile field actually changes value.
 *
 * Why a server-side helper instead of a DB trigger:
 *   - We want context the DB doesn't have: WHO is changing it (the
 *     impersonator vs the user themselves) and FROM WHAT surface
 *     ('settings page' vs 'admin'). A trigger would only see the
 *     row's `updated_at`.
 *   - We can short-circuit "no-op" PUTs (user resaves the form
 *     without changing anything) so we don't pollute the audit log
 *     with empty rows.
 *
 * Inputs:
 *   - `userId`: the user the change applies to.
 *   - `changedBy`: the user actually performing the change. Same as
 *     `userId` for self-edits, different for admin edits /
 *     impersonation.
 *   - `surface`: 'self' | 'admin' | 'impersonation'.
 *   - `changes`: a record of { field: { old, new } } — values are
 *     coerced to nullable strings so the audit log can store
 *     anything (booleans, numbers, ids).
 *   - `request`: optional NextRequest so we can capture IP / UA.
 */
export type ProfileFieldValue = string | number | boolean | null | undefined

export interface ProfileChangePayload {
  userId: string
  changedBy: string
  surface?: 'self' | 'admin' | 'impersonation'
  changes: Record<string, { old: ProfileFieldValue; new: ProfileFieldValue }>
  request?: NextRequest | Request
}

const stringify = (v: ProfileFieldValue): string | null => {
  if (v === undefined || v === null) return null
  if (typeof v === 'string') return v.trim() === '' ? null : v
  return String(v)
}

const headerValue = (req: NextRequest | Request | undefined, name: string): string | null => {
  if (!req) return null
  const h = (req as NextRequest).headers
  return h?.get(name) ?? null
}

export async function logProfileChanges(payload: ProfileChangePayload): Promise<void> {
  const { userId, changedBy, surface = 'self', changes, request } = payload

  // Build the list of fields that actually changed. Comparing the
  // *normalised* string forms means a save that "changes" "Itunu"
  // → "Itunu" (whitespace edits, etc.) doesn't get logged.
  const rows: Array<{ field: string; oldValue: string | null; newValue: string | null }> = []
  for (const [field, { old, new: next }] of Object.entries(changes)) {
    const oldS = stringify(old)
    const newS = stringify(next)
    if (oldS === newS) continue
    rows.push({ field, oldValue: oldS, newValue: newS })
  }
  if (rows.length === 0) return

  // Best-effort capture — IP often arrives via x-forwarded-for in a
  // CDN / proxy chain. We take the LEFT-most (the original client),
  // matching how every other lib in this repo reads the header.
  const xff = headerValue(request, 'x-forwarded-for')
  const ip = xff ? xff.split(',')[0]?.trim() : null
  const ua = headerValue(request, 'user-agent')

  // Insert one row per changed field. We keep the surface +
  // changed_by + ip/ua identical across the batch so the audit log
  // preserves the "atomic" save the user actually made.
  for (const r of rows) {
    try {
      await sql`
        INSERT INTO profile_change_log
          (user_id, field, old_value, new_value, surface, changed_by, ip_address, user_agent)
        VALUES
          (${userId}, ${r.field}, ${r.oldValue}, ${r.newValue}, ${surface}, ${changedBy}, ${ip}, ${ua})
      `
    } catch (err) {
      // Audit logging must NEVER break the user's save. Swallow and
      // surface to the server logs so on-call can investigate.
      console.error('[profile-history] insert failed', { field: r.field, err })
    }
  }
}
