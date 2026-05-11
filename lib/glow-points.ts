/**
 * Glow Points — server-side award helper
 *
 * Glow Points are the loyalty-style reward currency granted on
 * membership signup. They are NOT money: they never appear in the
 * wallet ledger, never settle to naira, and never tie to a single
 * booking. They unlock site features and act as a visible "loyalty
 * badge" on the user's dashboard.
 *
 * This module is the single entry point for awarding (and, in the
 * future, redeeming) points. Every code path that grants Glow Points
 * MUST go through `awardGlowPoints` so we always:
 *
 *   * write a ledger row in `glow_points_log` (audit trail), AND
 *   * bump the running total on `users.glow_points` (denormalised
 *     for fast dashboard reads).
 *
 * Both happen inside the same transactional `sql` call so a crash
 * mid-way through can't leave the ledger and the running total
 * disagreeing.
 *
 * The unique partial index on
 * `(user_id, reason, reference) WHERE reference IS NOT NULL` (see
 * script 620) makes the membership-signup award path idempotent —
 * calling it twice for the same Paystack reference is a no-op.
 */

import { sql } from '@/lib/db'
import { invalidateUserMe } from '@/lib/redis'

/** Machine-readable reason codes for the ledger. Keep this list
 *  short and stable; the admin console pivots on it. */
export type GlowPointsReason =
  | 'membership_signup'
  | 'referral_bonus'
  | 'birthday_gift'
  | 'manual_adjustment'

export interface AwardGlowPointsInput {
  /** User receiving the points. */
  userId: string
  /** Positive integer; we coerce + floor below to defend against
   *  caller errors (decimal values, negative numbers, etc.). */
  delta: number
  /** Machine-readable reason — drives admin reporting. */
  reason: GlowPointsReason
  /** Free-text description shown in the user's Glow Points
   *  history panel. Optional. */
  description?: string
  /** Optional external reference (typically the Paystack reference
   *  for membership signups). When present, the unique partial
   *  index guarantees idempotency. */
  reference?: string | null
}

export interface AwardGlowPointsResult {
  /** True when this call inserted a new ledger row + bumped the
   *  running total. False when an idempotency duplicate was
   *  detected (same `(userId, reason, reference)` already exists)
   *  — callers can treat both as success but emails/notifications
   *  should only fire once. */
  awarded: boolean
  /** The user's new running total. Always populated, even when
   *  `awarded` is false (we re-read the column to be sure). */
  newBalance: number
}

/**
 * Awards Glow Points and returns the user's new running total.
 *
 * Idempotent when a `reference` is supplied (e.g. a Paystack
 * transaction reference). Re-running with the same reference is a
 * no-op — useful because the membership verify route can be hit
 * twice if the customer reloads the redirect.
 */
export async function awardGlowPoints(
  input: AwardGlowPointsInput,
): Promise<AwardGlowPointsResult> {
  const delta = Math.max(0, Math.floor(Number(input.delta) || 0))

  // Zero or negative awards are a caller bug, but we'd rather
  // tolerate them quietly than throw inside a payment finalisation
  // path. Read the existing balance so the caller still gets a
  // truthful response.
  if (delta === 0) {
    const rows = await sql`
      SELECT COALESCE(glow_points, 0)::int AS glow_points
      FROM users WHERE id = ${input.userId} LIMIT 1
    `
    return {
      awarded: false,
      newBalance: Number((rows[0] as { glow_points?: number })?.glow_points ?? 0),
    }
  }

  // 1. Insert the ledger row. The unique partial index on
  //    (user_id, reason, reference) WHERE reference IS NOT NULL
  //    makes this idempotent for references-carrying awards. We
  //    use RETURNING to find out whether a row actually landed.
  const insertResult = await sql`
    INSERT INTO glow_points_log (user_id, delta, reason, description, reference)
    VALUES (
      ${input.userId},
      ${delta},
      ${input.reason},
      ${input.description ?? null},
      ${input.reference ?? null}
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `
  const inserted = (insertResult as unknown[]).length > 0

  // 2. Bump the running total only when the ledger row actually
  //    landed. Skipping the UPDATE on duplicate avoids double-
  //    counting a re-played payment finalisation.
  if (inserted) {
    await sql`
      UPDATE users
      SET glow_points = COALESCE(glow_points, 0) + ${delta}
      WHERE id = ${input.userId}
    `
    // Invalidate the cached /api/auth/me response so the user's
    // dashboard reflects the new total on the next navigation.
    try {
      await invalidateUserMe(input.userId)
    } catch {
      // Best-effort cache bust — don't fail the award because Redis
      // is unhappy.
    }
  }

  // 3. Re-read so the caller always gets the authoritative balance.
  const rows = await sql`
    SELECT COALESCE(glow_points, 0)::int AS glow_points
    FROM users WHERE id = ${input.userId} LIMIT 1
  `
  return {
    awarded: inserted,
    newBalance: Number(
      (rows[0] as { glow_points?: number })?.glow_points ?? 0,
    ),
  }
}
