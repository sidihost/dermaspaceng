'use client'

/**
 * Permissions panel.
 *
 * Lists every browser-level permission Dermaspace surfaces, what we
 * use it for, and the user's current grant state.
 *
 * For each permission we follow a three-state model:
 *   - granted  → brand-purple chip, "Allowed"
 *   - prompt   → primary purple "Allow" button (browser will prompt)
 *   - denied   → interactive "Open settings" button that reveals step-by-step
 *                browser/device instructions, a copyable site-settings link,
 *                and a live "Check again" re-query (plus auto-refresh on focus)
 */

import * as React from 'react'
import {
  Bell,
  Camera,
  Mic,
  MapPin,
  Calendar,
  Check,
  ExternalLink,
  Copy,
  RefreshCw,
  ChevronUp,
} from 'lucide-react'

type State = 'granted' | 'prompt' | 'denied' | 'unknown'

interface Row {
  id: string
  Icon: React.ComponentType<{ className?: string }>
  label: string
  why: string
  permName?: PermissionName
  request?: () => Promise<State>
  systemOnly?: boolean
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(safe)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function syncBrowserPushSubscription(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const res = await fetch('/api/push/vapid-public-key', { cache: 'no-store' })
    if (!res.ok) return
    const { publicKey, previewBlocked } = (await res.json()) as {
      publicKey?: string | null
      previewBlocked?: boolean
    }
    if (previewBlocked || !publicKey) return
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      }))
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })
  } catch {
    /* non-critical — push may not be configured in dev */
  }
}

function detectBrowserSteps(permLabel: string): {
  browserLabel: string
  steps: string[]
  chromiumUrl: string | null
} {
  if (typeof navigator === 'undefined') {
    return {
      browserLabel: 'Browser settings',
      steps: [`Open your browser settings, locate Site Permissions, and allow ${permLabel}.`],
      chromiumUrl: null,
    }
  }
  const ua = navigator.userAgent || ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isFirefox = /Firefox/i.test(ua)
  const isEdge = /Edg\//i.test(ua)
  const isChrome = /Chrome|CriOS/i.test(ua) && !isEdge

  if (isIos) {
    return {
      browserLabel: 'iPhone / iPad Settings',
      steps: [
        'Open the iOS Settings app and scroll to Safari (or Dermaspace if installed on your Home Screen).',
        `Tap Notifications / Site Settings and set ${permLabel} to Allow.`,
        'Return here and tap "Check again".',
      ],
      chromiumUrl: null,
    }
  }
  if (isAndroid && isChrome) {
    return {
      browserLabel: 'Chrome on Android',
      steps: [
        'Tap the tune / lock icon next to the address bar at the top.',
        `Tap Permissions -> ${permLabel}, then choose Allow.`,
        'Come back here and tap "Check again".',
      ],
      chromiumUrl: origin
        ? `chrome://settings/content/siteDetails?site=${encodeURIComponent(origin)}`
        : null,
    }
  }
  if (isFirefox) {
    return {
      browserLabel: 'Firefox Settings',
      steps: [
        'Click the shield / lock icon in the address bar.',
        `Next to Blocked (${permLabel}), click the X to clear it, then reload.`,
      ],
      chromiumUrl: null,
    }
  }
  if (isEdge) {
    return {
      browserLabel: 'Microsoft Edge Settings',
      steps: [
        'Click the lock / tune icon at the left of the address bar.',
        `Switch ${permLabel} from Block to Allow, or copy the Edge site settings link below into a new tab.`,
      ],
      chromiumUrl: origin
        ? `edge://settings/content/siteDetails?site=${encodeURIComponent(origin)}`
        : null,
    }
  }
  return {
    browserLabel: 'Chrome / Desktop Browser',
    steps: [
      'Click the tune / site-info icon to the left of the URL bar.',
      `Toggle ${permLabel} to Allow (or copy the site settings link below into a new tab).`,
      'Tap "Check again" to confirm it is enabled.',
    ],
    chromiumUrl: origin
      ? `chrome://settings/content/siteDetails?site=${encodeURIComponent(origin)}`
      : null,
  }
}

function useGrantState(rows: Row[]): {
  states: Record<string, State>
  refresh: () => Promise<void>
} {
  const [states, setStates] = React.useState<Record<string, State>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, 'unknown' as State])),
  )

  const refresh = React.useCallback(async () => {
    const next: Record<string, State> = {}

    for (const r of rows) {
      if (r.systemOnly) {
        next[r.id] = 'unknown'
        continue
      }

      if (r.id === 'notifications') {
        if (typeof Notification !== 'undefined') {
          const p = Notification.permission
          next[r.id] =
            p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt'
          continue
        }
      }

      try {
        const perms = (
          navigator as Navigator & {
            permissions?: {
              query: (d: { name: PermissionName }) => Promise<PermissionStatus>
            }
          }
        ).permissions
        if (perms && r.permName) {
          const status = await perms.query({ name: r.permName })
          next[r.id] = status.state as State
          continue
        }
      } catch {
        /* fall through to unknown */
      }

      next[r.id] = 'unknown'
    }

    setStates(next)
  }, [rows])

  React.useEffect(() => {
    void refresh()
    const onFocus = () => void refresh()
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refresh])

  return { states, refresh }
}

interface PermissionsPanelProps {
  onClose: () => void
  /** Pre-expand the settings guide for a specific permission id (e.g. "notifications"). */
  initialGuideId?: string | null
  /** Optional callback fired when Notifications permission transitions to granted. */
  onNotificationGranted?: () => void
}

export function PermissionsPanel({
  onClose,
  initialGuideId = null,
  onNotificationGranted,
}: PermissionsPanelProps) {
  const rows: Row[] = React.useMemo(
    () => [
      {
        id: 'notifications',
        Icon: Bell,
        label: 'Notifications',
        why: 'So we can ping you when an admin replies or your booking moves.',
        permName: 'notifications' as PermissionName,
        request: async () => {
          if (typeof Notification === 'undefined') return 'unknown'
          const p = await Notification.requestPermission()
          if (p === 'granted') {
            void syncBrowserPushSubscription()
            onNotificationGranted?.()
            return 'granted'
          }
          return p === 'denied' ? 'denied' : 'prompt'
        },
      },
      {
        id: 'microphone',
        Icon: Mic,
        label: 'Microphone',
        why: 'Powers Derma AI Live voice chat and hands-free questions.',
        permName: 'microphone' as PermissionName,
        request: async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach((t) => t.stop())
            return 'granted'
          } catch (e) {
            if (e && (e as Error).name === 'NotAllowedError') return 'denied'
            return 'prompt'
          }
        },
      },
      {
        id: 'camera',
        Icon: Camera,
        label: 'Camera',
        why: 'Lets you upload selfies for Derma AI to scan your skin.',
        permName: 'camera' as PermissionName,
        request: async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach((t) => t.stop())
            return 'granted'
          } catch (e) {
            if (e && (e as Error).name === 'NotAllowedError') return 'denied'
            return 'prompt'
          }
        },
      },
      {
        id: 'location',
        Icon: MapPin,
        label: 'Location',
        why: 'Helps the assistant suggest the nearest Dermaspace location.',
        permName: 'geolocation' as PermissionName,
        request: () =>
          new Promise<State>((resolve) => {
            if (!('geolocation' in navigator)) return resolve('unknown')
            navigator.geolocation.getCurrentPosition(
              () => resolve('granted'),
              (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'prompt'),
              { timeout: 8000, maximumAge: 60_000 },
            )
          }),
      },
      {
        id: 'calendar',
        Icon: Calendar,
        label: 'Calendar',
        why: 'Used when you add a booking to your phone calendar (.ics).',
        systemOnly: true,
      },
    ],
    [onNotificationGranted],
  )

  const { states, refresh } = useGrantState(rows)
  const [pending, setPending] = React.useState<string | null>(null)
  const [local, setLocal] = React.useState<Record<string, State>>({})
  const [openGuideId, setOpenGuideId] = React.useState<string | null>(initialGuideId)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [recheckingId, setRecheckingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (initialGuideId) setOpenGuideId(initialGuideId)
  }, [initialGuideId])

  function effective(id: string): State {
    return local[id] ?? states[id] ?? 'unknown'
  }

  async function onRequest(r: Row) {
    if (!r.request) return
    setPending(r.id)
    try {
      const next = await r.request()
      setLocal((l) => ({ ...l, [r.id]: next }))
      if (next === 'denied') {
        setOpenGuideId(r.id)
      }
    } finally {
      setPending(null)
    }
  }

  async function onRecheck(id: string) {
    setRecheckingId(id)
    setLocal((l) => {
      const copy = { ...l }
      delete copy[id]
      return copy
    })
    await refresh()
    if (id === 'notifications' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      void syncBrowserPushSubscription()
      onNotificationGranted?.()
      setOpenGuideId(null)
    }
    setRecheckingId(null)
  }

  function copySettingsUrl(id: string, url: string) {
    try {
      void navigator.clipboard.writeText(url)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-gray-500 leading-relaxed px-1">
        These are the device permissions Dermaspace can ask for. We
        only request a permission when you tap a feature that needs
        it — nothing here is enabled by default.
      </p>

      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
        {rows.map((r, i) => {
          const state = effective(r.id)
          const isPending = pending === r.id
          const guideOpen = openGuideId === r.id
          const guideInfo = guideOpen ? detectBrowserSteps(r.label) : null

          return (
            <div
              key={r.id}
              id={`permission-${r.id}`}
              className={i > 0 ? 'border-t border-gray-100' : ''}
            >
              <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
                <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                  <r.Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-gray-900">{r.label}</p>
                    {state === 'granted' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Check className="w-3 h-3" />
                        Allowed
                      </span>
                    )}
                    {state === 'denied' && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
                        Blocked
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-gray-500 leading-snug">
                    {r.why}
                  </p>

                  {/* Action row: state-dependent interactive CTAs */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {r.systemOnly ? (
                      <button
                        type="button"
                        onClick={() => setOpenGuideId(guideOpen ? null : r.id)}
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#7B2D8E] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {guideOpen ? 'Hide instructions' : 'Open system instructions'}
                      </button>
                    ) : state === 'prompt' || state === 'unknown' ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => void onRequest(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B2D8E] text-white text-[11.5px] font-semibold hover:bg-[#5A1D6A] transition-colors disabled:opacity-60"
                      >
                        {isPending ? 'Requesting…' : 'Allow'}
                      </button>
                    ) : state === 'denied' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setOpenGuideId(guideOpen ? null : r.id)}
                          aria-expanded={guideOpen}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7B2D8E]/30 bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11.5px] font-semibold hover:bg-[#7B2D8E]/15 transition-colors"
                        >
                          {guideOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5" />
                          )}
                          {guideOpen ? 'Hide settings guide' : 'Open settings'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onRecheck(r.id)}
                          disabled={recheckingId === r.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-[11.5px] font-medium hover:bg-gray-50 transition-colors"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${recheckingId === r.id ? 'animate-spin' : ''}`}
                          />
                          Check again
                        </button>
                      </>
                    ) : null}
                  </div>

                  {/* Interactive browser/device settings instructions drawer */}
                  {guideOpen && guideInfo && (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-[#FAF6FB] p-3 text-xs text-gray-700 space-y-2">
                      <p className="font-semibold text-gray-900">
                        How to allow {r.label} ({guideInfo.browserLabel})
                      </p>
                      <ol className="list-decimal pl-4 space-y-1 text-[11.5px] text-gray-600 leading-relaxed">
                        {guideInfo.steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                      {guideInfo.chromiumUrl && (
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copySettingsUrl(r.id, guideInfo.chromiumUrl!)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
                          >
                            {copiedId === r.id ? (
                              <>
                                <Check className="w-3 h-3 text-[#7B2D8E]" />
                                Copied settings URL — paste in new tab
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy browser settings link
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-500 text-center leading-relaxed px-2 pt-1">
        We never use these permissions in the background. Each is
        only active while the related feature is in use.
      </p>
      <span className="hidden" data-close={typeof onClose === 'function' ? '1' : '0'} />
    </div>
  )
}
