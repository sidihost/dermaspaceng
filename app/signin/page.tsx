'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, Check, Fingerprint, Loader2 } from 'lucide-react'
import HCaptcha, { type HCaptchaRef } from '@/components/shared/hcaptcha'
import { startAuthentication } from '@simplewebauthn/browser'
import PageLoader from '@/components/shared/page-loader'
import Header from '@/components/layout/header'

function SignInForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const captchaRef = useRef<HCaptchaRef>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [showNoPasskeyModal, setShowNoPasskeyModal] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // OAuth callbacks (Google / X) bounce the user back to /signin with
  // ?error=<code>. We map the codes we know about to friendly copy so
  // the user actually sees what went wrong instead of a silent return
  // to the empty form. Anything else falls through to a generic
  // "could not sign you in" message — better than nothing.
  //
  // For `token_exchange_failed` we also append the upstream X error
  // (e.g. `invalid_client`, `invalid_grant`) when the callback was
  // able to parse it — that's the difference between "something broke"
  // and "your X app's redirect URL doesn't match", and it makes
  // diagnosing config problems possible without server logs.
  useEffect(() => {
    const code = searchParams.get('error')
    if (!code) return
    const reason = searchParams.get('reason')
    const detail = searchParams.get('detail')
    const map: Record<string, string> = {
      x_auth_failed: "X declined the sign-in. Please try again.",
      x_not_configured: "X sign-in isn't configured yet — please use email or Google.",
      no_code: "X didn't return a sign-in code. Please try again.",
      state_mismatch: "Your sign-in session expired. Please try again.",
      token_exchange_failed:
        "Couldn't complete sign-in with X. Please try again, or use email / Google.",
      user_info_failed: "Couldn't read your X profile. Please try again.",
      account_suspended: 'This account has been suspended. Please contact support.',
      auth_failed: "Sign-in failed. Please try again.",
    }
    let msg = map[code] || 'Sign-in failed. Please try again.'
    if (code === 'token_exchange_failed' && (reason || detail)) {
      const xMsg = [reason, detail].filter(Boolean).join(': ')
      msg += ` (X said: ${xMsg})`
    }
    setError(msg)
  }, [searchParams])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setShowToast(true)
            setTimeout(() => {
              window.location.href = redirectTo
            }, 2000)
          } else {
            setIsCheckingAuth(false)
          }
        } else {
          setIsCheckingAuth(false)
        }
      } catch {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [redirectTo])

  if (isCheckingAuth) {
    return <PageLoader />
  }

  if (showToast) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-2xl shadow-lg border border-[#7B2D8E]/20 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Already Signed In</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </div>
          </div>
          <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!captchaToken) {
      setError('Please complete the captcha')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          captchaToken
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid email or password')
        // Reset captcha so user can try again
        setCaptchaToken('')
        captchaRef.current?.reset()
        return
      }

      // Check if 2FA is required - redirect to 2FA page
      if (data.requires2FA) {
        const params = new URLSearchParams({
          token: data.partialToken,
          redirect: redirectTo
        })
        window.location.href = `/signin/2fa?${params.toString()}`
        return
      }

      // Use window.location for a full page navigation to ensure cookies are recognized
      window.location.href = redirectTo
    } catch {
      setError('Something went wrong. Please try again.')
      // Reset captcha on error
      setCaptchaToken('')
      captchaRef.current?.reset()
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasskeySignIn = async () => {
    setPasskeyLoading(true)
    setError('')

    try {
      // Get authentication options - email is optional for passkey auth
      const optionsRes = await fetch('/api/auth/passkey/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email || undefined })
      })

      if (!optionsRes.ok) {
        const data = await optionsRes.json()
        // Show friendly modal instead of error if no passkeys found
        if (data.error?.includes('No passkeys') || optionsRes.status === 404) {
          setShowNoPasskeyModal(true)
          setPasskeyLoading(false)
          return
        }
        throw new Error(data.error || 'Authentication failed')
      }

      const options = await optionsRes.json()
      const { challengeId, ...authOptions } = options
      
      console.log('[v0] Passkey auth - rpID from server:', authOptions.rpId)
      console.log('[v0] Passkey auth - current origin:', window.location.origin)
      console.log('[v0] Passkey auth - challengeId:', challengeId)
      
      const credential = await startAuthentication({ optionsJSON: authOptions })
      
      console.log('[v0] Passkey auth - credential.id:', credential.id?.substring(0, 30) + '...')

      // Verify authentication
      const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email || undefined, credential, challengeId })
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Authentication failed')
      }

      // Check if 2FA is required - redirect to 2FA page
      if (verifyData.requires2FA) {
        const params = new URLSearchParams({
          token: verifyData.partialToken,
          redirect: redirectTo
        })
        window.location.href = `/signin/2fa?${params.toString()}`
        return
      }

      // Use window.location for a full page navigation to ensure cookies are recognized
      window.location.href = redirectTo
    } catch (err) {
      // Convert technical WebAuthn errors to user-friendly messages
      const errorMessage = err instanceof Error ? err.message : 'Passkey authentication failed'
      console.log('[v0] Passkey auth error:', errorMessage)
      
      if (errorMessage.includes('timed out') || errorMessage.includes('not allowed')) {
        setError('Passkey authentication was cancelled or timed out. Please try again.')
      } else if (errorMessage.includes('not supported')) {
        setError('Passkeys are not supported on this device or browser.')
      } else if (errorMessage.includes('SecurityError')) {
        setError('Security error occurred. Please make sure you are using a secure connection.')
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('No passkeys')) {
        setShowNoPasskeyModal(true)
      } else if (errorMessage.includes('Domain mismatch') || errorMessage.includes('rpID') || errorMessage.includes('origin')) {
        setError('This passkey was created on a different domain. Please sign in with your password.')
      } else {
        setError(errorMessage || 'Unable to sign in with passkey. Please try using your password instead.')
      }
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <>
    {/* Marketing header — desktop only on auth pages. Mobile keeps
        the clean full-bleed form layout (no chrome competing with
        the keyboard). On desktop we want users to see the same
        nav / brand context they'd see anywhere else on the site. */}
    <div className="hidden lg:block">
      <Header />
    </div>
    {/* Mobile: clean full-bleed flow (no card chrome, maximum space
        for thumbs). Desktop: a two-column layout — form on the left,
        brand panel on the right — sitting under the marketing header. */}
    <main className="min-h-screen lg:min-h-[calc(100vh-68px)] bg-white lg:grid lg:grid-cols-2">
      <section className="flex flex-col items-center sm:bg-gradient-to-b sm:from-[#F7F1F9] sm:via-white sm:to-white lg:bg-white lg:bg-none px-4 pt-8 pb-16 sm:pt-16 sm:pb-24 lg:px-12 lg:py-16 lg:justify-center">
      <div className="w-full max-w-sm">
        {/* Inline logo — only on mobile/tablet. Desktop already has
            the full marketing header above, so a second logo in the
            card is redundant. */}
        <Link
          href="/"
          className="flex justify-center mb-5 sm:mb-6 lg:hidden"
          aria-label="Dermaspace home"
        >
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-8 w-auto"
          />
        </Link>

        {/* Card shell. On mobile it's a naked div (no border, no
            padding) so the form feels native; on sm+ it becomes a
            subtle rounded card with a thin border and faint shadow.
            This gives the desktop page a "surface" without shouting. */}
        <div className="sm:bg-white sm:border sm:border-gray-200/80 sm:rounded-2xl sm:p-8 sm:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(123,45,142,0.15)]">
        <div className="text-center mb-6">
          <h1 className="text-[22px] sm:text-2xl font-bold text-gray-900 tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
            Good to see you again. Pick how you&apos;d like to continue.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E]">
            {error}
          </div>
        )}

        {/* Social + passkey options up top — they're the fastest path
            for returning users, so we lead with them. Email/password sits
            below under an "or with email" divider as the fallback. This
            matches the ordering most users (and modern auth UX) expect. */}
        <div className="space-y-3">
          <a
            href="/api/auth/google"
            className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </a>

          {/* Sign in with X — kicks off PKCE flow handled by
              /api/auth/x → /api/auth/x/callback. */}
          <a
            href="/api/auth/x"
            className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
            </svg>
            Sign in with X
          </a>

          <button
            type="button"
            onClick={handlePasskeySignIn}
            disabled={passkeyLoading}
            className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passkeyLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Fingerprint className="w-5 h-5 text-[#7B2D8E]" />
            )}
            {passkeyLoading ? 'Authenticating…' : 'Sign in with Passkey'}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">or with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email or Username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="you@email.com or username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#7B2D8E] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <HCaptcha ref={captchaRef} onVerify={setCaptchaToken} />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* No Passkey Modal */}
          {showNoPasskeyModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Fingerprint className="w-8 h-8 text-gray-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">No Passkey Found</h2>
                  <p className="text-sm text-gray-600 mt-2">
                    No passkey was found. If you have an account, sign in with your email/username and password first, then set up a passkey in your account settings.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowNoPasskeyModal(false)}
                    className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#5A1D6A] transition-colors"
                  >
                    Sign in with Password
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    After signing in, go to Settings to set up a passkey
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
        {/* "New here?" sits *outside* the card — it's a secondary
            navigation hint, not part of the sign-in action itself. */}
        <p className="mt-5 sm:mt-6 text-center text-sm text-gray-600">
          New here?{' '}
          <Link href="/signup" className="text-[#7B2D8E] font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
      </section>

      {/* Desktop-only brand panel — gives the auth page real estate
          weight on wide screens without competing with the form.
          Uses an editorial spa image with a brand-purple wash and a
          short tagline + trust pills. Kept hidden below lg: so the
          mobile/tablet experience is unchanged. */}
      <aside className="hidden lg:flex relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center auth-panel-fade"
          style={{ backgroundImage: "url('/images/hero-2.jpg')" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/85 via-[#5A1D6A]/80 to-[#3F1349]/95"
          aria-hidden="true"
        />
        {/* Floating brand orbs — soft animated decoration so the
            panel never feels static. */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl auth-panel-float" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-12 left-12 h-48 w-48 rounded-full bg-white/8 blur-3xl auth-panel-float-delayed" aria-hidden="true" />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-white" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Dermaspace
            </span>
          </div>

          <div className="max-w-md auth-panel-fade-up">
            <h2 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
              Skincare, sorted.
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-white/85">
              Personalised treatments, expert dermatologists, and a
              regimen that fits your life — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-2xl font-bold leading-none">12k+</p>
              <p className="mt-1.5 text-xs text-white/70">Treatments</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-2xl font-bold leading-none">4.9</p>
              <p className="mt-1.5 text-xs text-white/70">Avg rating</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-2xl font-bold leading-none">24/7</p>
              <p className="mt-1.5 text-xs text-white/70">Derma AI</p>
            </div>
          </div>
        </div>
      </aside>
    </main>
    </>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SignInForm />
    </Suspense>
  )
}
