'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X, Loader2, Fingerprint, Shield, ArrowRight, AtSign, CheckCircle, XCircle } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'
import PageLoader from '@/components/shared/page-loader'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [showUsernameSetup, setShowUsernameSetup] = useState(true)
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [savingUsername, setSavingUsername] = useState(false)
  
  const [showPasskeySetup, setShowPasskeySetup] = useState(false)
  const [passkeyStep, setPasskeyStep] = useState<'prompt' | 'registering' | 'success' | 'error'>('prompt')
  const [passkeyError, setPasskeyError] = useState('')
  const [passkeyName, setPasskeyName] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        if (res.ok) {
          setStatus('success')
          // Show username setup first, then passkey
          setShowUsernameSetup(true)
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }

    verifyEmail()
  }, [token])

  // Check username availability with debounce
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null)
      setUsernameError('')
      return
    }

    const timeoutId = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const res = await fetch(`/api/user/username?username=${encodeURIComponent(username)}`)
        const data = await res.json()
        setUsernameAvailable(data.available)
        setUsernameError(data.error || '')
      } catch {
        setUsernameError('Failed to check username')
      } finally {
        setCheckingUsername(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username])

  const handleSaveUsername = async () => {
    if (!username || !usernameAvailable) return

    setSavingUsername(true)
    setUsernameError('')

    try {
      const res = await fetch('/api/auth/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set username')
      }

      // Move to passkey setup
      setShowUsernameSetup(false)
      setShowPasskeySetup(true)
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : 'Failed to set username')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleSkipUsername = () => {
    setShowUsernameSetup(false)
    setShowPasskeySetup(true)
  }

  const handleSetupPasskey = async () => {
    setPasskeyStep('registering')
    setPasskeyError('')

    try {
      const optionsRes = await fetch('/api/auth/passkey/register/options', {
        method: 'POST'
      })

      if (!optionsRes.ok) {
        throw new Error('Failed to get registration options')
      }

      const options = await optionsRes.json()
      const credential = await startRegistration({ optionsJSON: options })

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          name: passkeyName || 'My Passkey'
        })
      })

      if (!verifyRes.ok) {
        const data = await verifyRes.json()
        throw new Error(data.error || 'Failed to verify passkey')
      }

      setPasskeyStep('success')
      setTimeout(() => {
        router.push('/signin')
      }, 2000)
    } catch (err) {
      console.error('Passkey setup error:', err)
      setPasskeyStep('error')
      
      // Convert technical WebAuthn errors to user-friendly messages
      const errorMessage = err instanceof Error ? err.message : 'Failed to set up passkey'
      
      if (errorMessage.includes('timed out') || errorMessage.includes('not allowed')) {
        setPasskeyError('Passkey setup was cancelled or timed out. Please try again.')
      } else if (errorMessage.includes('not supported')) {
        setPasskeyError('Passkeys are not supported on this device or browser.')
      } else if (errorMessage.includes('SecurityError')) {
        setPasskeyError('Security error occurred. Please make sure you are using a secure connection.')
      } else {
        setPasskeyError('Unable to set up passkey. You can try again or skip for now.')
      }
    }
  }

  const handleSkipPasskey = () => {
    setShowPasskeySetup(false)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-block mb-8">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-12 w-auto"
          />
        </Link>

        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-[#7B2D8E] animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Verifying Your Email</h1>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            {showUsernameSetup ? (
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
                  <AtSign className="w-8 h-8 text-[#7B2D8E]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Choose Your Username</h1>
                <p className="text-gray-600 mb-6 text-sm">
                  Your email is verified! Set a unique username to make signing in easier.
                </p>

                {usernameError && (
                  <div className="mb-4 p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E] text-left">
                    {usernameError}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 text-left">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="yourname"
                      maxLength={30}
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    />
                    {username.length >= 3 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : usernameAvailable ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : usernameAvailable === false ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 text-left">
                    3-30 characters, letters, numbers, and underscores only
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleSaveUsername}
                    disabled={savingUsername || !usernameAvailable || username.length < 3}
                    className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingUsername ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSkipUsername}
                    className="w-full py-3 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  You can always change your username later in settings.
                </p>
              </div>
            ) : showPasskeySetup && passkeyStep !== 'success' ? (
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
                  <Fingerprint className="w-8 h-8 text-[#7B2D8E]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Set Up a Passkey</h1>
                <p className="text-gray-600 mb-6 text-sm">
                  Your email is verified! Would you like to set up a passkey for faster, more secure sign-ins?
                </p>

                {passkeyStep === 'error' && (
                  <div className="mb-4 p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E] text-left">
                    {passkeyError}
                  </div>
                )}

                <div className="space-y-3 mb-6 text-left">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Shield className="w-5 h-5 text-[#7B2D8E] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">More secure than passwords</p>
                      <p className="text-xs text-gray-500">Passkeys are resistant to phishing</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <Fingerprint className="w-5 h-5 text-[#7B2D8E] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Fast and convenient</p>
                      <p className="text-xs text-gray-500">Use Face ID, Touch ID, or Windows Hello</p>
                    </div>
                  </div>
                </div>

                {passkeyStep === 'prompt' && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5 text-left">
                      Passkey Name (optional)
                    </label>
                    <input
                      type="text"
                      value={passkeyName}
                      onChange={(e) => setPasskeyName(e.target.value)}
                      placeholder="e.g., MacBook Pro, iPhone"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleSetupPasskey}
                    disabled={passkeyStep === 'registering'}
                    className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {passkeyStep === 'registering' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Setting up passkey...
                      </>
                    ) : passkeyStep === 'error' ? (
                      'Try Again'
                    ) : (
                      <>
                        Set Up Passkey
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSkipPasskey}
                    className="w-full py-3 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  You can always set up a passkey later in your account settings.
                </p>
              </div>
            ) : passkeyStep === 'success' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-[#7B2D8E]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Passkey Added!</h1>
                <p className="text-gray-600">
                  Your passkey has been set up. Redirecting to sign in...
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-[#7B2D8E]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Email Verified!</h1>
                <p className="text-gray-600 mb-6">
                  Your email has been successfully verified. You can now sign in to your account.
                </p>
                <Link 
                  href="/signin"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl text-sm font-semibold hover:bg-[#5A1D6A] transition-colors"
                >
                  Sign In to Your Account
                </Link>
              </>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-[#7B2D8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification Failed</h1>
            <p className="text-gray-600 mb-6">
              The verification link is invalid or has expired. Please try signing up again or contact support.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link 
                href="/signup"
                className="px-6 py-3 bg-[#7B2D8E] text-white rounded-xl text-sm font-semibold hover:bg-[#5A1D6A] transition-colors"
              >
                Sign Up Again
              </Link>
              <Link 
                href="/"
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Go Home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
