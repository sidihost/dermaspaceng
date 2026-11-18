/**
 * Tiny localStorage-backed cache for the currently-signed-in user.
 *
 * SECURITY POSTURE — read first
 * -----------------------------
 * Nothing in this cache is a session token. The actual authentication
 * credential (the `session_id` opaque token) lives in an HttpOnly
 * cookie set by every signin path (password, Google, X, passkey,
 * 2FA, accept-invite, impersonate) and is COMPLETELY inaccessible
 * to JavaScript — including XSS payloads — and only ever travels
 * over HTTPS (see `lib/cookie-options.ts`).
 *
 * This file mirrors the user's *display-only* metadata (first name,
 * avatar, username, role, legal-acceptance stamp) so the next page
 * paint can render the header / mobile-nav without waiting for
 * `/api/auth/me`. PII that an attacker could harvest via XSS — email,
 * phone, date of birth, bio, social handles — is DELIBERATELY NOT
 * cached here. The whitelist in `pickDisplayFields` enforces this:
 * any new field added to /api/auth/me must be explicitly listed
 * before it ever lands in localStorage. The build won't fail if
 * you forget, but the field simply won't appear in the cache —
 * components that need it will fall through to the SWR fetch.
 *
 * THE PROBLEM (UX)
 * ----------------
 * Every component that needs the user (mobile-nav, header, derma-ai,
 * birthday banner, dashboard, etc.) used to fetch /api/auth/me on
 * mount. Each fetch costs a Lagos→DB round-trip — typically 200–400ms
 * — and even though SWR dedupes within a single page lifetime, the
 * cache is wiped on every navigation. Logged-in users were paying
 * that latency on EVERY page load before mobile-nav could render
 * their name and avatar, which the team perceived as the site
 * "taking time to load" while signed in.
 *
 * THE FIX
 * -------
 * Mirror the SAFE SUBSET of the user payload in localStorage. SWR's
 * `fallbackData` then gets a hit on first render, mobile-nav renders
 * the user's first name + avatar with ZERO network wait, and the
 * background revalidate silently refreshes the cache (and fills in
 * any non-cached fields like email).
 *
 * The cache is keyed by `dermaspace.auth.user.v2` and lasts 7 days
 * (longer than the typical session lifetime — if a user is actually
 * signed out, the next /api/auth/me call returns 401 and we clear
 * the stale entry). The v2 bump is to ensure that any v1 entry
 * from before the PII strip — which contained email/phone — is
 * dropped on the user's next visit instead of being read back into
 * the new code.
 */
'use client'

import { sanitizeAvatarForCache } from './avatar-utils'

// Bumped from v1 → v2 when we removed PII fields. The old key
// (`dermaspace.auth.user.v1`) is actively cleared in
// `readCachedUser` so a returning user doesn't keep email/phone
// mirrored on disk indefinitely.
const STORAGE_KEY = 'dermaspace.auth.user.v2'
const LEGACY_STORAGE_KEYS = ['dermaspace.auth.user.v1'] as const
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const AUTH_UID_COOKIE = 'ds_auth_uid'

/**
 * Extract the non-sensitive `ds_auth_uid` cache-sync user ID from a cookie
 * header string (`document.cookie` in the browser). Pure function so unit
 * tests can exercise mismatch/purging logic without DOM globals.
 */
export function parseAuthUidCookie(
  cookieHeader: string | null | undefined,
): string | null {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const name = trimmed.slice(0, eqIdx).trim()
    if (name !== AUTH_UID_COOKIE) continue
    const rawVal = trimmed.slice(eqIdx + 1).trim()
    if (!rawVal) return null
    try {
      const decoded = decodeURIComponent(rawVal).trim()
      return decoded || null
    } catch {
      return rawVal || null
    }
  }
  return null
}

/** Read `ds_auth_uid` from `document.cookie` when running in the browser. */
export function getCookieAuthUid(): string | null {
  if (typeof document === 'undefined') return null
  try {
    return parseAuthUidCookie(document.cookie)
  } catch {
    return null
  }
}

/**
 * Display-only fields that are safe to keep in localStorage.
 *
 * Adding a new field here is a security-relevant decision — it
 * means that field becomes readable by ANY JavaScript on the page,
 * including XSS payloads. Default to NOT adding it; instead let
 * components fetch it via SWR (the response is deduped across the
 * tab so this is almost free in practice).
 *
 * NEVER add: email, phone, date_of_birth, bio, addresses, social
 * handles, anything an attacker could exfiltrate. Authentication
 * gate signals (mustChangePassword, emailVerified, 2FA enabled,
 * etc.) are also kept OUT — those must ALWAYS be re-checked
 * against the server, never a client-cacheable value.
 */
export interface CachedAuthUser {
  /** Stable id — used as a cache-busting key, never as an auth token. */
  id: string
  /** Used to render the greeting / avatar fallback initial. */
  firstName: string
  /** Used to render the avatar fallback initial. */
  lastName: string
  /** Used to render the profile chip. */
  avatarUrl?: string | null
  /** Used to link to the public profile from the header dropdown. */
  username?: string | null
  /**
   * Operator role — used to decide whether to render the admin /
   * staff sidebar shortcut in the header on first paint. The
   * server still gates every admin route, so a tampered cache
   * cannot grant access — at worst it briefly shows a "Staff"
   * link that 403s when clicked.
   */
  role?: 'user' | 'staff' | 'admin' | null
  /**
   * Public-profile toggle. Used by the header dropdown to decide
   * whether to surface a "View profile" link. Non-sensitive.
   */
  isPublic?: boolean
  /**
   * Gender — drives the avatar fallback pool only. Considered
   * non-sensitive on its own (no name/email correlation in the
   * cache means an XSS exfiltrating this field gets nothing
   * identifiable).
   */
  gender?: 'male' | 'female' | null
  /** Cover-image preset for the public profile. UI-only. */
  coverStyle?: string | null
  /**
   * Legal acceptance — mirror of users.legal_accepted_version /
   * users.legal_accepted_at returned by /api/auth/me. Caching this
   * means the dashboard gate decides whether to render the
   * acceptance modal SYNCHRONOUSLY on first paint instead of
   * waiting for the network round-trip — so users who have
   * already accepted never see the modal flash, and users who
   * haven't see it instantly without the dashboard rendering
   * underneath first. Non-sensitive.
   */
  legalAcceptedVersion?: string | null
  legalAcceptedAt?: string | null
}

interface Envelope {
  user: CachedAuthUser
  // Wall-clock time the cache entry was written, used to expire stale
  // payloads that survived a sign-out → sign-in-as-different-user.
  savedAt: number
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

/**
 * Strip an incoming user payload down to the whitelisted display
 * fields. Anything else — including PII like email/phone and auth
 * gate signals like mustChangePassword — is silently dropped before
 * the value ever reaches localStorage. This is the choke point that
 * prevents a future change to /api/auth/me from accidentally
 * widening the cache surface.
 */
function pickDisplayFields(
  input: Record<string, unknown> | null | undefined,
): CachedAuthUser | null {
  if (!input || typeof input !== 'object') return null
  const id = typeof input.id === 'string' ? input.id : null
  const firstName = typeof input.firstName === 'string' ? input.firstName : null
  const lastName = typeof input.lastName === 'string' ? input.lastName : null
  if (!id || firstName === null || lastName === null) return null
  const out: CachedAuthUser = { id, firstName, lastName }
  if (typeof input.avatarUrl === 'string' || input.avatarUrl === null) {
    out.avatarUrl = sanitizeAvatarForCache(input.avatarUrl as string | null)
  }
  if (typeof input.username === 'string' || input.username === null) {
    out.username = input.username as string | null
  }
  if (
    input.role === 'user' ||
    input.role === 'staff' ||
    input.role === 'admin' ||
    input.role === null
  ) {
    out.role = input.role as CachedAuthUser['role']
  }
  if (typeof input.isPublic === 'boolean') out.isPublic = input.isPublic
  if (input.gender === 'male' || input.gender === 'female' || input.gender === null) {
    out.gender = input.gender as CachedAuthUser['gender']
  }
  if (typeof input.coverStyle === 'string' || input.coverStyle === null) {
    out.coverStyle = input.coverStyle as string | null
  }
  if (typeof input.legalAcceptedVersion === 'string' || input.legalAcceptedVersion === null) {
    out.legalAcceptedVersion = input.legalAcceptedVersion as string | null
  }
  if (typeof input.legalAcceptedAt === 'string' || input.legalAcceptedAt === null) {
    out.legalAcceptedAt = input.legalAcceptedAt as string | null
  }
  return out
}

/**
 * Pure cache envelope validator + UID-mismatch detector. Exported for unit
 * testing alongside `readCachedUser`.
 */
export function resolveValidCachedUser(
  rawJson: string | null | undefined,
  cookieAuthUid: string | null | undefined,
  nowMs: number = Date.now(),
): { user: CachedAuthUser | null; shouldPurge: boolean } {
  if (!rawJson) return { user: null, shouldPurge: false }
  try {
    const parsed = JSON.parse(rawJson) as Envelope
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.user ||
      typeof parsed.savedAt !== 'number'
    ) {
      return { user: null, shouldPurge: true }
    }
    if (nowMs - parsed.savedAt > MAX_AGE_MS) {
      return { user: null, shouldPurge: true }
    }
    const safe = pickDisplayFields(parsed.user as unknown as Record<string, unknown>)
    if (!safe) {
      return { user: null, shouldPurge: true }
    }
    // Session-owner mismatch guard: if the server's active `ds_auth_uid`
    // cookie belongs to a different user (e.g. admin impersonated a client,
    // or the visitor signed in as another account via OAuth), never expose
    // the previous account's avatar/role even for a single frame.
    if (cookieAuthUid && safe.id !== cookieAuthUid) {
      return { user: null, shouldPurge: true }
    }
    return { user: safe, shouldPurge: false }
  } catch {
    return { user: null, shouldPurge: true }
  }
}

/**
 * Read the cached user, if any. Returns null when:
 *   - we're running on the server
 *   - storage is unavailable (private mode, quota exceeded)
 *   - the entry is missing, malformed, or older than MAX_AGE_MS
 *   - `ds_auth_uid` cookie points to a different user ID
 *
 * Also opportunistically deletes legacy v1 entries (which contained
 * email/phone) so a returning user's PII is wiped on their next
 * visit, even if they never sign in again.
 */
export function readCachedUser(): CachedAuthUser | null {
  if (!isBrowser()) return null
  try {
    for (const legacy of LEGACY_STORAGE_KEYS) {
      try { window.localStorage.removeItem(legacy) } catch { /* ignore */ }
    }
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const { user, shouldPurge } = resolveValidCachedUser(raw, getCookieAuthUid())
    if (shouldPurge) {
      try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
    }
    return user
  } catch {
    return null
  }
}

/**
 * Write the user to the cache. Called from:
 *   - useAuth on every successful /api/auth/me response
 *   - sign-in pages immediately after the sign-in API returns 200
 *   - profile-edit flows after a successful PUT /api/auth/profile
 *
 * The input is filtered through `pickDisplayFields` so callers can
 * safely pass the full /api/auth/me user object — anything not on
 * the whitelist (email, phone, DOB, bio, social handles, etc.) is
 * silently stripped before it ever touches localStorage.
 */
export function writeCachedUser(
  user: Record<string, unknown> | CachedAuthUser | null | undefined,
): void {
  if (!isBrowser()) return
  const safe = pickDisplayFields(user as Record<string, unknown> | null | undefined)
  if (!safe) {
    clearCachedUser()
    return
  }
  try {
    const env: Envelope = { user: safe, savedAt: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(env))
  } catch {
    /* quota exceeded / storage disabled — fail silently */
  }
}

/**
 * Wipe the cache. MUST be called by the logout flow so the next page
 * paint doesn't briefly flash the previous user's name. Also scrubs
 * legacy keys defensively in case logout happens before the next
 * read could have cleaned them up.
 */
export function clearCachedUser(): void {
  if (!isBrowser()) return
  try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
  for (const legacy of LEGACY_STORAGE_KEYS) {
    try { window.localStorage.removeItem(legacy) } catch {}
  }
}

/**
 * Notify all mounted `useAuth()` consumers in the current tab that the
 * signed-in user payload changed (login, account switch, avatar/profile edit).
 */
export function broadcastUserUpdated(): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new Event('user-updated'))
  } catch {
    /* ignore */
  }
}

/**
 * Convenience helper for login/impersonation/signup-verification handlers:
 * writes the safe display fields to localStorage and notifies every mounted
 * header/nav consumer immediately without waiting for a refresh.
 */
export function commitAuthenticatedUser(
  user: Record<string, unknown> | CachedAuthUser | null | undefined,
): void {
  writeCachedUser(user)
  broadcastUserUpdated()
}
