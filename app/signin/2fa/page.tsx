'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Smartphone, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react'

function TwoFactorForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const partialToken = searchParams.get('token')
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  
  const [twoFACode, setTwoFACode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // If no token, redirect back to signin
    if (!partialToken) {
      router.push('/signin')
    }
  }, [partialToken, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partialToken, code: twoFACode })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code')
      }

      // Use window.location for a full page navigation to ensure cookies are recognized
      window.location.href = redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!partialToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:block w-1/2 relative bg-[#7B2D8E]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A]" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Secure Verification</h2>
            <p className="text-white/80 max-w-md">
              Two-factor authentication adds an extra layer of security to your account by requiring a code from your authenticator app.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link href="/signin" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#7B2D8E] mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          <div className="mb-6">
            <Link href="/" className="block mb-4">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
                alt="Dermaspace"
                className="h-10 w-auto"
              />
            </Link>
            
            <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-1">Two-Factor Authentication</h1>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app to complete sign in.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-lg text-sm text-[#7B2D8E]">
              {error}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] outline-none text-center text-xl tracking-widest font-mono"
                autoFocus
                autoComplete="one-time-code"
              />
              <p className="text-xs text-gray-500 text-center mt-2">
                You can also use a backup code if you don&apos;t have access to your authenticator app.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || twoFACode.length < 6}
              className="w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center">
              Having trouble?{' '}
              <Link href="/contact" className="text-[#7B2D8E] hover:underline">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TwoFactorForm />
    </Suspense>
  )
}
