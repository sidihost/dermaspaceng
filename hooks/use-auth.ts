'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'

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

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 401) {
      return { user: null }
    }
    throw new Error('Failed to fetch')
  }
  return res.json()
}

/**
 * Shared authentication hook that uses SWR for caching and deduplication.
 * This ensures all components using this hook share the same auth state
 * and don't make duplicate API calls.
 */
export function useAuth(): AuthState {
  const { data, error, isLoading, mutate } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // Dedupe requests within 60 seconds
    errorRetryCount: 1,
  })

  return {
    user: data?.user || null,
    isLoading: isLoading && !data,
    isAuthenticated: !!data?.user,
    mutate,
  }
}
