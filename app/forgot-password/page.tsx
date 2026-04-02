'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, Check } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setIsSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex">
        <div className="hidden lg:block w-1/2 relative bg-[#7B2D8E]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A]" />
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Check Your Email</h2>
              <p className="text-white/80 max-w-md">
                We&apos;ve sent you a link to reset your password.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-[#7B2D8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-8">
              If an account exists for <span className="font-medium">{email}</span>, you&apos;ll receive a password reset link shortly.
            </p>
            <div className="space-y-4">
              <Link
                href="/signin"
                className="block w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
              >
                Back to Sign In
              </Link>
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setEmail('')
                }}
                className="text-sm text-[#7B2D8E] hover:underline"
              >
                Try a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      <div className="hidden lg:block w-1/2 relative bg-[#7B2D8E]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A]" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Forgot Password?</h2>
            <p className="text-white/80 max-w-md">
              No worries! Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link href="/signin" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          <Link href="/" className="block mb-8">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
              alt="Dermaspace"
              className="h-12 w-auto"
            />
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600 mb-8">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="you@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link href="/signin" className="text-[#7B2D8E] font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
