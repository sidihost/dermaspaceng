'use client'

/**
 * Push subscribe prompt
 *
 * Shown to logged-in users (passed via the `enabled` prop) the first
 * time they land on the site after the push feature is enabled.
 * Asks the browser for notification permission, subscribes via the
 * existing service worker, and POSTs the subscription to
 * `/api/push/subscribe` so admin broadcasts can reach them.
 *
 * Behaviour:
 *   - Hidden if push isn't configured (no VAPID key) — the API
 *     endpoint returns publicKey: null and we silently bail.
 *   - Hidden if the user has already granted (subscribed) or denied
 *     permission, or has dismissed the prompt in this browser.
 *   - First-render delay of ~12s so we don't crowd the install
 *     prompt or the AI launcher on first paint.
 *   - Brand-purple flat card (no gradients) matching the install
 *     prompt's visual language.
 */

import * as React from 'react'
import { Bell, X } from 'lucide-react'

const DISMISS_KEY = 'dermaspace-push-prompt-dismissed'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(safe)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function PushSubscribePrompt({ enabled }: { enabled: boolean }) {
  const [show, setShow] = React.useState(false)
  const [vapidKey, setVapidKey] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'default') return
    if (sessionStorage.getItem(DISMISS_KEY) || localStorage.getItem(DISMISS_KEY)) return

    let cancelled = false
    const t = window.setTimeout(async () => {
      if (cancelled) return
      try {
        const res = await fetch('/api/push/vapid-public-key')
        if (!res.ok) return
        const { publicKey } = await res.json()
        if (!publicKey || cancelled) return
        // If we already have an active subscription, don't show.
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) return
        setVapidKey(publicKey)
        setShow(true)
      } catch { /* silent */ }
    }, 12_000)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [enabled])

  async function handleAllow() {
    if (!vapidKey || busy) return
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        // Treat denial as a hard dismiss — don't pester users.
        localStorage.setItem(DISMISS_KEY, '1')
        setShow(false)
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      localStorage.setItem(DISMISS_KEY, '1')
      setShow(false)
    } catch (err) {
      console.error('[push-prompt] subscribe failed', err)
      // Don't permanently dismiss on a transient error — fall back
      // to session-only so we'll try again next visit.
      sessionStorage.setItem(DISMISS_KEY, '1')
      setShow(false)
    } finally {
      setBusy(false)
    }
  }

  function handleDismiss() {
    // Soft dismiss — only suppressed for the current tab session.
    sessionStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Enable notifications"
      className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-[85] animate-in slide-in-from-bottom duration-300"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-[#7B2D8E] px-5 py-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Stay in the loop</h3>
              <p className="text-xs text-white/80 mt-0.5">Booking updates &amp; offers</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Turn on notifications to get reminders for your appointments and the occasional treat
            from us. We&apos;ll never spam you.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-full transition-colors border border-gray-200"
            >
              Not now
            </button>
            <button
              onClick={handleAllow}
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm bg-[#7B2D8E] text-white rounded-full hover:bg-[#6B2D7E] transition-colors font-medium disabled:opacity-60"
            >
              {busy ? 'Enabling…' : 'Enable'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
