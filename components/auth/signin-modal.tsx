'use client'

// ---------------------------------------------------------------------------
// components/auth/signin-modal.tsx
//
// In-page sign-in dialog used by surfaces that *expect* the visitor to
// be authenticated but can't justify a full page redirect — the
// booking wizard is the canonical caller. Sending someone to /signin
// mid-checkout was eating wizard state (location, services, slot) and
// dropping them on a marketing-looking auth page; the modal keeps the
// booking step underneath, runs the same /api/auth/signin endpoint,
// and on success simply closes itself so the caller can re-submit.
//
// Design intent (matches the rest of the console):
//   - Brand purple #7B2D8E only — no gradients, no shadows beyond the
//     standard backdrop blur.
//   - The dialog reads as a tightly cropped sign-in card, not a hero
//     marketing block: 360–400px wide, no big illustration, just a
//     small petal logomark, the form, and a "create account" link.
//   - Identifier accepts email *or* username because that's what the
//     /api/auth/signin endpoint already supports server-side.
//   - The component is intentionally local-state only — it does NOT
//     touch SWR caches; the caller should `mutate('/api/auth/me')`
//     after `onSuccess` if it cares (booking-client does).
//   - Falls back to a "open the full sign-in page" link for users
//     who need 2FA, passkey, or Google sign-in (those flows are too
//     stateful to inline in a 360-wide modal).
// ---------------------------------------------------------------------------

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Eye, EyeOff, X, AlertCircle, Lock } from 'lucide-react'

interface SignInModalProps {
  /**
   * When `true` the modal is mounted and visible. Caller controls the
   * flag — typically wired to a `needsAuth` boolean that flips on a
   * 401 from the API.
   */
  open: boolean
  /** Fired when the user dismisses the modal (backdrop, ESC, X). */
  onClose: () => void
  /**
   * Fired after a successful authentication. The caller should
   * `mutate('/api/auth/me')` and then re-trigger whatever action
   * required auth (e.g. resubmit the booking).
   */
  onSuccess: () => void
  /**
   * Fallback path for users who need 2FA / passkey / Google sign-in.
   * Defaults to the surface that opened the modal so the post-auth
   * redirect lands them right back here.
   */
  fullSignInHref?: string
  /**
   * One-line headline at the top of the dialog. Defaults to a generic
   * "Sign in to continue", but the booking wizard overrides this with
   * something contextual like "Sign in to book your appointment".
   */
  title?: string
  /** Optional subline shown below the title. */
  subtitle?: string
}

export function SignInModal({
  open,
  onClose,
  onSuccess,
  fullSignInHref,
  title = 'Sign in to continue',
  subtitle = 'Use your Dermaspace email or username — same as the website.',
}: SignInModalProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleId = useId()
  const descId = useId()
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  // Reset the form whenever the modal is closed so reopening it
  // doesn't show stale errors / a half-typed password from the
  // previous attempt. We deliberately keep the form mounted while
  // open so React doesn't blow away in-flight focus.
  useEffect(() => {
    if (!open) {
      setIdentifier('')
      setPassword('')
      setShowPassword(false)
      setSubmitting(false)
      setError(null)
    }
  }, [open])

  // Focus the identifier on open — phones don't auto-pop the keyboard
  // unless we explicitly focus a field.
  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open])

  // Close on ESC. Keep the listener scoped to "while open" so we
  // don't intercept ESC presses on the page underneath when the
  // modal is hidden.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open so the page underneath doesn't move
  // when the keyboard opens on iOS.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)

    const trimmedId = identifier.trim()
    if (!trimmedId || !password) {
      setError('Enter your email/username and password to continue.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedId, password }),
      })
      const json = await res.json().catch(() => ({}) as Record<string, unknown>)

      // 2FA cannot be inlined here cleanly (we'd need the TOTP UI,
      // passkey challenge, the partial-token storage, etc). Fall
      // through to the full sign-in page, preserving where the
      // visitor came from so they're returned here after auth.
      if (res.ok && (json as { requires2FA?: boolean }).requires2FA) {
        const next = fullSignInHref || (typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : '/')
        window.location.href = `/signin?next=${encodeURIComponent(next)}`
        return
      }

      if (!res.ok) {
        setError(
          (json as { error?: string }).error ||
            'Could not sign you in. Please check your details and try again.',
        )
        return
      }

      // Success — let the caller refresh its `/api/auth/me` SWR
      // cache and re-run whatever action prompted the modal.
      onSuccess()
    } catch (err) {
      console.error('[v0] signin modal submit failed:', err)
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const fallbackHref = (() => {
    const next = fullSignInHref || (typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/')
    return `/signin?next=${encodeURIComponent(next)}`
  })()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
    >
      {/* Backdrop — soft brand-tinted veil so the page underneath
          stays visible (the booking wizard remains anchored). */}
      <button
        type="button"
        aria-label="Close sign in"
        onClick={onClose}
        className="absolute inset-0 bg-[#1A0822]/55 backdrop-blur-[2px]"
      />

      {/* Dialog card */}
      <div className="relative w-full sm:w-[400px] sm:max-w-[400px] rounded-t-2xl sm:rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
        {/* Close button — top-right, neutral so it doesn't compete
            with the primary CTA. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Lock-in-circle mark — replaces the previous "logo + huge
            heading" stack so this reads as a focused auth card, not a
            mini landing page. Brand purple tint, no shadow. */}
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
          <Lock className="h-4 w-4" aria-hidden />
        </div>

        <h2
          id={titleId}
          className="text-lg font-semibold tracking-tight text-gray-900"
        >
          {title}
        </h2>
        <p id={descId} className="mt-1 text-[13px] leading-relaxed text-gray-600">
          {subtitle}
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-[12px] font-medium text-gray-700">
              Email or username
            </span>
            <input
              ref={firstFieldRef}
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={submitting}
              placeholder="you@email.com"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/15 disabled:bg-gray-50"
            />
          </label>

          <label className="block">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium text-gray-700">Password</span>
              <Link
                href="/forgot-password"
                className="text-[11.5px] font-medium text-[#7B2D8E] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                placeholder="Your password"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/15 disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-2 flex items-center justify-center rounded-lg px-2 text-gray-400 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-[12px] leading-relaxed text-red-700"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !identifier.trim() || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5A1D6A] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in&hellip;
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Fallback row — covers the auth flows that need a full page
            (Google OAuth, passkey, 2FA setup), and a sign-up link
            for visitors who don't have an account yet. */}
        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 text-center">
          <p className="text-[12px] text-gray-600">
            New to Dermaspace?{' '}
            <Link
              href={`/signup?next=${encodeURIComponent(fullSignInHref || '/')}`}
              className="font-semibold text-[#7B2D8E] hover:underline"
            >
              Create an account
            </Link>
          </p>
          <a
            href={fallbackHref}
            className="text-[11.5px] text-gray-400 hover:text-[#7B2D8E] hover:underline"
          >
            Use Google, passkey, or two-factor sign-in
          </a>
        </div>
      </div>
    </div>
  )
}

export default SignInModal
