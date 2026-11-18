'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  readCachedUser,
  writeCachedUser,
  clearCachedUser,
  getCookieAuthUid,
} from '@/lib/auth-cache'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string | null
  gender?: 'male' | 'female' | null
  username?: string
  /** Operator role — used by the staff/admin consoles to decide
   *  what surfaces and gates render. */
  role?: 'user' | 'staff' | 'admin'
  /**
   * Legal-pack acceptance state. Compared against
   * `CURRENT_LEGAL_VERSION` from `lib/legal.ts` by the dashboard
   * gate to decide whether to show the acceptance modal. `null`
   * means the user has never accepted (legacy account before the
   * flow shipped, or signed up via OAuth without seeing the
   * wizard) and they should be re-prompted.
   */
  legalAcceptedVersion?: string | null
  legalAcceptedAt?: string | null
  /** Staff console policy acknowledgement — separate from the
   *  customer-facing legal pack and only meaningful for operator
   *  roles. */
  staffPolicyAcceptedVersion?: string | null
  staffPolicyAcceptedAt?: string | null
  /**
   * First-sign-in welcome flow flags (set by /api/auth/me).
   * `mustChangePassword` is true while the seeded admin/staff
   * temp password is still in use; `emailIsPlaceholder` is true
   * while the row's email is the `pending+...@dermaspaceng.invalid`
   * sentinel we issue for new admin invites. The AdminWelcomeGate
   * reads both to decide whether to render its prompt.
   */
  mustChangePassword?: boolean
  emailVerified?: boolean
  emailIsPlaceholder?: boolean
  profileComplete?: boolean
  xUsername?: string | null
  hasSocialAuth?: boolean
  needsProfileCompletion?: boolean
}

interface AuthState {
  user: UserData | null
  isLoading: boolean
  isAuthenticated: boolean
  mutate: () => void
}

/**
 * Fetcher for /api/auth/me.
 *
 * - 401 is a perfectly normal "not signed in" state — we resolve to
 *   `{ user: null }` so SWR doesn't treat it as an error and doesn't
 *   retry it on a backoff timer.
 * - We also clear the localStorage cache on a 401 so the next page
 *   load doesn't paint a phantom user that no longer has a session.
 */
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 401) {
      clearCachedUser()
      return { user: null }
    }
    throw new Error('Failed to fetch')
  }
  const data = await res.json()
  // Side-effect: refresh the localStorage cache so the NEXT page's
  // first paint already has the latest user payload (avatar change,
  // first-name edit, etc.) without waiting for another network call.
  //
  // We deliberately pass the FULL /api/auth/me user object here.
  // `writeCachedUser` runs its own whitelist (`pickDisplayFields`
  // in lib/auth-cache.ts) and strips PII (email, phone, DOB, bio,
  // social handles) plus auth gate signals (mustChangePassword,
  // emailVerified, …) before any data lands in localStorage. That
  // whitelist is the single choke point preventing an XSS payload
  // from being able to read sensitive session metadata off disk.
  if (data?.user) {
    writeCachedUser(data.user as Record<string, unknown>)
  } else {
    clearCachedUser()
  }
  return data
}

/**
 * Shared authentication hook with localStorage-backed instant first paint.
 *
 * Performance characteristics
 * ---------------------------
 * 1. **First paint, signed-in** — we synchronously read the cached
 *    user from localStorage and feed it to SWR as `fallbackData`. The
 *    component renders the user's name/avatar immediately; SWR
 *    revalidates against `/api/auth/me` in the background.
 *
 * 2. **First paint, signed-out** — `readCachedUser()` returns null,
 *    SWR fetches `/api/auth/me`, server responds 401, fetcher
 *    resolves to `{ user: null }`. The "isLoading" flag stays true
 *    only until that first network resolves.
 *
 * 3. **Subsequent navigations** — SWR cache + the 30s `Cache-Control:
 *    private, max-age=30` header on the API both kick in, so most
 *    in-tab nav events do zero work.
 *
 * 4. **Profile edits** — code paths that mutate the user (settings
 *    page, avatar picker, etc.) call `mutate()` and dispatch the
 *    `user-updated` window event so EVERY consumer of useAuth in the
 *    tree refreshes at once.
 */
export function useAuth(): AuthState {
  // Never read localStorage during SSR or React's initial hydration pass.
  // Doing so while a cached user exists on the client causes SSR HTML
  // (logged-out) and hydration JSX (logged-in) to diverge and trigger a
  // hydration error. Deferring until after mount keeps the first client
  // pass identical to the server render, then immediately hydrates from
  // the localStorage cache on the very next commit.
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const cached = hasMounted ? readCachedUser() : null
  const cookieUid = hasMounted ? getCookieAuthUid() : null

  const { data, isLoading, mutate } = useSWR(
    '/api/auth/me',
    fetcher,
    {
      fallbackData: cached ? { user: cached } : undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // 2s dedupe prevents simultaneous mounts (Header, MobileNav, banners)
      // on the same page from firing duplicate requests while never locking
      // a newly-logged-in tab onto a stale `{ user: null }` response.
      dedupingInterval: 2000,
      errorRetryCount: 1,
    }
  )

  const swrUser: UserData | null = data?.user ?? null
  const hasUidMismatch = Boolean(
    hasMounted && cookieUid && swrUser?.id && swrUser.id !== cookieUid,
  )
  const hasNewSessionMissingFromSwr = Boolean(
    hasMounted && cookieUid && data !== undefined && !swrUser,
  )

  useEffect(() => {
    if (!hasMounted) return
    if (hasUidMismatch || hasNewSessionMissingFromSwr) {
      const freshCached = readCachedUser()
      void mutate(
        freshCached ? { user: freshCached } : undefined,
        { revalidate: true },
      )
    }
  }, [hasMounted, hasUidMismatch, hasNewSessionMissingFromSwr, mutate])

  useEffect(() => {
    const onUpdate = () => {
      const freshCached = readCachedUser()
      if (freshCached) {
        void mutate(
          (prev: { user?: UserData | null } | undefined) => ({
            ...(prev ?? {}),
            user:
              prev?.user && prev.user.id === freshCached.id
                ? ({ ...prev.user, ...freshCached } as UserData)
                : (freshCached as unknown as UserData),
          }),
          { revalidate: true },
        )
      } else {
        void mutate(undefined, { revalidate: true })
      }
    }
    const onLogout = () => {
      void mutate({ user: null }, { revalidate: false })
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && !e.key.startsWith('dermaspace.auth.user')) return
      if (!readCachedUser()) onLogout()
      else onUpdate()
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) onUpdate()
    }
    window.addEventListener('user-updated', onUpdate)
    window.addEventListener('auth-logout', onLogout)
    window.addEventListener('storage', onStorage)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener('user-updated', onUpdate)
      window.removeEventListener('auth-logout', onLogout)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [mutate])

  let user: UserData | null = swrUser
  if (hasUidMismatch || hasNewSessionMissingFromSwr) {
    user = cached as unknown as UserData | null
  } else if (!user && cached && data === undefined) {
    user = cached as unknown as UserData | null
  }

  return {
    user,
    isLoading:
      (isLoading && !data && !cached) ||
      ((hasUidMismatch || hasNewSessionMissingFromSwr) && !user),
    isAuthenticated: !!user,
    mutate,
  }
}
