import { aliasFor, isReservedUsername } from './reserved-usernames'

/**
 * Valid public username handles (`@username` at root `/:username`).
 */
export const USERNAME_SEGMENT_PATTERN = /^[a-zA-Z0-9_]{3,30}$/

/**
 * Profile sharing also supports UUID user IDs for accounts that haven't
 * chosen a custom handle yet (`/{uuid}`).
 */
export const USER_ID_SEGMENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ProfileSegmentDecision =
  | { kind: 'redirect'; to: string }
  | { kind: 'not_found'; reason: 'empty' | 'reserved' | 'invalid_format' }
  | { kind: 'lookup'; cleanHandle: string; isUuid: boolean }

/**
 * Determine how `app/[username]` should treat a single root path segment.
 *
 * Known aliases redirect to their canonical page; reserved keywords and
 * strings that cannot be a username or UUID immediately resolve to 404
 * (`app/not-found.tsx`) rather than rendering a misleading "Profile Not Found"
 * screen. Only valid handle/UUID shapes are looked up in `users` — and if
 * no matching accessible user exists, the route still returns 404.
 */
export function classifyProfileSegment(
  rawSegment: string | null | undefined,
): ProfileSegmentDecision {
  const segment = typeof rawSegment === 'string' ? rawSegment.trim() : ''
  if (!segment) {
    return { kind: 'not_found', reason: 'empty' }
  }

  const aliasTarget = aliasFor(segment)
  if (aliasTarget) {
    return { kind: 'redirect', to: aliasTarget }
  }

  if (isReservedUsername(segment)) {
    return { kind: 'not_found', reason: 'reserved' }
  }

  if (USER_ID_SEGMENT_PATTERN.test(segment)) {
    return { kind: 'lookup', cleanHandle: segment, isUuid: true }
  }

  if (USERNAME_SEGMENT_PATTERN.test(segment)) {
    return { kind: 'lookup', cleanHandle: segment.toLowerCase(), isUuid: false }
  }

  return { kind: 'not_found', reason: 'invalid_format' }
}
