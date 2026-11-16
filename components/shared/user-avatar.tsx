'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  getUserInitials,
  isLocalAssetUrl,
  resolveDisplayAvatar,
} from '@/lib/avatar-utils'

interface UserAvatarProps {
  avatarUrl?: string | null
  firstName?: string | null
  lastName?: string | null
  role?: string | null
  gender?: string | null
  sizePx?: number
  priority?: boolean
  alt?: string
  fallback?: string
  className?: string
  imgClassName?: string
}

/**
 * Unified user avatar renderer:
 * - Resolves role/gender-aware default portraits via `resolveDisplayAvatar`
 * - Optimizes heavy local `/avatars/*.jpg` files through Next `<Image>` (WebP, bounded width)
 * - Uses `referrerPolicy="no-referrer"`, `decoding="async"`, and `fetchPriority="high"` for external/data URLs
 * - Gracefully falls back to initials if an image URL fails to load
 */
export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  role,
  gender,
  sizePx = 80,
  priority = false,
  alt = '',
  fallback = 'DS',
  imgClassName = 'w-full h-full object-cover',
}: UserAvatarProps) {
  const resolved = resolveDisplayAvatar(avatarUrl, role, gender)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  useEffect(() => {
    setFailedSrc(null)
  }, [resolved])

  if (resolved && failedSrc !== resolved) {
    if (isLocalAssetUrl(resolved)) {
      return (
        <Image
          src={resolved}
          alt={alt}
          aria-hidden={alt === '' ? true : undefined}
          width={sizePx}
          height={sizePx}
          sizes={`${sizePx}px`}
          priority={priority}
          loading={priority ? undefined : 'eager'}
          decoding="async"
          referrerPolicy="no-referrer"
          className={imgClassName}
          onError={() => setFailedSrc(resolved)}
        />
      )
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        aria-hidden={alt === '' ? true : undefined}
        referrerPolicy="no-referrer"
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={imgClassName}
        onError={() => setFailedSrc(resolved)}
      />
    )
  }

  return <>{getUserInitials(firstName, lastName, fallback)}</>
}
