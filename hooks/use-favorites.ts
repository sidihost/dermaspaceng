'use client'

import useSWR from 'swr'

export type FavoriteItemType = 'treatment' | 'package' | 'category'

export interface Favorite {
  itemType: FavoriteItemType
  itemId: string
  label: string | null
  href: string | null
  createdAt?: string
}

const fetcher = async (url: string): Promise<Favorite[]> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) return []
  const data = await res.json()
  return (data.favorites ?? []) as Favorite[]
}

// Stable cache key — keep it simple so every FavoriteButton reads and
// mutates the same list without fetching per-card.
const FAVORITES_KEY = '/api/user/favorites'

export function useFavorites() {
  const { data, error, isLoading, mutate } = useSWR<Favorite[]>(
    FAVORITES_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      fallbackData: [],
    }
  )

  const favorites = data ?? []

  const isFavorited = (itemType: FavoriteItemType, itemId: string) =>
    favorites.some((f) => f.itemType === itemType && f.itemId === itemId)

  const addFavorite = async (fav: Favorite) => {
    // Optimistic: drop it in front so the heart fills immediately.
    const next: Favorite[] = [fav, ...favorites.filter(
      (f) => !(f.itemType === fav.itemType && f.itemId === fav.itemId)
    )]
    await mutate(next, { revalidate: false })

    try {
      const res = await fetch(FAVORITES_KEY, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: fav.itemType,
          itemId: fav.itemId,
          label: fav.label,
          href: fav.href,
        }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch (err) {
      // Roll back on failure so the UI matches the server.
      await mutate(favorites, { revalidate: false })
      throw err
    }
  }

  const removeFavorite = async (itemType: FavoriteItemType, itemId: string) => {
    const next = favorites.filter(
      (f) => !(f.itemType === itemType && f.itemId === itemId)
    )
    await mutate(next, { revalidate: false })

    try {
      const qs = new URLSearchParams({ itemType, itemId }).toString()
      const res = await fetch(`${FAVORITES_KEY}?${qs}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed')
    } catch (err) {
      await mutate(favorites, { revalidate: false })
      throw err
    }
  }

  return {
    favorites,
    isLoading,
    error,
    isFavorited,
    addFavorite,
    removeFavorite,
  }
}
