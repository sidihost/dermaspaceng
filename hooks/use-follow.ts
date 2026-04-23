'use client'

import { useState } from 'react'
import useSWR from 'swr'

export interface FollowState {
  isFollowing: boolean
  followerCount: number
  followingCount: number
}

const fetcher = async (url: string): Promise<FollowState> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    // Resolving with zeros instead of throwing keeps the profile page
    // rendering something sensible even when the follow graph API is
    // momentarily unavailable — the follow button will just stay in
    // its default "not following" state until SWR revalidates.
    return { isFollowing: false, followerCount: 0, followingCount: 0 }
  }
  return (await res.json()) as FollowState
}

/**
 * Subscribe to the follow relationship between the current viewer and
 * the profile we're looking at. Wraps /api/user/follow/[username] with
 * SWR so follower counts stay live across the follow button, the
 * followers list, and anything else on the page that reads the same
 * key.
 *
 * Pass `null` or an empty username to skip fetching — useful when the
 * viewer is on their own profile (we hide the follow button entirely)
 * so we don't waste a request.
 */
export function useFollow(username: string | null | undefined) {
  const key =
    username && username.trim() !== ''
      ? `/api/user/follow/${encodeURIComponent(username)}`
      : null

  const { data, isLoading, mutate } = useSWR<FollowState>(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    fallbackData: { isFollowing: false, followerCount: 0, followingCount: 0 },
  })

  const state: FollowState =
    data ?? { isFollowing: false, followerCount: 0, followingCount: 0 }

  // Tracks in-flight follow/unfollow requests. SWR's `isLoading` only
  // covers the initial fetch, so the Follow button would otherwise
  // never show a spinner while we POST/DELETE. We expose this as
  // `isPending` so consumers can disable the button and swap the
  // label to a loading state.
  const [isPending, setIsPending] = useState(false)

  // Optimistic follow — flip the flag and bump the follower count
  // before the POST resolves so the button never feels laggy. On
  // failure we revert to the server's truth (SWR re-fetches for us
  // via `mutate()` with no argument).
  const follow = async () => {
    if (!key) return
    setIsPending(true)
    const optimistic: FollowState = {
      isFollowing: true,
      followerCount: state.followerCount + (state.isFollowing ? 0 : 1),
      followingCount: state.followingCount,
    }
    await mutate(optimistic, { revalidate: false })
    try {
      const res = await fetch(key, { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error('follow failed')
      const next = (await res.json()) as FollowState
      await mutate(next, { revalidate: false })
    } catch {
      await mutate()
    } finally {
      setIsPending(false)
    }
  }

  const unfollow = async () => {
    if (!key) return
    setIsPending(true)
    const optimistic: FollowState = {
      isFollowing: false,
      followerCount: Math.max(
        0,
        state.followerCount - (state.isFollowing ? 1 : 0),
      ),
      followingCount: state.followingCount,
    }
    await mutate(optimistic, { revalidate: false })
    try {
      const res = await fetch(key, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('unfollow failed')
      const next = (await res.json()) as FollowState
      await mutate(next, { revalidate: false })
    } catch {
      await mutate()
    } finally {
      setIsPending(false)
    }
  }

  return {
    ...state,
    isLoading,
    isPending,
    follow,
    unfollow,
    toggle: () => (state.isFollowing ? unfollow() : follow()),
  }
}
