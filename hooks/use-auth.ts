'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
  readCachedUser,
  writeCachedUser,
  clearCachedUser,
  getCookieAuthUid,
} from '@/lib/auth-cache'
import { useAuthBootstrap } from '@/components/auth/auth-provider'
import {
  shouldRevalidateAuthOnMount,
  type AuthPreferencesData,
  type AuthUserData,
} from '@/lib/auth-bootstrap-helpers'

export type UserData = AuthUserData

interface AuthMePayload {
  user: UserData | null
  preferences?: AuthPreferencesData | null
}

interface AuthState {
  user: UserData | null
  preferences: AuthPreferencesData | null
  isLoading: boolean
  isAuthenticated: boolean
  mutate: () => void
}

/**
 * Fetcher for /api/auth/me.
 *
 * - 401 is a normal "not signed in" state — resolve to `{ user: null }` so
 *   SWR doesn't treat it as an error or retry on a backoff timer.
 * - Keeps localStorage display cache in sync with the server response.
 */
const fetcher = async (url: string): Promise<AuthMePayload> => {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 401) {
      clearCachedUser()
      return { user: null, preferences: null }
    }
    throw new Error('Failed to fetch')
  }
  const data = (await res.json()) as AuthMePayload
  if (data?.user) {
    writeCachedUser(data.user as unknown as Record<string, unknown>)
  } else {
    clearCachedUser()
  }
  return {
    user: data?.user ?? null,
    preferences: data?.preferences ?? null,
  }
}

/**
 * Shared authentication hook with server-bootstrapped instant first paint.
 *
 * - On SSR & first client frame: consumes `<AuthProvider>` server state directly,
 *   so signed-in users immediately see their name, avatar, role badge, and
 *   personalized sections at 0ms with zero loading flash or hydration mismatch.
 * - For confirmed signed-out guests: skips redundant `/api/auth/me` mount calls.
 * - On login, logout, profile edits, cross-tab storage updates, or bfcache
 *   restores: immediately updates and revalidates across every consumer.
 */
export function useAuth(): AuthState {
  const bootstrap = useAuthBootstrap()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const cached = hasMounted ? readCachedUser() : null
  const cookieUid = hasMounted ? getCookieAuthUid() : null

  const fallbackPayload: AuthMePayload | undefined = bootstrap.resolved
    ? { user: bootstrap.user, preferences: bootstrap.preferences }
    : cached
      ? { user: cached as unknown as UserData, preferences: null }
      : undefined

  const initialUidMismatch = Boolean(
    hasMounted &&
      bootstrap.resolved &&
      cookieUid &&
      bootstrap.user?.id &&
      bootstrap.user.id !== cookieUid,
  )

  const revalidateOnMount = shouldRevalidateAuthOnMount({
    initialResolved: bootstrap.resolved,
    hasInitialUser: Boolean(bootstrap.user),
    hasSessionCookie: bootstrap.hasSessionCookie,
    hasCookieUid: Boolean(cookieUid),
    cookieUidMismatch: initialUidMismatch,
  })

  const { data, isLoading, mutate } = useSWR<AuthMePayload>(
    '/api/auth/me',
    fetcher,
    {
      fallbackData: fallbackPayload,
      revalidateOnMount,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      errorRetryCount: 1,
    },
  )

  const swrUser: UserData | null = data?.user ?? null
  const swrPreferences: AuthPreferencesData | null = data?.preferences ?? null

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
        freshCached
          ? { user: freshCached as unknown as UserData, preferences: null }
          : undefined,
        { revalidate: true },
      )
    }
  }, [hasMounted, hasUidMismatch, hasNewSessionMissingFromSwr, mutate])

  useEffect(() => {
    const onUpdate = () => {
      const freshCached = readCachedUser()
      if (freshCached) {
        void mutate(
          (prev) => ({
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
      void mutate({ user: null, preferences: null }, { revalidate: false })
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

  const resolvedWithoutLoading =
    bootstrap.resolved && !hasUidMismatch && !hasNewSessionMissingFromSwr

  return {
    user,
    preferences: swrPreferences,
    isLoading: resolvedWithoutLoading
      ? false
      : (isLoading && !data && !cached) ||
        ((hasUidMismatch || hasNewSessionMissingFromSwr) && !user),
    isAuthenticated: !!user,
    mutate,
  }
}
