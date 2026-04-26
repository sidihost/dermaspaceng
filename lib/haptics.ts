/**
 * Haptic feedback helper.
 *
 * Wraps `navigator.vibrate` so the rest of the app can fire short
 * tactile pulses without each call site having to feature-detect or
 * read the user preference. Two layers of safety:
 *
 *   1. We only fire if the user has the "Haptic feedback" toggle on
 *      in Derma AI settings (persisted under `derma-ai-haptics`).
 *      Default is ON because the API is a no-op on devices without
 *      a vibration motor (most desktops), so opt-out is the right
 *      polarity.
 *   2. We hard-bail when `navigator.vibrate` isn't a function —
 *      iOS Safari, for example, ignores the API entirely and we
 *      don't want a TypeError to bubble up from a UI handler.
 *
 * Patterns are tuned to be subtle. iOS guidelines (and our own dog-
 * fooding) show that anything > ~25ms feels like a buzz on the wrist
 * rather than a tick.
 */

const STORAGE_KEY = 'derma-ai-haptics'

/** True when the user hasn't explicitly disabled haptics. */
export function hapticsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    // Default ON — only "0" disables. This way fresh users get the
    // polish out of the box without a settings detour.
    return v !== '0'
  } catch {
    return true
  }
}

/** Persist the user's preference. Safe to call on the server (no-op). */
export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch { /* storage may be disabled */ }
}

/**
 * Fire a haptic pulse. Pattern can be a single number (ms) or an
 * array of [vibrate, pause, vibrate, …] in ms. Silently no-ops on
 * unsupported browsers and when the user has haptics disabled.
 */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof window === 'undefined') return
  if (!hapticsEnabled()) return
  const vib = (window.navigator as Navigator & { vibrate?: (p: number | number[]) => boolean })
    .vibrate
  if (typeof vib !== 'function') return
  try {
    vib.call(window.navigator, pattern)
  } catch { /* some browsers throw if called outside a user gesture */ }
}

/** Named presets so call sites read intentionally. */
export const HAPTICS = {
  /** Lightest tap — taps, toggles, list selections. */
  tick: () => haptic(8),
  /** Confirm / success — slightly heavier. */
  success: () => haptic([12, 30, 12]),
  /** Warning / destructive — three-tap rumble. */
  warn: () => haptic([20, 40, 20, 40, 20]),
}
