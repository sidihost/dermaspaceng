'use client'

/**
 * Compact, professional notification opt-in banner.
 *
 * Design rules:
 *   - Strictly flat Dermaspace palette (#FFFFFF surface, hairline
 *     #E5E7EB border, #7B2D8E brand purple accent) — NO gradients,
 *     NO drop shadows, NO Sparkles/Zap icons.
 *   - Small footprint so it complements the page without obscuring
 *     content, MobileNav, CookieBanner, or the bottom-right Derma AI
 *     launcher.
 *   - Requests standard browser `Notification.requestPermission()` and,
 *     when VAPID keys + a signed-in session + active Service Worker
 *     exist, binds the Web Push subscription via `/api/push/subscribe`.
 */

import * as React from 'react'
import { Bell, X } from 'lucide-react'
import {
  isPreviewOrVercelDeploymentHost,
  isServiceWorkerAllowedOrigin,
} from '@/lib/push-origin'
import {
  COOKIE_CONSENT_STORAGE_KEY,
  PUSH_PROMPT_DISMISS_KEY,
  evaluatePushPromptEligibility,
  resolvePushPromptTiming,
  urlBase64ToUint8Array,
} from '@/lib/push-prompt-helpers'
import { useNotify } from './notify'

export function PushSubscribePrompt({
  enabled,
  isSignedIn = false,
}: {
  enabled: boolean
  isSignedIn?: boolean
}) {
  const notify = useNotify()
  const [show, setShow] = React.useState(false)
  const [vapidKey, setVapidKey] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [cookieSettled, setCookieSettled] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const readCookieSettled = () => {
      try {
        const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
        return stored === 'accepted' || stored === 'dismissed'
      } catch {
        return true
      }
    }

    setCookieSettled(readCookieSettled())
    const onCookiesSettled = () => setCookieSettled(true)
    window.addEventListener('ds:cookies-settled', onCookiesSettled)
    return () => {
      window.removeEventListener('ds:cookies-settled', onCookiesSettled)
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const hasNotificationApi = 'Notification' in window
    const hasSwApi = 'serviceWorker' in navigator
    const originAllowed = isServiceWorkerAllowedOrigin(window.location.origin, {
      configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      allowLocalhost: true,
    })
    const isPreviewHost = isPreviewOrVercelDeploymentHost(window.location.origin)

    if ((!originAllowed || isPreviewHost) && hasSwApi) {
      navigator.serviceWorker
        .getRegistrations?.()
        .then(async (regs) => {
          for (const reg of regs) {
            const existing = await reg.pushManager?.getSubscription().catch(() => null)
            if (existing) {
              await existing.unsubscribe().catch(() => {})
            }
          }
        })
        .catch(() => {})
      return
    }

    const dismissedInSession = (() => {
      try {
        return Boolean(window.sessionStorage.getItem(PUSH_PROMPT_DISMISS_KEY))
      } catch {
        return false
      }
    })()
    const dismissedInStorage = (() => {
      try {
        return Boolean(window.localStorage.getItem(PUSH_PROMPT_DISMISS_KEY))
      } catch {
        return false
      }
    })()

    const preCheck = evaluatePushPromptEligibility({
      supported: hasNotificationApi,
      originAllowed,
      isPreviewHost,
      enabled,
      cookieSettled,
      permission: hasNotificationApi ? Notification.permission : 'unsupported',
      dismissedInSession,
      dismissedInStorage,
      previewBlockedByApi: false,
      vapidPublicKey: null,
      hasExistingSubscription: false,
    })

    if (!preCheck.show) {
      setShow(false)
      return
    }

    let cancelled = false
    const { delayMs } = resolvePushPromptTiming(cookieSettled)

    const timer = window.setTimeout(async () => {
      if (cancelled) return

      let publicKey: string | null = null
      let previewBlockedByApi = false
      try {
        const res = await fetch('/api/push/vapid-public-key', { cache: 'no-store' })
        if (res.ok) {
          const json = (await res.json()) as {
            publicKey?: string | null
            previewBlocked?: boolean
          }
          publicKey = json.publicKey ?? null
          previewBlockedByApi = Boolean(json.previewBlocked)
        }
      } catch {
        /* non-critical in offline/local preview */
      }

      if (cancelled) return

      let hasExistingSubscription = false
      if (hasSwApi && 'PushManager' in window) {
        try {
          const reg = await navigator.serviceWorker.getRegistration()
          const existing = await reg?.pushManager?.getSubscription().catch(() => null)
          hasExistingSubscription = Boolean(existing)
        } catch {
          hasExistingSubscription = false
        }
      }

      if (cancelled) return

      const decision = evaluatePushPromptEligibility({
        supported: hasNotificationApi,
        originAllowed,
        isPreviewHost,
        enabled,
        cookieSettled,
        permission: Notification.permission,
        dismissedInSession,
        dismissedInStorage,
        previewBlockedByApi,
        vapidPublicKey: publicKey,
        hasExistingSubscription,
      })

      if (decision.show) {
        setVapidKey(publicKey)
        setShow(true)
      }
    }, delayMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, cookieSettled])

  async function handleEnable() {
    if (busy || typeof Notification === 'undefined') return
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        try {
          window.localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, '1')
        } catch {
          /* ignore */
        }
        setShow(false)
        return
      }

      if (
        vapidKey &&
        isSignedIn &&
        'serviceWorker' in navigator &&
        'PushManager' in window
      ) {
        try {
          const reg = await navigator.serviceWorker.ready
          const existing = await reg.pushManager.getSubscription()
          const sub =
            existing ||
            (await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
            }))
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub.toJSON() }),
          })
        } catch {
          /* permission is granted — gate effect will re-sync when ready */
        }
      }

      try {
        window.localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, '1')
      } catch {
        /* ignore */
      }
      setShow(false)
      notify.success(
        'Notifications enabled',
        'You will receive booking updates and reminders.',
      )
    } catch {
      try {
        window.sessionStorage.setItem(PUSH_PROMPT_DISMISS_KEY, '1')
      } catch {
        /* ignore */
      }
      setShow(false)
    } finally {
      setBusy(false)
    }
  }

  function handleDismiss() {
    try {
      window.sessionStorage.setItem(PUSH_PROMPT_DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  if (!show) return null

  const { mobileBottomClass, desktopBottomClass } = resolvePushPromptTiming(cookieSettled)

  return (
    <div
      role="dialog"
      aria-label="Enable notifications"
      className={`fixed ${mobileBottomClass} ${desktopBottomClass} left-3 right-[84px] md:left-5 md:right-auto md:w-[332px] z-[85] transition-[bottom] duration-200`}
    >
      <div className="bg-white rounded-xl border border-gray-200 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <span
            className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <Bell className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                Enable notifications
              </p>
              <button
                type="button"
                onClick={handleDismiss}
                className="-mr-1 -mt-1 p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors flex-shrink-0"
                aria-label="Dismiss notification prompt"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="mt-0.5 text-[12px] text-gray-600 leading-snug">
              Booking confirmations, reminders, and therapist replies.
            </p>
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1 text-[12px] font-medium text-gray-600 hover:bg-gray-50 rounded-full border border-gray-200 transition-colors"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={handleEnable}
                disabled={busy}
                className="px-3.5 py-1 text-[12px] font-medium bg-[#7B2D8E] text-white rounded-full hover:bg-[#5A1D6A] transition-colors disabled:opacity-60"
              >
                {busy ? 'Enabling…' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
