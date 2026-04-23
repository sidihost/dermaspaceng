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
import { Check, AlertCircle, Info, X, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Variant = 'success' | 'error' | 'info' | 'loading'

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
}

type NotifyApi = {
  success: (title: string, description?: string, opts?: NotifyOptions) => string
  error: (title: string, description?: string, opts?: NotifyOptions) => string
  info: (title: string, description?: string, opts?: NotifyOptions) => string
  loading: (title: string, description?: string) => string
  update: (
    id: string,
    patch: Partial<Pick<Notification, 'variant' | 'title' | 'description' | 'duration'>>,
  ) => void
  dismiss: (id: string) => void
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
    loading: noop,
    update: () => {},
    dismiss: () => {},
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEFAULT_DURATION: Record<Variant, number> = {
  success: 3200,
  info: 3200,
  error: 4600,
  loading: 0,
}

const MAX_VISIBLE = 4

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Notification[]>([])

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
      loading: (title, description) => push('loading', title, description),
      update,
      dismiss,
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
      case 'loading':
        return <Loader2 className="w-4 h-4 text-white animate-spin" />
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
