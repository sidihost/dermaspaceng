/**
 * Pure policy, eligibility, and positioning helpers for the compact
 * browser notification opt-in prompt.
 *
 * Kept framework-free so every rule can be verified directly with
 * `node:test` without spinning up React or a browser.
 */

export const PUSH_PROMPT_DISMISS_KEY = 'dermaspace-push-prompt-dismissed'
export const COOKIE_CONSENT_STORAGE_KEY = 'ds.cookies.consent'

export const PUSH_PROMPT_EXCLUDED_PREFIXES = [
  '/admin',
  '/staff',
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/complete-profile',
  '/verify-email',
  '/maintenance',
  '/offline',
  '/blocked',
] as const

export function isPushPromptRouteAllowed(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return true
  const clean = pathname.split('?')[0]
  return !PUSH_PROMPT_EXCLUDED_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`),
  )
}

export function shouldEnablePushPrompt(params: {
  pathname: string | null | undefined
  role?: string | null
  pushFlagEnabled: boolean
}): boolean {
  if (!isPushPromptRouteAllowed(params.pathname)) return false
  if (params.role === 'admin' || params.role === 'staff') return false
  return Boolean(params.pushFlagEnabled)
}

export interface PushEligibilityInput {
  supported: boolean
  originAllowed: boolean
  isPreviewHost: boolean
  enabled: boolean
  cookieSettled: boolean
  permission: NotificationPermission | 'unsupported'
  dismissedInSession: boolean
  dismissedInStorage: boolean
  previewBlockedByApi: boolean
  vapidPublicKey: string | null
  hasExistingSubscription: boolean
}

export interface PushEligibilityDecision {
  show: boolean
  reason:
    | 'eligible'
    | 'unsupported'
    | 'preview-or-disallowed-origin'
    | 'disabled-by-gate'
    | 'waiting-for-cookie-consent'
    | 'already-granted'
    | 'denied'
    | 'dismissed'
    | 'already-subscribed'
  canWebPushSubscribe: boolean
}

export function evaluatePushPromptEligibility(
  input: PushEligibilityInput,
): PushEligibilityDecision {
  if (!input.supported) {
    return { show: false, reason: 'unsupported', canWebPushSubscribe: false }
  }
  if (!input.originAllowed || input.isPreviewHost || input.previewBlockedByApi) {
    return {
      show: false,
      reason: 'preview-or-disallowed-origin',
      canWebPushSubscribe: false,
    }
  }
  if (!input.enabled) {
    return { show: false, reason: 'disabled-by-gate', canWebPushSubscribe: false }
  }
  if (!input.cookieSettled) {
    return {
      show: false,
      reason: 'waiting-for-cookie-consent',
      canWebPushSubscribe: false,
    }
  }
  if (input.permission === 'granted') {
    return { show: false, reason: 'already-granted', canWebPushSubscribe: false }
  }
  if (input.permission === 'denied' || input.permission === 'unsupported') {
    return { show: false, reason: 'denied', canWebPushSubscribe: false }
  }
  if (input.dismissedInSession || input.dismissedInStorage) {
    return { show: false, reason: 'dismissed', canWebPushSubscribe: false }
  }
  if (input.hasExistingSubscription) {
    return {
      show: false,
      reason: 'already-subscribed',
      canWebPushSubscribe: false,
    }
  }
  return {
    show: true,
    reason: 'eligible',
    canWebPushSubscribe: Boolean(input.vapidPublicKey),
  }
}

export function resolvePushPromptTiming(cookieConsentSettled: boolean): {
  delayMs: number
  mobileBottomClass: string
  desktopBottomClass: string
} {
  return cookieConsentSettled
    ? {
        delayMs: 1200,
        mobileBottomClass: 'bottom-[92px]',
        desktopBottomClass: 'md:bottom-[68px]',
      }
    : {
        delayMs: 3500,
        mobileBottomClass: 'bottom-[136px]',
        desktopBottomClass: 'md:bottom-[104px]',
      }
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(safe)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
