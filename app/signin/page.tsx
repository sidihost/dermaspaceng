'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Check, Fingerprint, Loader2 } from 'lucide-react'
import HCaptcha, { type HCaptchaRef } from '@/components/shared/hcaptcha'
import { startAuthentication } from '@simplewebauthn/browser'

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
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
    // Single-column, centered, Yandex-inspired layout. Logo anchors
    // the top, the headline/subcopy sit directly under it, and every
    // sign-in method stacks vertically down the page. Works identically
    // on phones and desktops — no more split-screen marketing panel,
    // because a sign-in page's only job is to let the user get in.
    <main className="min-h-screen bg-white flex flex-col items-center px-4 pt-10 pb-16 sm:pt-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-8" aria-label="Dermaspace home">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-12 w-auto"
          />
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Good to see you again. Pick how you&apos;d like to continue.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E]">
            {error}
          </div>
        )}

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
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or continue with</span>
              </div>
            </div>

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
                /api/auth/x → /api/auth/x/callback. Mirrors the Google
                button so users can swap providers visually at a glance. */}
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
              {passkeyLoading ? 'Authenticating...' : 'Sign in with Passkey'}
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

        <p className="mt-6 text-center text-sm text-gray-600">
          New here?{' '}
          <Link href="/signup" className="text-[#7B2D8E] font-medium hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <Link
            href="/booking"
            className="flex items-center justify-center gap-2 w-full py-3 border border-[#7B2D8E] text-[#7B2D8E] text-sm font-medium rounded-xl hover:bg-[#7B2D8E]/5 transition-colors"
          >
            Book an appointment
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
