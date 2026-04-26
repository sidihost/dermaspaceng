/**
 * Server-side HaveIBeenPwned (HIBP) breach check.
 *
 * Uses the *k-anonymity* range API: we hash the password with SHA-1,
 * send only the FIRST 5 hex chars of the hash to api.pwnedpasswords.com,
 * and compare the suffix locally. The user's password — and its full
 * hash — never leave our server.
 *
 *   sha1("hunter2") = F3BBBD66A63D4BF1747940578EC3D0103530E21D
 *                    └─ prefix ┘└──────── suffix ─────────┘
 *
 * HIBP responds with every (suffix, count) pair that shares the same
 * 5-char prefix (~500-1000 results). We scan for ours; if found, the
 * password has appeared in N data breaches and should be refused.
 *
 * Failure mode: if the HIBP API is unreachable or rate-limited we
 * "fail open" (return `pwned: false`). Blocking signup because a
 * third-party API is down is worse than a temporary gap in coverage,
 * and the password-strength score still gates the obvious offenders.
 */

import { createHash } from 'crypto'

export interface BreachResult {
  /** True if this password has appeared in known breaches. */
  pwned: boolean
  /** How many times it has appeared (0 when not pwned). */
  count: number
  /** Set when the lookup couldn't complete (network/timeout). UI can
   *  use this to show a soft warning instead of a hard block. */
  unknown?: boolean
}

const HIBP_ENDPOINT = 'https://api.pwnedpasswords.com/range'
const TIMEOUT_MS = 4000

export async function isPasswordBreached(password: string): Promise<BreachResult> {
  if (!password) return { pwned: false, count: 0 }

  let sha1Upper: string
  try {
    sha1Upper = createHash('sha1').update(password).digest('hex').toUpperCase()
  } catch {
    return { pwned: false, count: 0, unknown: true }
  }

  const prefix = sha1Upper.slice(0, 5)
  const suffix = sha1Upper.slice(5)

  // AbortSignal.timeout is supported in modern Node runtimes (Vercel).
  // Falling back gracefully if not.
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null

  try {
    const res = await fetch(`${HIBP_ENDPOINT}/${prefix}`, {
      // `Add-Padding` masks the response length so a network observer
      // cannot infer how many hits the prefix had.
      headers: { 'Add-Padding': 'true' },
      signal: controller?.signal,
      // Keep the lookup fully out of any framework cache.
      cache: 'no-store',
    })
    if (!res.ok) return { pwned: false, count: 0, unknown: true }
    const text = await res.text()
    // Each line is `SUFFIX:COUNT`.
    const lines = text.split(/\r?\n/)
    for (const line of lines) {
      const [hash, countStr] = line.trim().split(':')
      if (hash && hash.toUpperCase() === suffix) {
        const count = parseInt(countStr || '0', 10) || 0
        // The padding response includes synthetic 0-count rows we
        // should ignore; only report a real breach.
        if (count > 0) return { pwned: true, count }
      }
    }
    return { pwned: false, count: 0 }
  } catch {
    // Timeout, network error, abort — fail open with `unknown`.
    return { pwned: false, count: 0, unknown: true }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
