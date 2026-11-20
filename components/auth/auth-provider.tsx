'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { SWRConfig } from 'swr'
import type { InitialAuthState } from '@/lib/auth-bootstrap-helpers'
import { clearCachedUser, writeCachedUser } from '@/lib/auth-cache'

const DEFAULT_INITIAL_AUTH: InitialAuthState = {
  user: null,
  preferences: null,
  hasSessionCookie: false,
  resolved: false,
}

const AuthBootstrapContext = createContext<InitialAuthState>(DEFAULT_INITIAL_AUTH)

export function useAuthBootstrap(): InitialAuthState {
  return useContext(AuthBootstrapContext)
}

export function AuthProvider({
  initialAuth,
  children,
}: {
  initialAuth: InitialAuthState
  children: React.ReactNode
}) {
  // Keep localStorage display cache synchronized with the server-verified
  // initial session so stale accounts never linger across reloads/logouts.
  useEffect(() => {
    if (!initialAuth.resolved) return
    if (initialAuth.user) {
      writeCachedUser(initialAuth.user as unknown as Record<string, unknown>)
    } else if (!initialAuth.hasSessionCookie) {
      clearCachedUser()
    }
  }, [initialAuth.resolved, initialAuth.hasSessionCookie, initialAuth.user])

  const swrConfigValue = useMemo(
    () =>
      initialAuth.resolved
        ? {
            fallback: {
              '/api/auth/me': {
                user: initialAuth.user,
                preferences: initialAuth.preferences,
              },
            },
          }
        : {},
    [initialAuth.resolved, initialAuth.user, initialAuth.preferences],
  )

  return (
    <AuthBootstrapContext.Provider value={initialAuth}>
      <SWRConfig value={swrConfigValue}>{children}</SWRConfig>
    </AuthBootstrapContext.Provider>
  )
}
