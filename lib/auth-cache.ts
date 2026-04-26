/**
 * Tiny localStorage-backed cache for the currently-signed-in user.
 *
 * THE PROBLEM
 * -----------
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
 * Mirror the user payload in localStorage. SWR's `fallbackData` then
 * gets a hit on first render, mobile-nav renders the user's name +
 * avatar with ZERO network wait, and the background revalidate
 * silently refreshes the cache.
 *
 * The cache is keyed by `dermaspace.auth.user.v1` and lasts 7 days
 * (longer than the typical session lifetime — if a user is actually
 * signed out, the next /api/auth/me call returns 401 and we clear
 * the stale entry).
 *
 * The cached payload mirrors EXACTLY what /api/auth/me returns under
 * the `user` key. Other fields (preferences, welcomeDismissed) are
 * deliberately NOT cached — they're owned by their own SWR keys and
 * UI state, and stale copies of those would cause subtle bugs (e.g.
 * the welcome modal popping up after dismissal).
 */
'use client'

const STORAGE_KEY = 'dermaspace.auth.user.v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface CachedAuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  avatarUrl?: string | null
  username?: string | null
  // Optional extras — present when the cache was written by /api/auth/me
  // but never required for first-paint personalisation. Components that
  // read these (e.g. settings page) will revalidate via SWR before
  // trusting them, so being out of date here is harmless.
  dateOfBirth?: string | null
  bio?: string | null
  website?: string | null
  instagram?: string | null
  twitter?: string | null
  tiktok?: string | null
  facebook?: string | null
  linkedin?: string | null
  youtube?: string | null
  isPublic?: boolean
  gender?: 'male' | 'female' | null
  coverStyle?: string | null
  /**
   * Legal acceptance — mirror of users.legal_accepted_version /
   * users.legal_accepted_at returned by /api/auth/me. Caching this
   * means the dashboard gate decides whether to render the
   * acceptance modal SYNCHRONOUSLY on first paint instead of
   * waiting for the network round-trip — so users who have
   * already accepted never see the modal flash, and users who
   * haven't see it instantly without the dashboard rendering
   * underneath first.
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
 * Read the cached user, if any. Returns null when:
 *   - we're running on the server
 *   - storage is unavailable (private mode, quota exceeded)
 *   - the entry is missing, malformed, or older than MAX_AGE_MS
 */
export function readCachedUser(): CachedAuthUser | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Envelope
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.user ||
      typeof parsed.savedAt !== 'number'
    ) {
      return null
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      // Drop the entry rather than letting it linger forever. A
      // 7-day-old cache is almost certainly from a since-expired
      // session — better to fall through to the network fetch.
      try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
      return null
    }
    return parsed.user
  } catch {
    return null
  }
}

/**
 * Write the user to the cache. Called from:
 *   - useAuth on every successful /api/auth/me response
 *   - sign-in pages immediately after the sign-in API returns 200
 *   - profile-edit flows after a successful PUT /api/auth/profile
 */
export function writeCachedUser(user: CachedAuthUser | null | undefined): void {
  if (!isBrowser()) return
  if (!user || !user.id) {
    clearCachedUser()
    return
  }
  try {
    const env: Envelope = { user, savedAt: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(env))
  } catch {
    /* quota exceeded / storage disabled — fail silently */
  }
}

/**
 * Wipe the cache. MUST be called by the logout flow so the next page
 * paint doesn't briefly flash the previous user's name.
 */
export function clearCachedUser(): void {
  if (!isBrowser()) return
  try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
}
