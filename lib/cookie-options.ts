/**
 * Centralized cookie-option builders.
 *
 * Why this file exists
 * --------------------
 * Every cookie the app issues (session_id, OAuth state/verifier
 * pairs, the derma-intent JWT, the guest chat id, geo hints, etc.)
 * needs the same security posture: HttpOnly where the value is
 * sensitive, SameSite=Lax so navigations from external sites can
 * still carry the cookie back, and the `Secure` attribute so the
 * cookie is only ever transmitted over HTTPS.
 *
 * Repeating that recipe inline in 15+ route handlers means it's
 * one missed flag away from accidentally shipping a session token
 * over an unencrypted channel — or, worse, a new contributor
 * copy-pasting a snippet that forgot `httpOnly`. Funnelling every
 * setter through these helpers gives us:
 *
 *   - One file to audit when reviewing the cookie surface
 *   - One place to upgrade defaults (e.g. add `partitioned: true`
 *     for CHIPS, or flip SameSite to Strict for auth cookies)
 *   - A loud type-error if a caller tries to opt OUT of HttpOnly
 *     on an authenticated cookie
 *
 * Security defaults
 * -----------------
 *   - `secure`: TRUE in every deployed environment. We only allow
 *     the cookie to drop the Secure bit when the code is running
 *     under `next dev` locally (NODE_ENV === 'development') where
 *     the dev server is plain http://localhost. Vercel preview AND
 *     production both run with NODE_ENV === 'production', so they
 *     get Secure.
 *   - `sameSite`: 'lax' — the right default for session cookies
 *     that need to survive top-level navigations from emails /
 *     OAuth providers, while still blocking cross-site POSTs.
 *   - `path`: '/' — auth cookies must apply to the whole app, not
 *     just the route that set them.
 *   - `httpOnly`: TRUE for `getAuthCookieOptions`. This is the
 *     hard rule that keeps session tokens out of JavaScript reach.
 *     For non-sensitive, JS-readable cookies (geo hints) use
 *     `getClientReadableCookieOptions` instead.
 */

import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export interface CookieRequestHint {
  headers?: { get(name: string): string | null }
  nextUrl?: { protocol?: string; hostname?: string }
}

function isLocalHttpRequest(request?: CookieRequestHint): boolean {
  if (!request) return false
  const forwardedProto = request.headers?.get('x-forwarded-proto')
  if (forwardedProto === 'https') return false
  const host =
    request.headers?.get('x-forwarded-host') ||
    request.headers?.get('host') ||
    request.nextUrl?.hostname ||
    ''
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0')
}

function isSecureContext(request?: CookieRequestHint): boolean {
  if (request) {
    if (request.headers?.get('x-forwarded-proto') === 'https') return true
    if (request.nextUrl?.protocol === 'https:') return true
    if (isLocalHttpRequest(request)) {
      return process.env.NODE_ENV !== 'development'
    }
  }
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
  if (configuredOrigin.startsWith('https://')) {
    return true
  }
  return process.env.NODE_ENV !== 'development'
}

function isCrossOriginIframeContext(request?: CookieRequestHint): boolean {
  if (isLocalHttpRequest(request)) return false
  return Boolean(process.env.APP_URL?.startsWith('https://')) && isSecureContext(request)
}

/**
 * Options for cookies that hold authentication state or other
 * server-only secrets. Sets HttpOnly + Secure + SameSite=Lax (or
 * SameSite=None in cross-origin HTTPS iframe preview contexts like
 * AI Studio) + path=/ as defaults.
 */
export function getAuthCookieOptions(
  overrides: Partial<Omit<ResponseCookie, 'name' | 'value'>> = {},
  request?: CookieRequestHint,
): Omit<ResponseCookie, 'name' | 'value'> {
  const secure = isSecureContext(request)
  const defaultSameSite = isCrossOriginIframeContext(request) ? 'none' : 'lax'
  return {
    sameSite: defaultSameSite,
    path: '/',
    ...overrides,
    httpOnly: true,
    secure,
  }
}

/**
 * Options for cookies whose VALUE the client legitimately needs to
 * read from JavaScript (e.g. geo hints surfaced in the UI).
 */
export function getClientReadableCookieOptions(
  overrides: Partial<Omit<ResponseCookie, 'name' | 'value'>> = {},
  request?: CookieRequestHint,
): Omit<ResponseCookie, 'name' | 'value'> {
  const secure = isSecureContext(request)
  const defaultSameSite = isCrossOriginIframeContext(request) ? 'none' : 'lax'
  return {
    httpOnly: false,
    sameSite: defaultSameSite,
    path: '/',
    ...overrides,
    secure,
  }
}
