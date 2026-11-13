import type { NextRequest } from 'next/server'

function isLocalOrIpHost(hostHeader: string): boolean {
  const hostname = hostHeader.split(':')[0].trim().toLowerCase()
  if (!hostname) return true
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname === '[::1]' ||
    hostname === '::1'
  ) {
    return true
  }
  return !hostname.includes('.')
}

export interface OriginRequestLike {
  headers: { get(name: string): string | null }
  nextUrl: { origin: string }
}

/**
 * Canonical origin used for the X OAuth redirect URI.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL (explicit production domain)
 *   2. Non-local x-forwarded-host / x-forwarded-proto (matches dev/preview/prod host)
 *   3. APP_URL (AI Studio container runtime URL fallback)
 *   4. Non-local Host header
 *   5. request.nextUrl.origin
 */
export function getAppOrigin(request: Pick<NextRequest, 'headers' | 'nextUrl'> | OriginRequestLike): string {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL
  if (publicUrl) {
    try {
      return new URL(publicUrl).origin
    } catch {
      /* malformed env value — fall through */
    }
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const cleanHost = forwardedHost.split(',')[0].trim()
    if (!isLocalOrIpHost(cleanHost)) {
      const proto =
        request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https'
      try {
        return new URL(`${proto}://${cleanHost}`).origin
      } catch {
        /* ignore */
      }
    }
  }

  const appUrl = process.env.APP_URL
  if (appUrl) {
    try {
      return new URL(appUrl).origin
    } catch {
      /* malformed env value — fall through */
    }
  }

  const host = request.headers.get('host')
  if (host) {
    const cleanHost = host.split(',')[0].trim()
    if (!isLocalOrIpHost(cleanHost)) {
      const proto =
        request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https'
      try {
        return new URL(`${proto}://${cleanHost}`).origin
      } catch {
        /* ignore */
      }
    }
  }

  return request.nextUrl.origin
}

/** Only allow same-origin relative paths for post-auth redirects. */
export function sanitizeRedirectPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || typeof raw !== 'string') return fallback
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback
  }
  return trimmed
}

/** Human-readable copy for X OAuth error codes surfaced in the UI. */
export function formatXError(code?: string, reason?: string, detail?: string): string {
  const map: Record<string, string> = {
    x_auth_failed: 'X declined the sign-in. Please try again.',
    x_cancelled: 'You cancelled the X sign-in. Pick a method to continue.',
    x_not_configured: "X sign-in isn't configured yet — please use email or Google.",
    no_code: "The provider didn't return a sign-in code. Please try again.",
    state_mismatch: 'Your sign-in session expired. Please try again.',
    token_exchange_failed:
      "Couldn't complete sign-in. Please try again, or use a different method.",
    user_info_failed: "Couldn't read your profile. Please try again.",
    account_suspended: 'This account has been suspended. Please contact support.',
    auth_failed: 'Sign-in failed. Please try again.',
  }
  let msg = (code && map[code]) || 'Sign-in failed. Please try again.'
  if (code === 'token_exchange_failed' && (reason || detail)) {
    const xMsg = [reason, detail].filter(Boolean).join(': ')
    msg += ` (X said: ${xMsg})`
  }
  return msg
}

/** Synthetic email given to X sign-ups (X doesn't share an address). */
export function xPlaceholderEmail(xUserId: string): string {
  return `x_${xUserId}@users.dermaspaceng.com`
}

export function isXPlaceholderEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && /^x_[^@]+@users\.dermaspaceng\.com$/i.test(email)
}
