export interface OnboardingUserLike {
  email?: string | null
  emailIsPlaceholder?: boolean | null
  emailVerified?: boolean | null
  mustChangePassword?: boolean | null
  username?: string | null
  xUsername?: string | null
  role?: string | null
  profileComplete?: boolean | null
  hasSocialAuth?: boolean | null
  needsProfileCompletion?: boolean | null
}

/**
 * Detect internal synthetic placeholder emails assigned to accounts created
 * without a verified real address (e.g. X OAuth signups or pending staff rows).
 * These addresses must never be surfaced to customers in the UI.
 */
export function isPlaceholderEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false
  const trimmed = email.trim()
  if (!trimmed) return false
  return (
    (trimmed.startsWith('pending+') && trimmed.endsWith('@dermaspaceng.invalid')) ||
    /^x_[^@]+@users\.dermaspaceng\.com$/i.test(trimmed)
  )
}

/**
 * Return the user's real email address for display/form pre-fill, or `''`
 * when the stored address is an internal synthetic placeholder.
 */
export function getVisibleEmail(
  user: Pick<OnboardingUserLike, 'email' | 'emailIsPlaceholder'> | null | undefined,
): string {
  if (!user) return ''
  if (user.emailIsPlaceholder) return ''
  if (!user.email || typeof user.email !== 'string') return ''
  if (isPlaceholderEmail(user.email)) return ''
  return user.email.trim()
}

/**
 * Friendly secondary label shown under a user's display name in headers,
 * profile menus, and account cards. Never exposes `x_<id>@users.dermaspaceng.com`.
 */
export function formatAccountSubtitle(
  user:
    | Pick<
        OnboardingUserLike,
        'email' | 'emailIsPlaceholder' | 'username' | 'xUsername' | 'needsProfileCompletion'
      >
    | null
    | undefined,
): string {
  if (!user) return ''
  const visible = getVisibleEmail(user)
  if (visible) return visible

  const handle = (user.username || user.xUsername || '').trim().replace(/^@+/, '')
  if (handle) return `@${handle}`

  if (
    user.emailIsPlaceholder ||
    user.needsProfileCompletion ||
    isPlaceholderEmail(user.email)
  ) {
    return 'Finish profile setup'
  }

  return ''
}

/**
 * Determine whether an authenticated account must complete `/complete-profile`
 * before entering the customer dashboard or booking flows.
 *
 * Rules:
 *   - Only customer accounts (`role === 'user'` or unset) are gated; staff/admins
 *     have their own welcome gate.
 *   - Accounts with a synthetic placeholder email are always gated until they
 *     provide a real email in `/complete-profile`.
 *   - Social-login accounts (`hasSocialAuth === true`: Google, Microsoft, or X)
 *     are gated while `profileComplete` is false. Email/password signups leave
 *     `profile_complete = false` in legacy rows and are NOT gated so existing
 *     email-registered customers are never locked out.
 */
export function shouldRequireProfileCompletion(input: {
  role?: string | null
  profileComplete?: boolean | null
  hasSocialAuth?: boolean | null
  email?: string | null
}): boolean {
  const role = input.role || 'user'
  if (role !== 'user') return false

  if (isPlaceholderEmail(input.email)) {
    return true
  }

  if (input.profileComplete === true) {
    return false
  }

  return Boolean(input.hasSocialAuth)
}

/**
 * Sanitize a relative post-auth redirect target and force `/complete-profile`
 * when onboarding is incomplete.
 */
export function resolvePostAuthRedirect(
  requestedRedirect: string | null | undefined,
  user: OnboardingUserLike | null | undefined,
): string {
  if (
    user &&
    (user.needsProfileCompletion === true ||
      shouldRequireProfileCompletion({
        role: user.role,
        profileComplete: user.profileComplete,
        hasSocialAuth: user.hasSocialAuth,
        email: user.email,
      }))
  ) {
    return '/complete-profile'
  }

  if (!requestedRedirect || typeof requestedRedirect !== 'string') {
    return '/dashboard'
  }

  const trimmed = requestedRedirect.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('/signin') ||
    trimmed.startsWith('/signup')
  ) {
    return '/dashboard'
  }

  return trimmed
}

/**
 * Routes that an incomplete social user cannot enter until they finish
 * `/complete-profile`. Auth pages (`/signin`, `/signup`) and booking/dashboard
 * flows bounce directly back to `/complete-profile` across tabs & reloads.
 */
export function isOnboardingGatedPath(pathname: string): boolean {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/signin' ||
    pathname.startsWith('/signin/') ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/') ||
    pathname === '/verify-email' ||
    pathname === '/booking' ||
    pathname.startsWith('/booking/') ||
    pathname === '/consultation' ||
    pathname.startsWith('/consultation/')
  )
}

/**
 * True when an authenticated user has a real (non-placeholder) email address
 * that has not been verified yet, and is not currently blocked on profile
 * completion or a forced temporary-password change.
 */
export function shouldPromptEmailVerification(
  user: OnboardingUserLike | null | undefined,
): boolean {
  if (!user) return false
  if (user.emailVerified === true) return false
  if (user.emailIsPlaceholder === true || isPlaceholderEmail(user.email)) {
    return false
  }
  if (user.needsProfileCompletion === true || user.mustChangePassword === true) {
    return false
  }
  return getVisibleEmail(user) !== ''
}

