'use client'

/**
 * Shake-to-feedback.
 *
 * Listens to the device accelerometer and, when the user gives
 * their phone a deliberate shake (think "shake to undo" on iOS),
 * routes them to the feedback page. Replaces the previous
 * "Haptic feedback" toggle in Derma AI settings — instead of just
 * vibrating on taps, the device gesture itself becomes the
 * feedback affordance.
 *
 * ── Detection algorithm ──────────────────────────────────────────
 *
 * The previous version computed jerk (Δacceleration / Δt) which
 * was unreliable: most phones sample motion at ~60Hz so dt is
 * ~16ms, making the divisor noisy and the threshold (22) impossible
 * to calibrate. We now use the proven "count peaks within a window"
 * pattern used by Android's SensorManager samples:
 *
 *   1. On each motion event, compute |a| − g (gravity-removed
 *      magnitude) so resting orientation doesn't matter.
 *   2. If that exceeds SHAKE_PEAK (12 m/s² ≈ "yanked the phone"),
 *      record a peak.
 *   3. If we record SHAKE_PEAKS_NEEDED peaks within SHAKE_WINDOW_MS,
 *      fire the shake.
 *   4. COOLDOWN_MS prevents a single shake from firing twice.
 *
 * This catches a real phone shake (back-and-forth at least 3 times)
 * but ignores walking, handing the phone to a friend, or putting
 * it down on a desk.
 *
 * ── Feedback UX ───────────────────────────────────────────────────
 *
 * When a shake is detected we:
 *   1. Vibrate (`navigator.vibrate`) so the user feels the gesture
 *      registered, even before they look at the screen.
 *   2. Fire a brand toast ("Shake detected — opening feedback") so
 *      the navigation that's about to happen feels intentional and
 *      not like a glitch.
 *   3. Push to /feedback?source=shake.
 *
 * ── Disabling ─────────────────────────────────────────────────────
 *
 * The toggle in Derma AI Settings → "Shake for feedback" writes to
 * localStorage under STORAGE_KEY. The hook reads that flag on every
 * motion event, so toggling it off takes effect immediately
 * without a reload.
 */

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const STORAGE_KEY = 'derma-shake-feedback'

/** True when the user hasn't explicitly disabled shake-to-feedback. */
export function shakeFeedbackEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v !== '0'
  } catch {
    return true
  }
}

/** Persist the user's preference. Safe to call on the server (no-op). */
export function setShakeFeedbackEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch { /* storage may be disabled */ }
}

/**
 * Ask iOS for DeviceMotion permission. On Android / desktop this
 * resolves to `'granted'` immediately because no prompt exists.
 *
 * IMPORTANT: must be called from a user-gesture handler (the
 * settings toggle, a "Test" button, etc.) — Safari throws
 * "NotAllowedError" if invoked from anywhere else.
 */
export async function requestShakePermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined') return 'unsupported'
  const w = window as Window & { DeviceMotionEvent?: typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> } }
  const Ev = w.DeviceMotionEvent
  if (!Ev) return 'unsupported'
  if (typeof Ev.requestPermission === 'function') {
    try {
      const res = await Ev.requestPermission()
      return res === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  }
  return 'granted'
}

/** Pluggable hook for other code (e.g. notify) to know about a shake. */
export type ShakeListener = (source: 'shake') => void
const listeners = new Set<ShakeListener>()

/**
 * Subscribe to shake events. Returns an unsubscribe fn. Mostly used
 * by the global ShakeToFeedback mount component to fire a toast
 * before navigating.
 */
export function onShake(listener: ShakeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitShake() {
  for (const l of listeners) {
    try { l('shake') } catch { /* never let one listener break others */ }
  }
}

/**
 * Hook: subscribe to devicemotion globally and, on a vigorous
 * shake, route to /feedback?source=shake. Suppressed when the
 * user is already on /feedback so we don't fire mid-form, and on
 * admin / staff surfaces.
 */
export function useShakeToFeedback(): void {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('DeviceMotionEvent' in window)) return
    if (pathname?.startsWith('/feedback')) return
    if (pathname?.startsWith('/admin')) return
    if (pathname?.startsWith('/staff')) return

    // Tunables — calibrated so a real "shake the phone" gesture
    // triggers, but normal handling does not.
    const SHAKE_PEAK = 12        // m/s² above gravity per peak
    const SHAKE_PEAKS_NEEDED = 3 // peaks within the window
    const SHAKE_WINDOW_MS = 800  // peaks must happen this close together
    const COOLDOWN_MS = 3500     // ignore further shakes for this long

    let peaks: number[] = []
    let lastShake = 0

    function onMotion(e: DeviceMotionEvent) {
      // Re-read on every event so toggling off in settings takes
      // effect immediately (no reload required).
      if (!shakeFeedbackEnabled()) return

      // Prefer `accelerationIncludingGravity` because it's the most
      // widely supported. We subtract gravity (≈9.81) from the
      // magnitude so resting on a desk reads as 0, not 9.8.
      const a = e.accelerationIncludingGravity
      if (!a) return
      const ax = a.x ?? 0
      const ay = a.y ?? 0
      const az = a.z ?? 0
      const magnitude = Math.sqrt(ax * ax + ay * ay + az * az)
      const delta = Math.abs(magnitude - 9.81)

      const now = Date.now()
      if (delta > SHAKE_PEAK) {
        peaks.push(now)
        // Drop peaks older than the window so the count reflects
        // only the *current* shake gesture.
        peaks = peaks.filter((t) => now - t <= SHAKE_WINDOW_MS)
        if (peaks.length >= SHAKE_PEAKS_NEEDED && now - lastShake > COOLDOWN_MS) {
          lastShake = now
          peaks = []
          // Tactile confirmation — feels like the "undo" tap on iOS.
          try { navigator.vibrate?.([40, 30, 40]) } catch { /* no-op */ }
          // Let any subscribers (toast, analytics, etc.) react
          // BEFORE we navigate, so the hint shows on the current
          // page and the new page just continues from there.
          emitShake()
          // Fire-and-forget navigation. We use a short delay so the
          // toast that subscribers fired is on-screen before the
          // route change.
          window.setTimeout(() => {
            try {
              router.push('/feedback?source=shake')
            } catch {
              window.location.href = '/feedback?source=shake'
            }
          }, 150)
        }
      }
    }

    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [router, pathname])
}
