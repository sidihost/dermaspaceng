import { resolveAdminAvatar } from './admin-avatars'

/** Maximum base64 data URI length allowed inside localStorage auth cache (~96 KB). */
export const MAX_CACHED_DATA_AVATAR_LEN = 96 * 1024

export function isLocalAssetUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const trimmed = url.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//')
}

export function isDataAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.trim().toLowerCase().startsWith('data:')
}

/**
 * Normalizes an avatar URL for localStorage caching.
 * Huge inline base64 data URIs slow JSON.parse on every navigation and risk
 * exhausting the 5 MB origin quota, so we omit oversized data URIs from the
 * lightweight display cache (SWR background revalidation still hydrates them).
 */
export function sanitizeAvatarForCache(url: string | null | undefined): string | null | undefined {
  if (url === undefined) return undefined
  if (url === null) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (isDataAvatarUrl(trimmed) && trimmed.length > MAX_CACHED_DATA_AVATAR_LEN) {
    return null
  }
  return trimmed
}

export function getUserInitials(
  firstName?: string | null,
  lastName?: string | null,
  fallback = 'DS',
): string {
  const first = (firstName || '').trim().charAt(0).toUpperCase()
  const last = (lastName || '').trim().charAt(0).toUpperCase()
  const combined = `${first}${last}`
  return combined || fallback
}

export function resolveDisplayAvatar(
  avatarUrl: string | null | undefined,
  role?: string | null,
  gender?: string | null,
): string | null {
  const resolved = resolveAdminAvatar(avatarUrl, role, gender)
  return resolved && resolved.trim().length > 0 ? resolved.trim() : null
}
