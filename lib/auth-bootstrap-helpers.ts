/**
 * Pure types and decision helpers for server-to-client auth hydration.
 * Safe to import in both server and client modules and unit tests.
 */

export interface AuthMembershipData {
  tier: string | null
  status: string | null
  startedAt: string | null
  expiresAt: string | null
  fundedAmount: number
  balance: number
  glowPoints: number
}

export interface AuthUserData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  gender?: 'male' | 'female' | null
  username?: string | null
  role?: 'user' | 'staff' | 'admin'
  isSuperAdmin?: boolean
  isPublic?: boolean
  coverStyle?: string | null
  dateOfBirth?: string | null
  legalAcceptedVersion?: string | null
  legalAcceptedAt?: string | null
  staffPolicyAcceptedVersion?: string | null
  staffPolicyAcceptedAt?: string | null
  mustChangePassword?: boolean
  emailVerified?: boolean
  emailIsPlaceholder?: boolean
  profileComplete?: boolean
  xUsername?: string | null
  hasSocialAuth?: boolean
  needsProfileCompletion?: boolean
  membership?: AuthMembershipData
}

export interface AuthPreferencesData {
  skinType: string
  concerns: string[]
  preferredServices: string[]
  preferredLocation: string
  notifications: boolean
}

export interface InitialAuthState {
  user: AuthUserData | null
  preferences: AuthPreferencesData | null
  hasSessionCookie: boolean
  resolved: boolean
}

export function parsePgStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value
      .slice(1, -1)
      .split(',')
      .filter(Boolean)
      .map((s) => s.replace(/^"|"$/g, ''))
  }
  return []
}

/**
 * Decides whether `useAuth()` needs to fire an immediate client `/api/auth/me`
 * request on mount.
 *
 * - When the root Server Component already resolved auth (`initialResolved: true`):
 *   - If `hasInitialUser` is true and there is no UID mismatch, the server JUST
 *     validated the live session for this exact document -> skip redundant mount fetch.
 *   - If `hasInitialUser` is false and neither `hasSessionCookie` nor `hasCookieUid`
 *     is set, the visitor is a confirmed guest -> skip redundant 401 mount fetch.
 *   - If `hasCookieUid` is set while `hasInitialUser` is false (e.g. session changed
 *     in-browser or bfcache restored), revalidate immediately.
 * - When rendered outside `<AuthProvider>` (`initialResolved: false`), always
 *   fetch `/api/auth/me` on mount as before.
 */
export function shouldRevalidateAuthOnMount(opts: {
  initialResolved: boolean
  hasInitialUser: boolean
  hasSessionCookie: boolean
  hasCookieUid: boolean
  cookieUidMismatch?: boolean
}): boolean {
  if (!opts.initialResolved) return true
  if (opts.cookieUidMismatch) return true
  if (opts.hasInitialUser) return false
  if (opts.hasSessionCookie || opts.hasCookieUid) return true
  return false
}
