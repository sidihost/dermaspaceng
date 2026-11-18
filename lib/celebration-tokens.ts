import crypto from 'node:crypto'
import {
  getLagosCalendarDate,
  isBirthdayOnCalendarDate,
  isBirthdayTodayLagos,
  parseIsoDateParts,
} from './birthday'
import {
  getNewYearEdition,
  isChristmasSeasonLagos,
  isNewYearSeasonLagos,
  type CelebrationOccasion,
} from './celebrations'
import { getSigningSecret, timingSafeEqualStrings } from './server-secrets'

const TOKEN_VERSION = 1
const BIRTHDAY_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days from birthday issue
const MAX_TOKEN_LENGTH = 1024

export interface CelebrationTokenPayload {
  v: 1
  uid: string
  occ: CelebrationOccasion
  yr: number
  dob?: string // 'MM-DD' only (never embeds birth year)
  jti: string
  iat: number
  exp: number
}

export type CelebrationDenyReason =
  | 'missing_dob'
  | 'not_birthday'
  | 'season_closed'
  | 'festive_disabled'
  | 'wrong_user'
  | 'wrong_occasion'
  | 'dob_mismatch'
  | 'expired_token'
  | 'invalid_token'

export type CelebrationTokenVerifyResult =
  | { ok: true; payload: CelebrationTokenPayload }
  | { ok: false; reason: CelebrationDenyReason }

export type CelebrationAccessResult =
  | {
      allowed: true
      needsTokenRedirect: true
      mintedToken: string
    }
  | {
      allowed: true
      needsTokenRedirect: false
      payload: CelebrationTokenPayload
    }
  | {
      allowed: false
      reason: CelebrationDenyReason
    }

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function normalizeDobMonthDay(
  dobIso: string | null | undefined,
): string | null {
  const parts = parseIsoDateParts(dobIso)
  if (!parts) return null
  return `${pad2(parts.month)}-${pad2(parts.day)}`
}

function getCanonicalSeasonYear(
  occasion: CelebrationOccasion,
  now: Date,
): number {
  const cal = getLagosCalendarDate(now)
  if (occasion === 'new-year') {
    return getNewYearEdition(cal).targetYear
  }
  return cal.year
}

function computeTokenExpirationUnix(
  occasion: CelebrationOccasion,
  iat: number,
  now: Date,
): number {
  const cal = getLagosCalendarDate(now)
  if (occasion === 'birthday') {
    return iat + BIRTHDAY_TOKEN_TTL_SECONDS
  }
  if (occasion === 'christmas') {
    // Dec 26 23:59:59 Africa/Lagos (WAT = UTC+1) -> 22:59:59 UTC
    const endSec = Math.floor(Date.UTC(cal.year, 11, 26, 22, 59, 59) / 1000)
    return Math.max(iat + 60, endSec)
  }
  // New Year: Jan 7 23:59:59 Africa/Lagos (WAT = UTC+1) -> 22:59:59 UTC
  const ny = getNewYearEdition(cal)
  const endSec = Math.floor(Date.UTC(ny.targetYear, 0, 7, 22, 59, 59) / 1000)
  return Math.max(iat + 60, endSec)
}

function getTokenSecret(secretOverride?: string): string {
  return secretOverride ?? getSigningSecret('celebration-story')
}

function signTokenInput(unsigned: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64url')
}

/**
 * Mints a unique, user-bound, occasion-bound, tamper-proof HMAC token.
 * Every call embeds a fresh 128-bit `jti` nonce so links cannot be guessed
 * or reused across accounts.
 */
export function mintCelebrationToken(input: {
  userId: string
  occasion: CelebrationOccasion
  dobIso?: string | null
  now?: Date
  secretOverride?: string
}): string {
  const uid = typeof input.userId === 'string' ? input.userId.trim() : ''
  if (!uid) {
    throw new Error('Cannot mint celebration token without a userId')
  }

  const now = input.now ?? new Date()
  const iat = Math.floor(now.getTime() / 1000)
  const yr = getCanonicalSeasonYear(input.occasion, now)
  const exp = computeTokenExpirationUnix(input.occasion, iat, now)

  let dobMmDd: string | undefined
  if (input.occasion === 'birthday') {
    const normalized = normalizeDobMonthDay(input.dobIso)
    if (!normalized) {
      throw new Error('Cannot mint birthday token without a valid date of birth')
    }
    dobMmDd = normalized
  }

  const payload: CelebrationTokenPayload = {
    v: TOKEN_VERSION,
    uid,
    occ: input.occasion,
    yr,
    ...(dobMmDd ? { dob: dobMmDd } : {}),
    jti: crypto.randomBytes(16).toString('hex'),
    iat,
    exp,
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const unsigned = `v1.${payloadB64}`
  const sigB64 = signTokenInput(unsigned, getTokenSecret(input.secretOverride))
  return `${unsigned}.${sigB64}`
}

/**
 * Verifies a celebration token's HMAC signature, expiry, user binding,
 * occasion binding, edition year, and (for birthdays) DOB match + birthday-day
 * issuance guarantee.
 */
export function verifyCelebrationToken(input: {
  token: string | null | undefined
  expectedUserId: string
  expectedOccasion: CelebrationOccasion
  expectedYear?: number
  expectedDobIso?: string | null
  now?: Date
  secretOverride?: string
}): CelebrationTokenVerifyResult {
  const raw = typeof input.token === 'string' ? input.token.trim() : ''
  if (!raw || raw.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'invalid_token' }
  }

  const segments = raw.split('.')
  if (segments.length !== 3 || segments[0] !== 'v1') {
    return { ok: false, reason: 'invalid_token' }
  }

  const [, payloadB64, sigB64] = segments
  if (!payloadB64 || !sigB64) {
    return { ok: false, reason: 'invalid_token' }
  }

  const unsigned = `v1.${payloadB64}`
  const expectedSig = signTokenInput(
    unsigned,
    getTokenSecret(input.secretOverride),
  )
  if (!timingSafeEqualStrings(sigB64, expectedSig)) {
    return { ok: false, reason: 'invalid_token' }
  }

  let parsed: unknown
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8')
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'invalid_token' }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'invalid_token' }
  }

  const p = parsed as Partial<CelebrationTokenPayload>
  if (
    p.v !== TOKEN_VERSION ||
    typeof p.uid !== 'string' ||
    !p.uid ||
    (p.occ !== 'birthday' && p.occ !== 'christmas' && p.occ !== 'new-year') ||
    typeof p.yr !== 'number' ||
    !Number.isInteger(p.yr) ||
    typeof p.jti !== 'string' ||
    !/^[a-f0-9]{32}$/.test(p.jti) ||
    typeof p.iat !== 'number' ||
    !Number.isFinite(p.iat) ||
    typeof p.exp !== 'number' ||
    !Number.isFinite(p.exp) ||
    p.exp <= p.iat
  ) {
    return { ok: false, reason: 'invalid_token' }
  }

  if (p.uid !== String(input.expectedUserId).trim()) {
    return { ok: false, reason: 'wrong_user' }
  }

  if (p.occ !== input.expectedOccasion) {
    return { ok: false, reason: 'wrong_occasion' }
  }

  const now = input.now ?? new Date()
  const nowSec = Math.floor(now.getTime() / 1000)
  if (p.iat > nowSec + 60) {
    return { ok: false, reason: 'invalid_token' }
  }
  if (nowSec > p.exp) {
    return { ok: false, reason: 'expired_token' }
  }

  if (input.expectedYear !== undefined && p.yr !== input.expectedYear) {
    return { ok: false, reason: 'expired_token' }
  }

  if (input.expectedOccasion === 'birthday') {
    const expectedDob = normalizeDobMonthDay(input.expectedDobIso)
    if (!expectedDob) {
      return { ok: false, reason: 'missing_dob' }
    }
    if (p.dob !== expectedDob) {
      return { ok: false, reason: 'dob_mismatch' }
    }
    // Enforce that the token was genuinely issued on the user's birthday
    // in Africa/Lagos (prevents off-day minting from unlocking `/birthday`).
    const issuedCal = getLagosCalendarDate(new Date(p.iat * 1000))
    if (!isBirthdayOnCalendarDate(input.expectedDobIso, issuedCal)) {
      return { ok: false, reason: 'not_birthday' }
    }
    if (p.yr !== issuedCal.year) {
      return { ok: false, reason: 'invalid_token' }
    }
  }

  return { ok: true, payload: p as CelebrationTokenPayload }
}

/**
 * Authoritative access-control decision for `/birthday`, `/christmas`,
 * `/new-year`, and `/api/user/birthday-recap`.
 */
export function evaluateCelebrationAccess(input: {
  occasion: CelebrationOccasion
  userId: string
  dobIso?: string | null
  festiveEnabled?: boolean
  token?: string | null
  now?: Date
  secretOverride?: string
}): CelebrationAccessResult {
  const now = input.now ?? new Date()
  const rawToken = typeof input.token === 'string' ? input.token.trim() : ''
  const hasToken = rawToken.length > 0

  if (input.occasion === 'birthday') {
    const dobMmDd = normalizeDobMonthDay(input.dobIso)
    if (!dobMmDd) {
      return { allowed: false, reason: 'missing_dob' }
    }

    const isBdayToday = isBirthdayTodayLagos(input.dobIso, now)
    if (hasToken) {
      const lagosYear = getLagosCalendarDate(now).year
      const verified = verifyCelebrationToken({
        token: rawToken,
        expectedUserId: input.userId,
        expectedOccasion: 'birthday',
        expectedYear: isBdayToday ? lagosYear : undefined,
        expectedDobIso: input.dobIso,
        now,
        secretOverride: input.secretOverride,
      })
      if (!verified.ok) {
        return {
          allowed: false,
          reason: 'reason' in verified ? verified.reason : 'invalid_token',
        }
      }
      return {
        allowed: true,
        needsTokenRedirect: false,
        payload: verified.payload,
      }
    }

    if (!isBdayToday) {
      return { allowed: false, reason: 'not_birthday' }
    }

    return {
      allowed: true,
      needsTokenRedirect: true,
      mintedToken: mintCelebrationToken({
        userId: input.userId,
        occasion: 'birthday',
        dobIso: input.dobIso,
        now,
        secretOverride: input.secretOverride,
      }),
    }
  }

  if (input.occasion === 'christmas') {
    if (!input.festiveEnabled) {
      return { allowed: false, reason: 'festive_disabled' }
    }
    if (!isChristmasSeasonLagos(now)) {
      return { allowed: false, reason: 'season_closed' }
    }
    const lagosYear = getLagosCalendarDate(now).year
    if (hasToken) {
      const verified = verifyCelebrationToken({
        token: rawToken,
        expectedUserId: input.userId,
        expectedOccasion: 'christmas',
        expectedYear: lagosYear,
        now,
        secretOverride: input.secretOverride,
      })
      if (!verified.ok) {
        return {
          allowed: false,
          reason: 'reason' in verified ? verified.reason : 'invalid_token',
        }
      }
      return {
        allowed: true,
        needsTokenRedirect: false,
        payload: verified.payload,
      }
    }
    return {
      allowed: true,
      needsTokenRedirect: true,
      mintedToken: mintCelebrationToken({
        userId: input.userId,
        occasion: 'christmas',
        now,
        secretOverride: input.secretOverride,
      }),
    }
  }

  // New Year season (Dec 31 – Jan 7 inclusive in Africa/Lagos)
  if (!isNewYearSeasonLagos(now)) {
    return { allowed: false, reason: 'season_closed' }
  }
  const nyEdition = getNewYearEdition(getLagosCalendarDate(now))
  if (hasToken) {
    const verified = verifyCelebrationToken({
      token: rawToken,
      expectedUserId: input.userId,
      expectedOccasion: 'new-year',
      expectedYear: nyEdition.targetYear,
      now,
      secretOverride: input.secretOverride,
    })
    if (!verified.ok) {
      return {
        allowed: false,
        reason: 'reason' in verified ? verified.reason : 'invalid_token',
      }
    }
    return {
      allowed: true,
      needsTokenRedirect: false,
      payload: verified.payload,
    }
  }

  return {
    allowed: true,
    needsTokenRedirect: true,
    mintedToken: mintCelebrationToken({
      userId: input.userId,
      occasion: 'new-year',
      now,
      secretOverride: input.secretOverride,
    }),
  }
}

/**
 * Builds canonical celebration URLs with a unique signed token attached.
 * Returns null if the user is not eligible for the requested occasion.
 */
export function buildSignedCelebrationPath(input: {
  occasion: CelebrationOccasion
  userId: string
  dobIso?: string | null
  festiveEnabled?: boolean
  now?: Date
  secretOverride?: string
}): string | null {
  const now = input.now ?? new Date()
  if (input.occasion === 'birthday') {
    if (!normalizeDobMonthDay(input.dobIso) || !isBirthdayTodayLagos(input.dobIso, now)) {
      return null
    }
  } else if (input.occasion === 'christmas') {
    if (!input.festiveEnabled || !isChristmasSeasonLagos(now)) {
      return null
    }
  } else if (!isNewYearSeasonLagos(now)) {
    return null
  }

  const token = mintCelebrationToken({
    userId: input.userId,
    occasion: input.occasion,
    dobIso: input.dobIso,
    now,
    secretOverride: input.secretOverride,
  })
  const basePath =
    input.occasion === 'birthday'
      ? '/birthday'
      : input.occasion === 'christmas'
        ? '/christmas'
        : '/new-year'
  return `${basePath}?token=${encodeURIComponent(token)}`
}
