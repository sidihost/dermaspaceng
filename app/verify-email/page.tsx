'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, ArrowRight, Loader2, Check } from 'lucide-react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import {
  getAutoSendStorageKey,
  getRemainingResendCooldownSeconds,
  getResendCooldownStorageKey,
  shouldAutoSendVerificationOtp,
  stripVerifySendParam,
} from '@/lib/verify-email-guard'
import { sanitizeSafeInternalPath } from '@/lib/auth-onboarding'

// ---------------------------------------------------------------------------
// Standalone email-verification page.
//
// This is where the onboarding reminder email, the signup OTP email, and the
// admin "resend verification" nudge all point. It mirrors the signup wizard's
// code-entry screen exactly so the experience is consistent: a top-aligned
// card with comfortable vertical padding that scrolls naturally on short
// viewports, a 6-digit OTP input that auto-submits, and a rate-limited
// "resend" affordance.
//
// Flow:
//   1. We read the target email from ?email= (prefilled by the emails). If
//      it's missing we ask the user to type it so they can still verify.
//   2. Entering the 6-digit code POSTs to /api/auth/verify-email, which flips
//      email_verified, creates a session, and logs them straight in — so on
//      success we just push to the dashboard.
//   3. "Resend code" calls /api/auth/resend-otp (generic success; tightly
//      rate-limited server-side).
// ---------------------------------------------------------------------------
function VerifyEmailInner() {
  const searchParams = useSearchParams()

  // Seed the email from the query string. If it's absent the user enters it.
  const emailParam = (searchParams.get('email') || '').trim()
  const redirectTo = sanitizeSafeInternalPath(
    searchParams.get('redirect'),
    '/dashboard',
  )
  // Only auto-issue a fresh code when the link explicitly asks for it
  // (?send=1, used by the onboarding reminder email). Once handled we
  // immediately strip `send` from the browser URL and record a session
  // cooldown timestamp so refreshing the page does not overwrite the
  // code the user is currently entering.
  const shouldAutoSend = searchParams.get('send') === '1'

  const [email, setEmail] = useState(emailParam)
  // When no email is supplied we show a small "enter your email" step first.
  const [emailConfirmed, setEmailConfirmed] = useState(Boolean(emailParam))

  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)

  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendNotice, setResendNotice] = useState('')

  // Restore any active manual resend cooldown for this email across refreshes.
  useEffect(() => {
    if (!email || typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(getResendCooldownStorageKey(email))
      if (!raw) return
      const remaining = getRemainingResendCooldownSeconds(Number(raw))
      if (remaining > 0) {
        setResendCooldown(remaining)
      }
    } catch {
      // ignore storage failures
    }
  }, [email])

  // Count down the resend cooldown once per second.
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // Auto-send a fresh code the first time someone lands here with ?send=1
  // and a known email. Immediately strips `send=1` from the address bar and
  // records a session timestamp so reloading the page never fires a new OTP.
  const autoSent = useRef(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('send=')) {
      const cleanedUrl = stripVerifySendParam(
        window.location.pathname,
        window.location.search,
      )
      window.history.replaceState(window.history.state, '', cleanedUrl)
    }

    let lastAutoSentAtMs: number | null = null
    if (email && typeof window !== 'undefined') {
      try {
        const stored = window.sessionStorage.getItem(getAutoSendStorageKey(email))
        if (stored) {
          const parsed = Number(stored)
          if (Number.isFinite(parsed)) lastAutoSentAtMs = parsed
        }
      } catch {
        // ignore storage failures
      }
    }

    if (
      shouldAutoSendVerificationOtp({
        shouldAutoSend,
        emailConfirmed,
        email,
        alreadyTriggered: autoSent.current,
        lastAutoSentAtMs,
      })
    ) {
      autoSent.current = true
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(
            getAutoSendStorageKey(email),
            String(Date.now()),
          )
        } catch {
          // ignore storage failures
        }
      }
      void sendCode(email, { silent: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailConfirmed, email, shouldAutoSend])

  const sendCode = async (
    targetEmail: string,
    opts?: { silent?: boolean },
  ) => {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    setOtpError('')
    if (!opts?.silent) setResendNotice('')
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOtpError(data.error || 'Could not send the code. Please try again.')
        return
      }
      setResendNotice('A code is on its way to your inbox.')
      setResendCooldown(30)
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(
            getResendCooldownStorageKey(targetEmail),
            String(Date.now() + 30_000),
          )
        } catch {
          // ignore storage failures
        }
      }
      setOtp('')
    } catch {
      setOtpError('Could not send the code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleVerify = async (codeOverride?: string) => {
    const code = (codeOverride ?? otp).trim()
    setOtpError('')

    if (!email) {
      setOtpError('Enter the email you signed up with.')
      return
    }
    if (code.length !== 6) {
      setOtpError('Enter the 6-digit code from your email.')
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setOtpError(data.error || 'That code is incorrect. Please try again.')
        setOtp('')
        return
      }

      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.removeItem(getAutoSendStorageKey(email))
          window.sessionStorage.removeItem(getResendCooldownStorageKey(email))
        } catch {
          // ignore storage failures
        }
        window.dispatchEvent(new Event('user-updated'))
      }

      // Verified + auto-logged-in by the API — show explicit confirmation
      // before continuing to the dashboard.
      setVerified(true)
    } catch {
      setOtpError('Something went wrong. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-white flex items-start justify-center overflow-y-auto px-4 py-12 sm:py-20">
        <div className="max-w-md w-full my-auto text-center">
          <Link href="/" className="inline-block mb-6" aria-label="Dermaspace home">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
              alt="Dermaspace"
              className="h-9 w-auto mx-auto"
            />
          </Link>
          <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-[#7B2D8E]" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Email verified</h1>
          <p className="text-gray-600 mb-8">
            <strong>{email}</strong> has been confirmed. Your account is ready.
          </p>
          <Link
            href={redirectTo}
            className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2"
          >
            Continue to dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center overflow-y-auto px-4 py-12 sm:py-20">
      <div className="max-w-md w-full my-auto">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6" aria-label="Dermaspace home">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
              alt="Dermaspace"
              className="h-9 w-auto mx-auto"
            />
          </Link>
          <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-[#7B2D8E]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Verify your email</h1>
          <p className="text-gray-600 mb-8">
            {emailConfirmed && email ? (
              <>
                Enter the 6-digit code we emailed to <strong>{email}</strong> to
                verify and finish signing in. No code yet? Tap resend below.
              </>
            ) : (
              <>
                Enter the email you signed up with and we&apos;ll send you a
                6-digit verification code.
              </>
            )}
          </p>
        </div>

        {/* Step A — collect the email when it wasn't passed in the link. */}
        {!emailConfirmed || !email ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const value = email.trim().toLowerCase()
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                setOtpError('Please enter a valid email address.')
                return
              }
              setOtpError('')
              setEmail(value)
              setEmailConfirmed(true)
              autoSent.current = true
              void sendCode(value, { silent: true })
            }}
            className="space-y-4"
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setOtpError('')
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                placeholder="you@email.com"
              />
            </div>

            {otpError && (
              <p className="text-sm text-red-600 text-center" role="alert">
                {otpError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2"
            >
              Send code
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Step B — code entry. Identical to the signup wizard's screen. */
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleVerify()
              }}
              className="flex flex-col items-center"
            >
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value)
                  setOtpError('')
                  if (value.length === 6) {
                    handleVerify(value)
                  }
                }}
                disabled={verifying}
                containerClassName="justify-center gap-2"
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-11 rounded-xl border-gray-200 text-lg font-semibold first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-[#7B2D8E] data-[active=true]:ring-[#7B2D8E]/20"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {otpError && (
                <p className="mt-4 text-sm text-red-600 text-center" role="alert">
                  {otpError}
                </p>
              )}

              {resendNotice && !otpError && (
                <p className="mt-4 text-sm text-[#7B2D8E] text-center">
                  {resendNotice}
                </p>
              )}

              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="mt-6 w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify and continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Didn&apos;t get a code?{' '}
              <button
                type="button"
                onClick={() => sendCode(email)}
                disabled={resendCooldown > 0 || resending}
                className="text-[#7B2D8E] font-medium hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
              >
                {resending
                  ? 'Sending…'
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend code'}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500">
              Wrong email?{' '}
              <button
                type="button"
                onClick={() => {
                  setEmailConfirmed(false)
                  setOtp('')
                  setOtpError('')
                  setResendNotice('')
                  autoSent.current = false
                }}
                className="underline hover:text-gray-700"
              >
                Change it
              </button>
            </p>
          </>
        )}

        <p className="mt-8 text-center text-sm text-gray-600">
          Already verified?{' '}
          <Link href="/signin" className="text-[#7B2D8E] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  )
}
