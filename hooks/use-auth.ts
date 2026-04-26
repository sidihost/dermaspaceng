'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import {
  readCachedUser,
  writeCachedUser,
  clearCachedUser,
  type CachedAuthUser,
} from '@/lib/auth-cache'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string
  username?: string
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
  const res = await fetch(url, { credentials: 'include' })
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
  if (data?.user) {
    writeCachedUser(data.user as CachedAuthUser)
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
  // Read the cached user once, on mount. This runs on every render in
  // theory, but localStorage reads are sub-millisecond and we let SWR
  // memoise the resulting `fallbackData` after the first call.
  const cached = typeof window !== 'undefined' ? readCachedUser() : null

  const { data, isLoading, mutate } = useSWR(
    '/api/auth/me',
    fetcher,
    {
      // Seed SWR with the cached user so consumers see the user
      // immediately on first render — no flash of "logged out" UI
      // while we wait for /api/auth/me. SWR will still revalidate
      // in the background and replace `data` once the network
      // response lands.
      fallbackData: cached ? { user: cached } : undefined,
      // Don't refetch every time the tab regains focus — the
      // 'user-updated' event already covers explicit edits, and
      // refocus revalidation is what made navigating away and back
      // feel "loady" before.
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // 60s within-tab dedupe — prevents the dozen-or-so components
      // that each call useAuth from each firing their own request.
      dedupingInterval: 60000,
      // A single retry is enough for transient 5xx; further retries
      // just delay the inevitable user-feedback (and chew battery).
      errorRetryCount: 1,
    }
  )

  // Listen for the cross-component 'user-updated' broadcast so an
  // avatar change in /dashboard/settings instantly refreshes the
  // mobile-nav avatar everywhere else, without each surface having
  // to wire up its own listener.
  useEffect(() => {
    const onUpdate = () => { void mutate() }
    window.addEventListener('user-updated', onUpdate)
    return () => window.removeEventListener('user-updated', onUpdate)
  }, [mutate])

  const user: UserData | null = data?.user ?? null

  return {
    user,
    // Treat as "loading" only when we have NO data at all — neither
    // a fresh fetch nor a localStorage fallback. With a cache hit the
    // user is shown immediately and isLoading is already false.
    isLoading: isLoading && !data,
    isAuthenticated: !!user,
    mutate,
  }
}
