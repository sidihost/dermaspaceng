// ---------------------------------------------------------------------------
// Signup email-verification OTP (one-time code).
//
// Replaces the old click-through verification *link* with a short 6-digit
// code the user types back into the signup wizard. The code is the only
// thing standing between "account created (unverified)" and "verified +
// auto-logged-in", so we treat it like any other auth secret:
//
//   • stored in Redis (ephemeral, never in Postgres) keyed by the user's
//     email, with a 10-minute TTL so a leaked code is useless minutes later
//   • compared with a constant-time-ish equality so timing can't leak digits
//   • attempt-limited (5 tries) so the 1-in-a-million code can't be brute
//     forced inside its 10-minute life
//
// All helpers fail-soft on Redis hiccups in the same spirit as lib/redis.ts —
// but verification itself fails CLOSED (a missing/expired code is a failed
// verification, never an accidental pass).
// ---------------------------------------------------------------------------

import { getRedis } from '@/lib/redis'

const OTP_TTL_SECONDS = 10 * 60 // 10 minutes
const MAX_ATTEMPTS = 5

function codeKey(email: string): string {
  return `signup:otp:${email.toLowerCase()}`
}

function attemptsKey(email: string): string {
  return `signup:otp:attempts:${email.toLowerCase()}`
}

/**
 * Generate a cryptographically-random 6-digit code (000000–999999).
 * We pad to a fixed 6 chars so codes like `004217` keep their leading
 * zeros — important since the email and the input both treat it as a
 * string, not a number.
 */
export function generateOtp(): string {
  // crypto.randomInt is uniformly distributed and available in the Node
  // runtime our route handlers run under.
  const { randomInt } = require('crypto') as typeof import('crypto')
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/**
 * Store (or overwrite) the pending code for an email and reset the
 * attempt counter. Called when the user first requests a code AND when
 * they ask for a resend.
 */
export async function storeOtp(email: string, code: string): Promise<void> {
  const redis = getRedis()
  await redis.set(codeKey(email), code, { ex: OTP_TTL_SECONDS })
  // Fresh code → fresh attempt budget.
  await redis.del(attemptsKey(email))
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'mismatch' | 'too_many_attempts' }

/**
 * Verify a user-supplied code against the stored one.
 *
 * Fails closed: no stored code (never issued / already expired) is an
 * `expired` failure, never a pass. On a correct match we delete the
 * code so it can't be replayed.
 */
export async function verifyOtp(
  email: string,
  supplied: string,
): Promise<VerifyOtpResult> {
  const redis = getRedis()

  // Burn an attempt up-front so even error paths count toward the cap.
  const attempts = await redis.incr(attemptsKey(email))
  if (attempts === 1) {
    await redis.expire(attemptsKey(email), OTP_TTL_SECONDS)
  }
  if (attempts > MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' }
  }

  const stored = await redis.get<string>(codeKey(email))
  if (stored === null || stored === undefined) {
    return { ok: false, reason: 'expired' }
  }

  // Normalise both sides to strings of digits before comparing — the
  // Upstash client may hand back a number for an all-digit value.
  const a = String(stored).trim()
  const b = String(supplied).trim()
  if (a.length !== b.length) {
    return { ok: false, reason: 'mismatch' }
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  if (diff !== 0) {
    return { ok: false, reason: 'mismatch' }
  }

  // Success — consume the code + attempt counter so it can't be reused.
  await redis.del(codeKey(email))
  await redis.del(attemptsKey(email))
  return { ok: true }
}

/** Clear any pending code/attempts for an email (e.g. after a hard reset). */
export async function clearOtp(email: string): Promise<void> {
  const redis = getRedis()
  await redis.del(codeKey(email))
  await redis.del(attemptsKey(email))
}
