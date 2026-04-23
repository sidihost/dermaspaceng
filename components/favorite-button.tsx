'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useFavorites, type FavoriteItemType } from '@/hooks/use-favorites'

interface FavoriteButtonProps {
  itemType: FavoriteItemType
  itemId: string
  label?: string
  href?: string
  /**
   * Visual variant. `solid` places the button on a light surface
   * (cards, list rows). `overlay` is for image overlays where the
   * button needs its own frosted chip to stay legible.
   */
  variant?: 'solid' | 'overlay'
  size?: 'sm' | 'md'
  className?: string
  /**
   * Accessible label override. Defaults adapt to the current
   * favorited state so screen readers get "Add to favorites" /
   * "Remove from favorites" automatically.
   */
  ariaLabel?: string
}

export default function FavoriteButton({
  itemType,
  itemId,
  label,
  href,
  variant = 'overlay',
  size = 'md',
  className = '',
  ariaLabel,
}: FavoriteButtonProps) {
  const router = useRouter()
  const { isFavorited, addFavorite, removeFavorite } = useFavorites()
  const [busy, setBusy] = useState(false)
  const active = isFavorited(itemType, itemId)

  // Sizing tokens kept in one place so the button stays consistent
  // across every card variant it shows up on.
  const sizeClasses =
    size === 'sm'
      ? 'w-7 h-7'
      : 'w-9 h-9'
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  const baseClasses =
    variant === 'overlay'
      ? `rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors`
      : `rounded-full bg-[#7B2D8E]/5 hover:bg-[#7B2D8E]/10 transition-colors`

  const onClick = async (e: React.MouseEvent) => {
    // Critical: cards wrap this button in a <Link>, so without
    // stopPropagation the navigation fires before we can toggle.
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      if (active) {
        await removeFavorite(itemType, itemId)
      } else {
        await addFavorite({ itemType, itemId, label: label ?? null, href: href ?? null })
      }
    } catch (err) {
      // 401 = guest. Send them to sign-in and come back to the current
      // page so the action they attempted is a tap away.
      if (err instanceof Error && err.message === 'Failed') {
        const redirect = typeof window !== 'undefined' ? window.location.pathname : '/'
        router.push(`/signin?redirect=${encodeURIComponent(redirect)}`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? (active ? 'Remove from favorites' : 'Add to favorites')}
      disabled={busy}
      className={`inline-flex items-center justify-center ${sizeClasses} ${baseClasses} ${
        busy ? 'opacity-70 cursor-wait' : ''
      } ${className}`}
    >
      <Heart
        className={`${iconSize} transition-colors ${
          active
            ? 'text-[#7B2D8E] fill-[#7B2D8E]'
            : variant === 'overlay'
              ? 'text-gray-700'
              : 'text-[#7B2D8E]'
        }`}
      />
    </button>
  )
}
