import { isPlaceholderEmail } from './auth-onboarding'

export const APPEAL_MIN_LENGTH = 15
export const APPEAL_MAX_LENGTH = 2000

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Returns a trimmed, lowercase email suitable for UI pre-fill and query
 * parameters, or `''` if missing, malformed, or an internal placeholder.
 */
export function normalizePrefillEmail(email: unknown): string {
  if (typeof email !== 'string') return ''
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || trimmed.length > 254) return ''
  if (!SIMPLE_EMAIL_RE.test(trimmed)) return ''
  if (isPlaceholderEmail(trimmed)) return ''
  return trimmed
}

/**
 * Builds the `/appeal` href preserving BOTH `token` and `email` whenever
 * available so the appeal form always auto-fills the user's email even if
 * token verification fails, expires, or is still settling.
 */
export function buildAppealHref(input: {
  token?: string | null
  email?: string | null
}): string {
  const params = new URLSearchParams()
  const token = typeof input.token === 'string' ? input.token.trim() : ''
  const email = normalizePrefillEmail(input.email)
  if (token) params.set('token', token)
  if (email) params.set('email', email)
  const qs = params.toString()
  return qs ? `/appeal?${qs}` : '/appeal'
}

/**
 * Builds the `/signin?error=account_suspended&...` redirect path for OAuth
 * callbacks so the sign-in screen always receives both the signed appeal token
 * (when available) and the user's non-placeholder email.
 */
export function buildSuspendedSignInPath(input: {
  token?: string | null
  email?: string | null
}): string {
  const params = new URLSearchParams({ error: 'account_suspended' })
  const token = typeof input.token === 'string' ? input.token.trim() : ''
  const email = normalizePrefillEmail(input.email)
  if (token) params.set('appeal_token', token)
  if (email) params.set('email', email)
  return `/signin?${params.toString()}`
}

/**
 * Decodes the unverified email claim from a `suspension_appeal` JWT strictly
 * as a UI pre-fill convenience fallback (never trusted for authentication or
 * account verification — the server always verifies signatures independently).
 */
export function extractEmailHintFromAppealToken(
  token: string | null | undefined,
): string {
  if (typeof token !== 'string') return ''
  const parts = token.trim().split('.')
  if (parts.length !== 3 || !parts[1]) return ''
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const jsonText =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8')
    const parsed = JSON.parse(jsonText) as {
      purpose?: unknown
      email?: unknown
    }
    if (parsed?.purpose !== 'suspension_appeal') return ''
    return normalizePrefillEmail(parsed.email)
  } catch {
    return ''
  }
}
