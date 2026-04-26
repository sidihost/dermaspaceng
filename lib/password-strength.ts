/**
 * Password strength evaluation.
 *
 * Pure, side-effect-free functions that run identically on the
 * server (during signup validation) and the client (during the
 * realtime strength meter on /signup).
 *
 * The scoring is intentionally simple and explainable — users
 * should always understand WHY their password is rated weak. We
 * combine four signals:
 *
 *   1. **Length** — the single most important factor. Anything
 *      under 8 chars is flat-out rejected; we reward each
 *      additional 4 chars up to a sensible cap.
 *   2. **Character variety** — uppercase + lowercase + digit +
 *      symbol classes. Each class adds a point.
 *   3. **Common-list penalty** — passwords that appear in the
 *      embedded common-list are floored at "weak" no matter
 *      what their character variety looks like. The full breach
 *      check happens server-side via HaveIBeenPwned in
 *      `password-breach.ts`; this list is the cheap pre-filter.
 *   4. **Repeat / sequence penalty** — long runs of the same
 *      character or obvious sequences (`abcdef`, `123456`,
 *      `qwerty`) get docked.
 *
 * The output is a 0–4 score plus a discrete level + label so the
 * UI can render a bar segment and a one-word verdict.
 */

export type StrengthLevel = 'too-short' | 'weak' | 'fair' | 'good' | 'strong'

export interface StrengthChecks {
  length: boolean
  upper: boolean
  lower: boolean
  digit: boolean
  symbol: boolean
  notCommon: boolean
}

export interface StrengthResult {
  /** 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong. */
  score: 0 | 1 | 2 | 3 | 4
  level: StrengthLevel
  /** Human-friendly verdict displayed under the meter. */
  label: string
  /** Hints the user can act on. Empty when the password is strong. */
  suggestions: string[]
  /** Per-rule pass/fail booleans for the UI checklist. */
  checks: StrengthChecks
}

// Tiny embedded common-list. Not exhaustive — the real defence is
// HIBP at submit time — but catches the obvious offenders without
// requiring a network call on every keystroke.
const COMMON = new Set<string>([
  'password',
  'passw0rd',
  'password1',
  'password123',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwertyuiop',
  '1q2w3e4r',
  'abc123',
  'letmein',
  'iloveyou',
  'admin',
  'welcome',
  'welcome1',
  'monkey',
  'dragon',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'master',
  'login',
  '111111',
  '000000',
  '666666',
  'asdfgh',
  'asdfghjkl',
  'pass1234',
  'derma',
  'dermaspace',
  'spa1234',
  'changeme',
  'trustno1',
])

/**
 * Detect long runs of the same character (`aaaaaa`) or simple
 * keyboard / numeric sequences (`abcdef`, `123456`, `qwerty`).
 * Returns a penalty between 0 and 2.
 */
function sequencePenalty(pw: string): number {
  if (!pw) return 0
  const lower = pw.toLowerCase()

  // Run of identical chars: docks if 4+ in a row.
  if (/(.)\1{3,}/.test(lower)) return 2

  // Walk the keyboard / alphabet / digits forwards or backwards.
  // We compare adjacent char codes; a run of 5 strictly increasing
  // or strictly decreasing codes is suspicious.
  let inc = 1
  let dec = 1
  for (let i = 1; i < lower.length; i++) {
    const diff = lower.charCodeAt(i) - lower.charCodeAt(i - 1)
    if (diff === 1) {
      inc++
      dec = 1
      if (inc >= 5) return 1
    } else if (diff === -1) {
      dec++
      inc = 1
      if (dec >= 5) return 1
    } else {
      inc = 1
      dec = 1
    }
  }

  // Common keyboard rows.
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
  for (const row of rows) {
    for (let i = 0; i + 5 <= row.length; i++) {
      if (lower.includes(row.slice(i, i + 5))) return 1
    }
  }
  return 0
}

export function evaluatePasswordStrength(pw: string): StrengthResult {
  const checks: StrengthChecks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
    notCommon: pw.length > 0 && !COMMON.has(pw.toLowerCase()),
  }

  if (pw.length === 0) {
    return {
      score: 0,
      level: 'too-short',
      label: '',
      suggestions: [],
      checks,
    }
  }

  if (pw.length < 8) {
    return {
      score: 0,
      level: 'too-short',
      label: 'Too short',
      suggestions: ['Use at least 8 characters'],
      checks,
    }
  }

  // Base score: variety + length tiers.
  let raw = 0
  if (checks.upper) raw++
  if (checks.lower) raw++
  if (checks.digit) raw++
  if (checks.symbol) raw++
  if (pw.length >= 12) raw++
  if (pw.length >= 16) raw++

  // Common list / sequence penalties.
  if (!checks.notCommon) raw = Math.min(raw, 1)
  raw -= sequencePenalty(pw)
  if (raw < 1) raw = 1

  // Map to 1–4.
  let score: 1 | 2 | 3 | 4
  if (raw <= 1) score = 1
  else if (raw <= 3) score = 2
  else if (raw <= 4) score = 3
  else score = 4

  const level: StrengthLevel =
    score === 1 ? 'weak' : score === 2 ? 'fair' : score === 3 ? 'good' : 'strong'

  const label =
    score === 1
      ? 'Weak'
      : score === 2
        ? 'Fair'
        : score === 3
          ? 'Good'
          : 'Strong'

  const suggestions: string[] = []
  if (!checks.notCommon) suggestions.push('Avoid common passwords')
  if (pw.length < 12) suggestions.push('Try 12+ characters for a stronger password')
  if (!checks.upper) suggestions.push('Add an uppercase letter')
  if (!checks.lower) suggestions.push('Add a lowercase letter')
  if (!checks.digit) suggestions.push('Add a number')
  if (!checks.symbol) suggestions.push('Add a symbol like !@#')

  return { score, level, label, suggestions, checks }
}

/**
 * Server-side gate. Used by `/api/auth/signup` to refuse weak
 * passwords even if the client somehow bypassed the meter.
 * Anything below "fair" is rejected.
 */
export function isAcceptableStrength(pw: string): boolean {
  return evaluatePasswordStrength(pw).score >= 2
}
