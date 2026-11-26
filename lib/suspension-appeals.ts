import { sign, verify } from 'jsonwebtoken'
import { buildEmailUrl } from './email-url'
import { getSigningSecret } from './server-secrets'
import { APPEAL_MAX_LENGTH, APPEAL_MIN_LENGTH } from './suspension-appeal-constants'

export { APPEAL_MAX_LENGTH, APPEAL_MIN_LENGTH }

export type AppealStatus = 'pending' | 'approved' | 'rejected'
export type AppealRole = 'user' | 'staff' | 'admin'

export interface AppealTokenPayload {
  purpose: 'suspension_appeal'
  userId: string
  email: string
  role: AppealRole
  reason: string | null
  iat?: number
  exp?: number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getAppealSecret(): string {
  return getSigningSecret('appeal-token')
}

export function sanitizeEmailSubject(input: unknown, maxLength = 200): string {
  return String(input ?? '')
    .replace(/[\r\n\0\u2028\u2029]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function normalizeAppealRole(role: string | null | undefined): AppealRole {
  if (role === 'admin' || role === 'staff') return role
  return 'user'
}

export function createAppealToken(input: {
  userId: string
  email: string
  role?: string | null
  reason?: string | null
}): string {
  const payload: AppealTokenPayload = {
    purpose: 'suspension_appeal',
    userId: String(input.userId),
    email: String(input.email).trim().toLowerCase(),
    role: normalizeAppealRole(input.role),
    reason: input.reason ? String(input.reason).trim().slice(0, 300) : null,
  }
  return sign(payload, getAppealSecret(), {
    algorithm: 'HS256',
    expiresIn: '30d',
  })
}

export function verifyAppealToken(
  token: string | null | undefined,
): { ok: true; payload: AppealTokenPayload } | { ok: false; code: 'invalid' | 'expired' } {
  const raw = typeof token === 'string' ? token.trim() : ''
  if (!raw) return { ok: false, code: 'invalid' }

  try {
    const decoded = verify(raw, getAppealSecret(), {
      algorithms: ['HS256'],
    }) as Partial<AppealTokenPayload>
    if (
      !decoded ||
      decoded.purpose !== 'suspension_appeal' ||
      !decoded.userId ||
      !decoded.email
    ) {
      return { ok: false, code: 'invalid' }
    }
    return {
      ok: true,
      payload: {
        purpose: 'suspension_appeal',
        userId: String(decoded.userId),
        email: String(decoded.email).trim().toLowerCase(),
        role: normalizeAppealRole(decoded.role),
        reason: decoded.reason ? String(decoded.reason).trim() : null,
        iat: decoded.iat,
        exp: decoded.exp,
      },
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      return { ok: false, code: 'expired' }
    }
    return { ok: false, code: 'invalid' }
  }
}

export function getAppealPathForRole(_role?: string | null): '/appeal' {
  return '/appeal'
}

export function buildAppealUrl(
  token: string,
  roleOrOrigin?: AppealRole | string | null,
  originOverride?: string | null,
): string {
  const isOriginInSecondArg =
    typeof roleOrOrigin === 'string' && /^https?:\/\//i.test(roleOrOrigin.trim())
  const resolvedRole = isOriginInSecondArg ? 'user' : roleOrOrigin
  const resolvedOrigin = isOriginInSecondArg ? roleOrOrigin : originOverride
  const path = getAppealPathForRole(resolvedRole)
  return buildEmailUrl(`${path}?token=${encodeURIComponent(token)}`, resolvedOrigin)
}

export function validateAppealSubmission(input: {
  appealMessage?: unknown
  contactEmail?: unknown
}):
  | { ok: true; appealMessage: string; contactEmail: string | null }
  | { ok: false; error: string } {
  const appealMessage =
    typeof input.appealMessage === 'string' ? input.appealMessage.trim() : ''

  if (appealMessage.length < APPEAL_MIN_LENGTH) {
    return {
      ok: false,
      error: `Please explain why your account should be reinstated (at least ${APPEAL_MIN_LENGTH} characters).`,
    }
  }
  if (appealMessage.length > APPEAL_MAX_LENGTH) {
    return {
      ok: false,
      error: `Your appeal explanation must be ${APPEAL_MAX_LENGTH.toLocaleString()} characters or fewer.`,
    }
  }

  const rawContact =
    typeof input.contactEmail === 'string' ? input.contactEmail.trim().toLowerCase() : ''

  if (rawContact) {
    if (rawContact.length > 254 || !EMAIL_RE.test(rawContact)) {
      return {
        ok: false,
        error: 'Please enter a valid contact email address.',
      }
    }
    return { ok: true, appealMessage, contactEmail: rawContact }
  }

  return { ok: true, appealMessage, contactEmail: null }
}

export function canTransitionAppealStatus(
  currentStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): nextStatus is 'approved' | 'rejected' {
  if (currentStatus !== 'pending') return false
  return nextStatus === 'approved' || nextStatus === 'rejected'
}

export function maskEmail(email: string | null | undefined): string {
  const raw = typeof email === 'string' ? email.trim() : ''
  const atIndex = raw.indexOf('@')
  if (atIndex <= 0) return raw
  const local = raw.slice(0, atIndex)
  const domain = raw.slice(atIndex + 1)
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`
  }
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(5, local.length - 2))}@${domain}`
}
