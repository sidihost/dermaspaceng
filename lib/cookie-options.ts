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

/**
 * Returns TRUE everywhere except local development.
 *
 * - `next dev` on localhost: NODE_ENV === 'development' → false
 *   (browsers would silently drop a Secure cookie sent over
 *   http://localhost, so we can't enforce it here without
 *   breaking sign-in for engineers working locally).
 * - Vercel preview / production: NODE_ENV === 'production' → true.
 * - Test runners: NODE_ENV === 'test' → true (defensive: we'd
 *   rather a unit test break loudly than ship a non-Secure cookie
 *   because someone forgot to mock an env var).
 */
function isSecureContext(): boolean {
  return process.env.NODE_ENV !== 'development'
}

/**
 * Options for cookies that hold authentication state or other
 * server-only secrets. Sets HttpOnly + Secure + SameSite=Lax +
 * path=/ as non-negotiable defaults. Callers supply `maxAge` or
 * `expires` to control lifetime.
 *
 * The returned object is shaped to satisfy both `cookies().set(...)`
 * in route handlers AND `response.cookies.set(...)` in middleware /
 * NextResponse code — the two APIs share the same option type under
 * the hood.
 */
export function getAuthCookieOptions(
  overrides: Partial<Omit<ResponseCookie, 'name' | 'value'>> = {},
): Omit<ResponseCookie, 'name' | 'value'> {
  // Spread overrides FIRST so the security defaults below win on any
  // conflict. A caller can adjust maxAge / expires / sameSite, but
  // can never accidentally (or deliberately) drop HttpOnly or
  // Secure. If a future need genuinely requires `httpOnly: false`,
  // the caller must reach for `getClientReadableCookieOptions`
  // instead — the explicit choice of helper is the audit signal.
  return {
    sameSite: 'lax',
    path: '/',
    ...overrides,
    httpOnly: true,
    secure: isSecureContext(),
  }
}

/**
 * Options for cookies whose VALUE the client legitimately needs to
 * read from JavaScript (e.g. geo hints surfaced in the UI). Keeps
 * the Secure + SameSite + path defaults but allows JS access.
 *
 * Even when readable from JS, these cookies still only travel over
 * HTTPS in any deployed environment, so a network observer can't
 * see them and the browser refuses to attach them to insecure
 * requests.
 */
export function getClientReadableCookieOptions(
  overrides: Partial<Omit<ResponseCookie, 'name' | 'value'>> = {},
): Omit<ResponseCookie, 'name' | 'value'> {
  // Same pattern as getAuthCookieOptions: spread overrides first
  // so Secure can never be silently dropped. HttpOnly is allowed
  // to be `false` here because — by definition — these cookies are
  // meant to be readable from JavaScript.
  return {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    ...overrides,
    secure: isSecureContext(),
  }
}
