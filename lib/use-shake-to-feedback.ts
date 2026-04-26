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
 * Two safety nets:
 *   1. We respect a localStorage preference (`derma-shake-feedback`)
 *      so users who don't like surprise navigation can turn it off.
 *      Default is ON because the gesture is intentional and rare.
 *   2. iOS Safari requires `DeviceMotionEvent.requestPermission()`
 *      before delivering motion events. We expose a helper so the
 *      settings UI can prompt for that permission inline.
 *
 * Threshold tuning: SHAKE_THRESHOLD ~22 m/s² catches a deliberate
 * back-and-forth shake but ignores normal walking / handing the
 * phone to a friend. COOLDOWN prevents a single shake from firing
 * the navigation twice.
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

/**
 * Hook: subscribe to devicemotion globally and, on a vigorous
 * shake, route to /feedback?source=shake. Suppressed when the
 * user is already on /feedback so we don't fire mid-form.
 */
export function useShakeToFeedback(): void {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('DeviceMotionEvent' in window)) return
    // Skip on auth / admin / staff surfaces and the feedback page itself.
    if (pathname?.startsWith('/feedback')) return
    if (pathname?.startsWith('/admin')) return
    if (pathname?.startsWith('/staff')) return

    let last = { x: 0, y: 0, z: 0, t: 0 }
    let lastShake = 0
    const SHAKE_THRESHOLD = 22 // m/s² delta — calibrated against walking
    const COOLDOWN = 4000

    function onMotion(e: DeviceMotionEvent) {
      if (!shakeFeedbackEnabled()) return
      const a = e.accelerationIncludingGravity
      if (!a) return
      const now = Date.now()
      const dt = now - last.t
      if (dt < 80) return
      const ax = a.x ?? 0
      const ay = a.y ?? 0
      const az = a.z ?? 0
      const dx = ax - last.x
      const dy = ay - last.y
      const dz = az - last.z
      const speed = (Math.sqrt(dx * dx + dy * dy + dz * dz) / dt) * 1000
      last = { x: ax, y: ay, z: az, t: now }
      if (speed > SHAKE_THRESHOLD && now - lastShake > COOLDOWN) {
        lastShake = now
        try {
          router.push('/feedback?source=shake')
        } catch {
          window.location.href = '/feedback?source=shake'
        }
      }
    }

    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [router, pathname])
}
