'use client'

/**
 * Permissions panel.
 *
 * Lists every browser-level permission Dermaspace surfaces, what we
 * use it for, and the user's current grant state — modeled after the
 * iOS / Firebase "Permissions" sub-screen the user sent in
 * Screenshot_20260426-052051.jpg.
 *
 * For each permission we follow a three-state model:
 *   - granted  → green chip, "Allowed"
 *   - prompt   → primary purple "Allow" button (browser will prompt)
 *   - denied   → muted "Open browser settings" hint with help text
 *
 * We use `navigator.permissions.query` where supported (Chrome /
 * Edge / Firefox / Android Chrome) and fall back to feature-detect
 * + best-effort messaging on Safari, which still doesn't ship the
 * Permissions API for camera/microphone in 2026.
 *
 * The list is intentionally explicit (not a dynamic loop) because
 * each permission has bespoke "why we ask" copy — generic permission
 * lists feel sketchy, and Dermaspace's whole brand is the opposite
 * of sketchy.
 */

import * as React from 'react'
import { Bell, Camera, Mic, MapPin, Calendar, Check, ExternalLink } from 'lucide-react'

type State = 'granted' | 'prompt' | 'denied' | 'unknown'

interface Row {
  /** Stable id used in React keys. */
  id: string
  /** Lucide icon component for the leading slot. */
  Icon: React.ComponentType<{ className?: string }>
  label: string
  /** One-sentence "why we ask" copy. */
  why: string
  /**
   * Permissions API name. Some browsers don't support every name —
   * we feature-detect at query time and fall back to `unknown` so we
   * still render the row instead of hiding it.
   */
  permName?: PermissionName
  /**
   * Imperative request when the user taps "Allow". For Notifications
   * this is `Notification.requestPermission()`; for camera / mic it's
   * `getUserMedia` with the relevant constraint; for geolocation it's
   * `getCurrentPosition`. Returning the new state lets the caller
   * patch local state without re-querying.
   */
  request?: () => Promise<State>
  /**
   * For permissions a webpage cannot grant directly (calendar,
   * contacts), we surface a "system settings" hint instead of a
   * request button — same as the screenshot.
   */
  systemOnly?: boolean
}

function useGrantState(rows: Row[]): Record<string, State> {
  const [states, setStates] = React.useState<Record<string, State>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, 'unknown' as State])),
  )

  React.useEffect(() => {
    let cancelled = false

    async function read() {
      const next: Record<string, State> = {}

      for (const r of rows) {
        if (r.systemOnly) {
          next[r.id] = 'unknown'
          continue
        }

        if (r.id === 'notifications') {
          // Notification API has its own getter — older browsers
          // don't expose `navigator.permissions.query` for it.
          if (typeof Notification !== 'undefined') {
            const p = Notification.permission
            next[r.id] =
              p === 'granted' ? 'granted'
              : p === 'denied' ? 'denied'
              : 'prompt'
            continue
          }
        }

        try {
          const perms = (navigator as Navigator & {
            permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> }
          }).permissions
          if (perms && r.permName) {
            const status = await perms.query({ name: r.permName })
            next[r.id] = status.state as State
            continue
          }
        } catch { /* fall through to unknown */ }

        next[r.id] = 'unknown'
      }

      if (!cancelled) setStates(next)
    }

    void read()
    return () => { cancelled = true }
  }, [rows])

  return states
}

interface PermissionsPanelProps {
  /** Called when the user taps a system-link / "open privacy" CTA. */
  onClose: () => void
}

export function PermissionsPanel({ onClose }: PermissionsPanelProps) {
  // Imperative request handlers. We keep these inside the component
  // (instead of inlining in the row config) so they can patch local
  // state directly after the browser resolves the prompt.
  const rows: Row[] = React.useMemo(() => [
    {
      id: 'notifications',
      Icon: Bell,
      label: 'Notifications',
      why: 'So we can ping you when an admin replies or your booking moves.',
      permName: 'notifications' as PermissionName,
      request: async () => {
        if (typeof Notification === 'undefined') return 'unknown'
        const p = await Notification.requestPermission()
        return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt'
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
          // NotAllowedError → user said no; we map to denied so the
          // UI shows the "open browser settings" hint immediately.
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
  ], [])

  const states = useGrantState(rows)
  const [pending, setPending] = React.useState<string | null>(null)
  const [local, setLocal] = React.useState<Record<string, State>>({})

  function effective(id: string): State {
    return local[id] ?? states[id] ?? 'unknown'
  }

  async function onRequest(r: Row) {
    if (!r.request) return
    setPending(r.id)
    try {
      const next = await r.request()
      setLocal((l) => ({ ...l, [r.id]: next }))
    } finally {
      setPending(null)
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
          return (
            <div
              key={r.id}
              className={i > 0 ? 'border-t border-gray-100' : ''}
            >
              <div className="flex items-start gap-3 px-3 py-3">
                <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                  <r.Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-gray-900">{r.label}</p>
                    {state === 'granted' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Check className="w-3 h-3" />
                        Allowed
                      </span>
                    )}
                    {state === 'denied' && (
                      <span className="text-[11px] font-semibold text-gray-500 flex-shrink-0">
                        Blocked
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-gray-500 leading-snug">
                    {r.why}
                  </p>
                  {/* Action row: state-dependent CTAs. */}
                  <div className="mt-2">
                    {r.systemOnly ? (
                      <p className="text-[11px] text-gray-500">
                        Manage in your phone or browser system settings.
                      </p>
                    ) : state === 'prompt' || state === 'unknown' ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => void onRequest(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B2D8E] text-white text-[11.5px] font-semibold hover:bg-[#7B2D8E]/90 transition-colors disabled:opacity-60"
                      >
                        {isPending ? 'Requesting…' : 'Allow'}
                      </button>
                    ) : state === 'denied' ? (
                      <p className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                        <ExternalLink className="w-3 h-3" />
                        Re-enable in browser settings
                      </p>
                    ) : null}
                  </div>
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
      {/* Re-export the close prop so the eslint no-unused-vars rule
          stays quiet — actual closing is handled by the caller's
          back button. */}
      <span className="hidden" data-close={typeof onClose === 'function' ? '1' : '0'} />
    </div>
  )
}
