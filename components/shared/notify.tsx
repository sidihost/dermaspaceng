'use client'

/**
 * Brand notification system
 *
 * A lightweight, purpose-built toast/notification primitive that
 * replaces the plain "Profile updated successfully!" inline messages
 * scattered across the app. It's intentionally NOT sonner or shadcn-
 * toast: both are available in the codebase but not mounted, and the
 * brand wanted a specific look (white card, brand-purple accent
 * bar, rounded icon badge, brand-coloured progress timer).
 *
 * Why roll our own:
 *   - Full visual control of the card, icon, accent, and timer bar so
 *     the "success" confirmation feels on-brand instead of generic.
 *   - No external dependency ordering concerns (sonner expects a
 *     theme provider; shadcn's <Toaster /> hasn't been mounted).
 *   - Tiny surface area: a single provider + a single `useNotify()`
 *     hook that exposes `.success / .error / .info / .loading`.
 *
 * Usage:
 *   const notify = useNotify()
 *   notify.success('Profile updated', 'Your changes are live.')
 *   const id = notify.loading('Saving…')
 *   notify.update(id, { variant: 'success', title: 'Saved' })
 *
 * Mount <NotifyProvider /> once at the root (see app/layout.tsx).
 */

import * as React from 'react'
import {
  Check,
  AlertCircle,
  Info,
  X,
  Loader2,
  BellRing,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Variant = 'success' | 'error' | 'info' | 'loading' | 'reminder'

type Notification = {
  id: string
  variant: Variant
  title: string
  description?: string
  /** Duration in ms before auto-dismiss. 0 / undefined for loading
   *  means "don't auto-dismiss, wait for `.update()` or `.dismiss()`". */
  duration: number
}

type NotifyOptions = {
  description?: string
  /** Override default duration. Defaults: success/info 3200ms,
   *  error 4600ms, loading never auto-dismisses. */
  duration?: number
  /** Skip the chime for this specific notification. Useful for
   *  background updates you don't want to draw attention to. */
  silent?: boolean
}

type NotifyApi = {
  success: (title: string, description?: string, opts?: NotifyOptions) => string
  error: (title: string, description?: string, opts?: NotifyOptions) => string
  info: (title: string, description?: string, opts?: NotifyOptions) => string
  /** A friendly nudge — uses the bell icon + a two-note chime. Good
   *  for appointment reminders, booking updates, etc. */
  reminder: (title: string, description?: string, opts?: NotifyOptions) => string
  loading: (title: string, description?: string) => string
  update: (
    id: string,
    patch: Partial<Pick<Notification, 'variant' | 'title' | 'description' | 'duration'>>,
  ) => void
  dismiss: (id: string) => void
  /** Toggle the global notification chime on/off. Persists to
   *  localStorage so the preference survives reloads. */
  setSoundEnabled: (enabled: boolean) => void
  isSoundEnabled: () => boolean
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotifyContext = React.createContext<NotifyApi | null>(null)

/**
 * Primary hook. Safe to call before the provider has mounted — we
 * fall back to a no-op API + a console warning so a misconfigured
 * call site never crashes a page in production. In dev you'll see
 * the warning and know to wrap your tree.
 */
export function useNotify(): NotifyApi {
  const ctx = React.useContext(NotifyContext)
  if (ctx) return ctx
  // Fallback — logs once per missing call so the dev sees it without
  // spamming the console.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[notify] useNotify() called outside <NotifyProvider />. ' +
        'Wrap your app tree in <NotifyProvider /> (mount at root).',
    )
  }
  const noop = () => ''
  return {
    success: noop,
    error: noop,
    info: noop,
    reminder: noop,
    loading: noop,
    update: () => {},
    dismiss: () => {},
    setSoundEnabled: () => {},
    isSoundEnabled: () => false,
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEFAULT_DURATION: Record<Variant, number> = {
  success: 3200,
  info: 3200,
  reminder: 4200,
  error: 4600,
  loading: 0,
}

const MAX_VISIBLE = 4

// ---------------------------------------------------------------------------
// Sound engine
// ---------------------------------------------------------------------------
//
// Chimes are synthesised on the fly with Web Audio so we don't ship
// any .mp3/.wav assets (keeps the bundle lean and lets us tune the
// tones without touching binary files). Each variant gets a short
// two-note motif in a pleasant interval:
//   success  — perfect fifth, bright and confirming
//   reminder — gentle bell-like descending third (bell-tap feel)
//   info     — single soft note
//   error    — low descending minor second, immediately readable as
//              "something's wrong" without being harsh
//   loading  — silent (progress toasts shouldn't ding repeatedly)
//
// A shared AudioContext is created lazily on the first chime so we
// respect the browser's user-gesture autoplay policy — the first
// notify call that happens after any user interaction will unlock
// audio, subsequent calls reuse the same context.
//
// The preference is persisted to localStorage under SOUND_KEY so
// toggling it via notify.setSoundEnabled() survives reloads, and the
// default is ON.

const SOUND_KEY = 'derma:notify-sound'

const SOUND_MOTIFS: Record<Variant, Array<{ freq: number; start: number; dur: number; gain: number }>> = {
  success: [
    // E5 → B5 — perfect fifth, feels like a confirmation
    { freq: 659.25, start: 0, dur: 0.13, gain: 0.18 },
    { freq: 987.77, start: 0.08, dur: 0.22, gain: 0.15 },
  ],
  reminder: [
    // B5 → G5 — descending minor third, bell-like
    { freq: 987.77, start: 0, dur: 0.18, gain: 0.16 },
    { freq: 783.99, start: 0.14, dur: 0.28, gain: 0.13 },
  ],
  info: [
    // Single soft A5
    { freq: 880, start: 0, dur: 0.16, gain: 0.12 },
  ],
  error: [
    // D5 → C#5 — descending half-step, low-ish
    { freq: 587.33, start: 0, dur: 0.12, gain: 0.16 },
    { freq: 554.37, start: 0.09, dur: 0.22, gain: 0.14 },
  ],
  loading: [],
}

function readSoundPreference(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = window.localStorage.getItem(SOUND_KEY)
    if (v === null) return true
    return v === '1'
  } catch {
    return true
  }
}

function writeSoundPreference(enabled: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? '1' : '0')
  } catch {
    /* storage blocked (private mode, quota) — silently ignore */
  }
}

/**
 * Plays the chime for the given variant on the shared AudioContext.
 * All failure modes (unsupported browser, autoplay blocked, suspended
 * context) are swallowed — missing sound must never affect the visual
 * notification behaviour.
 */
function playChime(
  ctxRef: React.MutableRefObject<AudioContext | null>,
  variant: Variant,
) {
  const motif = SOUND_MOTIFS[variant]
  if (!motif || motif.length === 0) return
  if (typeof window === 'undefined') return

  // Lazily initialise so the AudioContext is only constructed after a
  // user has interacted with the page at least once (which is what
  // typically triggers the first notification anyway).
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return
    if (!ctxRef.current) ctxRef.current = new Ctor()
    const ctx = ctxRef.current
    // Some browsers start the context suspended; resume silently.
    if (ctx.state === 'suspended') {
      // fire-and-forget: if resume rejects we just drop the chime.
      ctx.resume().catch(() => {})
    }

    const master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)

    const now = ctx.currentTime
    motif.forEach(({ freq, start, dur, gain }) => {
      const osc = ctx.createOscillator()
      // Sine = warm and non-harsh; triangle would be slightly brighter
      // but sine pairs better with a calm brand voice.
      osc.type = 'sine'
      osc.frequency.value = freq

      const env = ctx.createGain()
      // Quick attack + exponential release for a "pluck" envelope that
      // never overlaps harshly with surrounding UI sounds.
      env.gain.setValueAtTime(0, now + start)
      env.gain.linearRampToValueAtTime(gain, now + start + 0.015)
      env.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)

      osc.connect(env)
      env.connect(master)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    })
  } catch {
    /* audio failure should never break toasts */
  }
}

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Notification[]>([])

  // Shared AudioContext across the provider's lifetime. `useRef`
  // instead of state because changing it should never trigger a
  // render — it's a side-channel for audio only.
  const audioCtxRef = React.useRef<AudioContext | null>(null)
  // Preference lives in a ref so playback reads the latest value
  // without causing push() / api to reallocate when toggled.
  const soundEnabledRef = React.useRef<boolean>(true)
  // Hydrate the preference on mount. Can't read localStorage during
  // render (SSR) so we defer to an effect.
  React.useEffect(() => {
    soundEnabledRef.current = readSoundPreference()
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const push = React.useCallback(
    (variant: Variant, title: string, description?: string, opts?: NotifyOptions) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const duration = opts?.duration ?? DEFAULT_DURATION[variant]
      setItems((prev) => {
        const next = [
          ...prev,
          { id, variant, title, description: opts?.description ?? description, duration },
        ]
        // Keep the queue bounded so a save loop can't fill the screen.
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next
      })
      // Fire chime after the state update so a synthesous render can't
      // block the scheduled tone. `silent: true` per-call OR the
      // global preference being off skips the chime entirely.
      if (!opts?.silent && soundEnabledRef.current) {
        playChime(audioCtxRef, variant)
      }
      return id
    },
    [],
  )

  const update = React.useCallback<NotifyApi['update']>((id, patch) => {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              ...patch,
              // If the variant changed to something auto-dismissable and
              // the caller didn't supply a duration, fall back to the
              // variant's default so updated loading → success toasts
              // actually dismiss on their own.
              duration:
                patch.duration !== undefined
                  ? patch.duration
                  : patch.variant && patch.variant !== 'loading'
                    ? DEFAULT_DURATION[patch.variant]
                    : n.duration,
            }
          : n,
      ),
    )
  }, [])

  const api = React.useMemo<NotifyApi>(
    () => ({
      success: (title, description, opts) => push('success', title, description, opts),
      error: (title, description, opts) => push('error', title, description, opts),
      info: (title, description, opts) => push('info', title, description, opts),
      reminder: (title, description, opts) => push('reminder', title, description, opts),
      loading: (title, description) => push('loading', title, description),
      update,
      dismiss,
      setSoundEnabled: (enabled: boolean) => {
        soundEnabledRef.current = enabled
        writeSoundPreference(enabled)
      },
      isSoundEnabled: () => soundEnabledRef.current,
    }),
    [push, update, dismiss],
  )

  return (
    <NotifyContext.Provider value={api}>
      {children}
      <NotifyViewport items={items} onDismiss={dismiss} />
    </NotifyContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Viewport + Card
// ---------------------------------------------------------------------------

const BRAND = '#7B2D8E'

function NotifyViewport({
  items,
  onDismiss,
}: {
  items: Notification[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      // Top-centre on mobile so it reads as a banner and doesn't
      // fight the floating Derma AI / bottom nav; top-right on md+
      // so it behaves like a classic desktop toast stack.
      className="fixed z-[200] pointer-events-none inset-x-0 top-0 px-3 pt-3 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end sm:px-0 sm:pt-0"
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="Notifications"
    >
      {items.map((n) => (
        <NotifyCard key={n.id} item={n} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function NotifyCard({
  item,
  onDismiss,
}: {
  item: Notification
  onDismiss: (id: string) => void
}) {
  const [leaving, setLeaving] = React.useState(false)

  // Auto-dismiss timer. `duration === 0` means stay until updated or
  // dismissed explicitly — used for 'loading' toasts.
  React.useEffect(() => {
    if (!item.duration) return
    const t = window.setTimeout(() => {
      setLeaving(true)
      // After the exit animation settles, remove from state.
      window.setTimeout(() => onDismiss(item.id), 180)
    }, item.duration)
    return () => window.clearTimeout(t)
  }, [item.duration, item.id, onDismiss])

  const close = () => {
    setLeaving(true)
    window.setTimeout(() => onDismiss(item.id), 180)
  }

  const icon = (() => {
    switch (item.variant) {
      case 'success':
        return <Check className="w-4 h-4 text-white" strokeWidth={3} />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-white" />
      case 'info':
        return <Info className="w-4 h-4 text-white" />
      case 'reminder':
        return <BellRing className="w-4 h-4 text-white" />
      case 'loading':
        return <Loader2 className="w-4 h-4 text-white animate-spin" />
      default:
        return <Info className="w-4 h-4 text-white" />
    }
  })()

  // Accent colour for the left bar + icon badge. Brand purple for
  // success/info/loading so we stay on-palette; red only for errors
  // because the design system needs a clear "this is wrong" signal
  // that purple can't carry.
  const accent = item.variant === 'error' ? '#C63D3D' : BRAND

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      className={[
        // Pointer events on — the viewport itself is pointer-events:
        // none so clicks pass through between toasts.
        'pointer-events-auto w-full max-w-sm sm:w-[22rem] relative overflow-hidden',
        'rounded-2xl bg-white ring-1 ring-black/5 border border-gray-100',
        // Intentionally restrained elevation. The user asked us to
        // pull back on shadows generally; a notification still needs
        // *some* separation from the page, so a soft single-layer
        // shadow is all we use.
        'shadow-[0_10px_30px_-12px_rgba(17,24,39,0.15)]',
        // Enter/exit animation using CSS — keeps the component
        // dependency-free. Translate + fade in from the top, slide
        // right + fade out.
        'transition-all duration-200 ease-out will-change-transform',
        leaving
          ? 'opacity-0 translate-y-[-6px] sm:translate-x-2 sm:translate-y-0'
          : 'opacity-100 translate-y-0 sm:translate-x-0 animate-[notify-in_200ms_ease-out]',
      ].join(' ')}
    >
      {/* Left accent bar — brand colour strip identifies the toast
          as part of Dermaspace's palette at a glance. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accent }}
      />

      <div className="flex items-start gap-3 pl-4 pr-3 py-3">
        <span
          aria-hidden="true"
          className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: accent }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            {item.title}
          </p>
          {item.description && (
            <p className="mt-0.5 text-xs text-gray-600 leading-snug text-pretty">
              {item.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="flex-shrink-0 -mr-1 -mt-1 w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Countdown progress — only for auto-dismissing variants. It's
          a purely decorative visual timer; screen readers already get
          the role=status/alert content above. */}
      {item.duration > 0 && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ backgroundColor: `${accent}22` }}
        >
          <span
            className="block h-full origin-left"
            style={{
              backgroundColor: accent,
              animation: `notify-progress ${item.duration}ms linear forwards`,
            }}
          />
        </span>
      )}

      {/* Keyframes are inlined in a <style> tag so we don't need a
          globals.css edit for a small self-contained component. */}
      <style jsx>{`
        @keyframes notify-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes notify-progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  )
}
