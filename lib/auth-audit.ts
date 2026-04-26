/**
 * Tamper-evident hash-chained audit log.
 *
 * Backs the `auth_audit_chain` table created in
 * `scripts/201-create-auth-audit-chain.sql`. Every critical auth
 * event (signup, signin, password change, role change, …) is
 * appended as a new row whose `this_hash` is SHA-256 over:
 *
 *   prev_hash || event_type || event_data || user_id || ip || ua || created_at
 *
 * (joined with the ASCII unit separator U+241F to prevent
 * concatenation collisions).
 *
 * Modifying or deleting any historical row breaks the chain at the
 * tampering point, and `verifyAuditChain()` will report the first
 * row whose recomputed hash no longer matches its stored value or
 * whose `prev_hash` no longer matches the previous row.
 *
 * Failure mode: `appendAuditEvent` swallows all errors. We never
 * want a logging failure to block a real auth flow — auditability
 * is a defence-in-depth feature, not part of the critical path.
 */

import { createHash } from 'crypto'
import { sql } from '@/lib/db'

export interface AuditEventInput {
  /** Event class. Free-form but conventionally one of:
   *  signup, signin, signin_failed, password_change, role_change,
   *  logout, 2fa_enabled, 2fa_disabled, password_reset_requested. */
  eventType: string
  /** Arbitrary structured context. Avoid raw secrets / PII you
   *  wouldn't want preserved permanently. */
  eventData?: Record<string, unknown>
  /** UUID of the user, when known. NULL for failed sign-ins on
   *  unknown emails (so we can still log the attempt). */
  userId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

const SEP = '\u241F' // ASCII unit separator — virtually never appears in inputs

function computeHash(parts: Array<string | null>): string {
  return createHash('sha256').update(parts.map((p) => p ?? '').join(SEP)).digest('hex')
}

/**
 * Append a new event to the audit chain.
 *
 * Returns `null` on any failure (table missing, race, transient DB
 * error). Callers MUST treat the return value as advisory only —
 * never gate auth on whether the audit succeeded.
 */
export async function appendAuditEvent(
  input: AuditEventInput,
): Promise<{ id: number; hash: string } | null> {
  try {
    const last = await sql`
      SELECT this_hash FROM auth_audit_chain ORDER BY id DESC LIMIT 1
    `
    const prevHash = (last[0]?.this_hash as string | null) || null

    const eventType = input.eventType
    const eventData = JSON.stringify(input.eventData ?? {})
    const userId = input.userId ?? null
    const ip = input.ipAddress ?? null
    const ua = input.userAgent ?? null
    const createdAt = new Date()

    const thisHash = computeHash([
      prevHash,
      eventType,
      eventData,
      userId,
      ip,
      ua,
      createdAt.toISOString(),
    ])

    const result = await sql`
      INSERT INTO auth_audit_chain
        (prev_hash, event_type, event_data, user_id, ip_address, user_agent, created_at, this_hash)
      VALUES
        (${prevHash}, ${eventType}, ${eventData}::jsonb, ${userId}, ${ip}, ${ua}, ${createdAt.toISOString()}, ${thisHash})
      RETURNING id, this_hash
    `
    return {
      id: Number(result[0].id),
      hash: result[0].this_hash as string,
    }
  } catch (error) {
    console.error('[v0] auth-audit append failed:', error)
    return null
  }
}

/**
 * Walk the entire chain and verify every row's hash. Used by the
 * admin "Verify integrity" button. O(n) over the table — fine for
 * audit purposes; you wouldn't run this on every page load.
 */
export async function verifyAuditChain(): Promise<{
  valid: boolean
  totalRows: number
  brokenAt?: number
  reason?: 'prev_hash_mismatch' | 'this_hash_mismatch'
}> {
  const rows = await sql`
    SELECT id, prev_hash, event_type, event_data, user_id, ip_address, user_agent, created_at, this_hash
    FROM auth_audit_chain
    ORDER BY id ASC
  `
  let lastHash: string | null = null
  for (const r of rows as Array<Record<string, unknown>>) {
    if ((r.prev_hash ?? null) !== lastHash) {
      return {
        valid: false,
        totalRows: rows.length,
        brokenAt: Number(r.id),
        reason: 'prev_hash_mismatch',
      }
    }
    const eventData =
      typeof r.event_data === 'string' ? r.event_data : JSON.stringify(r.event_data ?? {})
    const expected = computeHash([
      lastHash,
      r.event_type as string,
      eventData,
      (r.user_id as string | null) ?? null,
      (r.ip_address as string | null) ?? null,
      (r.user_agent as string | null) ?? null,
      new Date(r.created_at as string).toISOString(),
    ])
    if (expected !== r.this_hash) {
      return {
        valid: false,
        totalRows: rows.length,
        brokenAt: Number(r.id),
        reason: 'this_hash_mismatch',
      }
    }
    lastHash = r.this_hash as string
  }
  return { valid: true, totalRows: rows.length }
}
