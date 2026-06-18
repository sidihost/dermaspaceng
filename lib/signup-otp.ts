// ---------------------------------------------------------------------------
// Signup email-verification OTP (one-time code).
//
// Replaces the old click-through verification *link* with a short 6-digit
// code the user types back into the signup wizard. The code is the only
// thing standing between "account created (unverified)" and "verified +
// auto-logged-in", so we treat it like any other auth secret.
//
// Storage: Postgres (NOT Redis).
// -----------------------------
// This used to live in Redis, but Upstash isn't provisioned in every
// environment — and when its env vars are missing, `getRedis()` THROWS,
// which silently killed the whole "create code → email it" path (the
// signup route swallows the error, so no mail ever went out). Postgres is
// our always-available system of record, so the OTP now lives there:
//
//   • one row per email in `signup_email_otps`, upserted on (re)issue
//   • we store a SHA-256 *hash* of the code, never the plaintext
//   • a 10-minute expiry column makes a leaked code useless minutes later
//   • an attempts counter (max 5) blocks brute force inside that window
//
// Verification fails CLOSED: a missing / expired / over-limit code is a
// failed verification, never an accidental pass.
// ---------------------------------------------------------------------------

import { createHash, randomInt } from 'crypto'
import { sql } from '@/lib/db'

const OTP_TTL_SECONDS = 10 * 60 // 10 minutes
const MAX_ATTEMPTS = 5

// Lazily create the backing table the first time any helper touches it.
// `CREATE TABLE IF NOT EXISTS` is idempotent and cheap, and keeps this
// feature self-contained (no separate migration step required to ship).
let schemaReady: Promise<void> | null = null
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS signup_email_otps (
          email       TEXT PRIMARY KEY,
          code_hash   TEXT NOT NULL,
          attempts    INTEGER NOT NULL DEFAULT 0,
          expires_at  TIMESTAMPTZ NOT NULL,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
    })().catch((err) => {
      // Reset so a transient failure can be retried on the next call.
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}

function normalize(email: string): string {
  return email.toLowerCase().trim()
}

function hashCode(code: string): string {
  return createHash('sha256').update(String(code).trim()).digest('hex')
}

/**
 * Generate a cryptographically-random 6-digit code (000000–999999).
 * Padded to a fixed 6 chars so codes like `004217` keep their leading
 * zeros — both the email and the input treat it as a string, not a number.
 */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/**
 * Store (or overwrite) the pending code for an email and reset the attempt
 * counter. Called when the user first requests a code AND on resend.
 */
export async function storeOtp(email: string, code: string): Promise<void> {
  await ensureSchema()
  const key = normalize(email)
  const codeHash = hashCode(code)
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString()

  await sql`
    INSERT INTO signup_email_otps (email, code_hash, attempts, expires_at)
    VALUES (${key}, ${codeHash}, 0, ${expiresAt})
    ON CONFLICT (email) DO UPDATE
      SET code_hash  = EXCLUDED.code_hash,
          attempts   = 0,
          expires_at = EXCLUDED.expires_at,
          created_at = NOW()
  `
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'mismatch' | 'too_many_attempts' }

/**
 * Verify a user-supplied code against the stored hash.
 *
 * Fails closed: no stored code (never issued / already expired) is an
 * `expired` failure, never a pass. On a correct match we delete the row
 * so it can't be replayed.
 */
export async function verifyOtp(
  email: string,
  supplied: string,
): Promise<VerifyOtpResult> {
  await ensureSchema()
  const key = normalize(email)

  const rows = (await sql`
    SELECT code_hash, attempts, expires_at
      FROM signup_email_otps
     WHERE email = ${key}
     LIMIT 1
  `) as Array<{ code_hash: string; attempts: number; expires_at: string }>

  const record = rows[0] ?? null

  // No pending code → treat as expired (fails closed).
  if (!record) {
    return { ok: false, reason: 'expired' }
  }

  // Expired window → burn the row and report expiry.
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await sql`DELETE FROM signup_email_otps WHERE email = ${key}`
    return { ok: false, reason: 'expired' }
  }

  // Burn an attempt up-front so even error paths count toward the cap.
  const attempts = record.attempts + 1
  if (attempts > MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' }
  }
  await sql`
    UPDATE signup_email_otps SET attempts = ${attempts} WHERE email = ${key}
  `

  // Constant-time-ish comparison over the hex hashes.
  const a = record.code_hash
  const b = hashCode(supplied)
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

  // Success — consume the code so it can't be reused.
  await sql`DELETE FROM signup_email_otps WHERE email = ${key}`
  return { ok: true }
}

/** Clear any pending code for an email (e.g. after a hard reset). */
export async function clearOtp(email: string): Promise<void> {
  await ensureSchema()
  await sql`DELETE FROM signup_email_otps WHERE email = ${normalize(email)}`
}
