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
 *   - If `hasInitialUser` is false and `hasSessionCookie` is false, the server
 *     confirmed there is NO valid session on this load -> skip redundant 401 mount
 *     fetch (any leftover `ds_auth_uid` cookie is stale and gets scrubbed) UNLESS
 *     an in-tab client sign-in (`clientAuthChanged: true`) occurred after load.
 * - When rendered outside `<AuthProvider>` (`initialResolved: false`), always
 *   fetch `/api/auth/me` on mount as before.
 */
export function shouldRevalidateAuthOnMount(opts: {
  initialResolved: boolean
  hasInitialUser: boolean
  hasSessionCookie: boolean
  hasCookieUid: boolean
  cookieUidMismatch?: boolean
  clientAuthChanged?: boolean
}): boolean {
  if (!opts.initialResolved) return true
  if (opts.cookieUidMismatch) return true
  if (opts.hasInitialUser) return false
  if (opts.hasSessionCookie) return true
  if (opts.hasCookieUid && opts.clientAuthChanged) return true
  return false
}
