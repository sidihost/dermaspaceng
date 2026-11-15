export const NEWSLETTER_STORAGE_KEYS = {
  subscribed: 'ds.newsletter.subscribed',
  dismissedAt: 'ds.newsletter.dismissedAt',
  lastShownAt: 'ds.newsletter.lastShownAt',
  sessionShown: 'ds.newsletter.sessionShown',
} as const

// Normal website cadence:
// - If a visitor explicitly dismisses the popup, stay quiet for 14 days.
// - Even if they close without dismissing or navigate away, wait at least
//   24 hours and never show more than once per browsing session.
// - Once subscribed, never show the popup again on that browser.
export const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000
export const SHOW_COOLDOWN_MS = 24 * 60 * 60 * 1000

const SUPPRESSED_PREFIXES = [
  '/admin',
  '/staff',
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/accept-invite',
  '/complete-profile',
  '/offline',
  '/maintenance',
  '/booking',
  '/checkout',
  '/dashboard',
]

export function isNewsletterPopupSuppressedPath(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return true
  const normalized = pathname.toLowerCase()
  return SUPPRESSED_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  )
}

export interface NewsletterPopupEligibilityInput {
  pathname: string | null | undefined
  isFeatureEnabled: boolean
  userRole?: string | null
  subscribed: boolean
  shownInSession: boolean
  dismissedAt: number | null
  lastShownAt: number | null
  now: number
}

export function shouldShowNewsletterPopup(
  input: NewsletterPopupEligibilityInput,
): boolean {
  if (!input.isFeatureEnabled) return false
  if (isNewsletterPopupSuppressedPath(input.pathname)) return false
  if (input.userRole === 'admin' || input.userRole === 'staff') return false
  if (input.subscribed) return false
  if (input.shownInSession) return false

  if (
    input.dismissedAt !== null &&
    Number.isFinite(input.dismissedAt) &&
    input.now - input.dismissedAt < DISMISS_COOLDOWN_MS
  ) {
    return false
  }

  if (
    input.lastShownAt !== null &&
    Number.isFinite(input.lastShownAt) &&
    input.now - input.lastShownAt < SHOW_COOLDOWN_MS
  ) {
    return false
  }

  return true
}

export function parseStoredTimestamp(raw: string | null): number | null {
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
