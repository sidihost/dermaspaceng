'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  // Password strength indicators
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  if (!token) {
    return (
      <div className="bg-white p-5 pt-12 lg:min-h-screen lg:flex lg:items-center lg:justify-center">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-[#7B2D8E]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Invalid Reset Link</h1>
          <p className="text-sm text-gray-600 mb-4">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="block w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!hasMinLength) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
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
      <div className="bg-white lg:min-h-screen lg:flex">
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#7B2D8E] items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A]" />
          <div className="relative text-center text-white p-8">
            <h2 className="text-3xl font-bold mb-4">Password Reset!</h2>
            <p className="text-white/80 max-w-md">
              Your password has been successfully reset.
            </p>
          </div>
        </div>

        <div className="p-5 pt-12 lg:flex-1 lg:flex lg:items-center lg:justify-center lg:p-8">
          <div className="w-full max-w-md text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Password Reset Successful</h1>
            <p className="text-sm text-gray-600 mb-4">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <button
              onClick={() => router.push('/signin')}
              className="w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white lg:min-h-screen lg:flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#7B2D8E] items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A]" />
        <div className="relative text-center text-white p-8">
          <h2 className="text-3xl font-bold mb-4">Create New Password</h2>
          <p className="text-white/80 max-w-md">
            Choose a strong password to keep your account secure.
          </p>
        </div>
      </div>

      <div className="p-5 pt-6 lg:flex-1 lg:flex lg:items-center lg:justify-center lg:p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="block mb-4">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
              alt="Dermaspace"
              className="h-10 w-auto"
            />
          </Link>

          <h1 className="text-xl font-bold text-gray-900 mb-1">Set New Password</h1>
          <p className="text-sm text-gray-600 mb-4">
            Create a strong password for your account.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  placeholder="Enter new password"
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

            {/* Password strength indicators */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {hasMinLength && <Check className="w-2.5 h-2.5 text-green-600" />}
                </div>
                <span className={hasMinLength ? 'text-green-600' : 'text-gray-500'}>8+ chars</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasUppercase && hasLowercase ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {hasUppercase && hasLowercase && <Check className="w-2.5 h-2.5 text-green-600" />}
                </div>
                <span className={hasUppercase && hasLowercase ? 'text-green-600' : 'text-gray-500'}>Aa</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasNumber ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {hasNumber && <Check className="w-2.5 h-2.5 text-green-600" />}
                </div>
                <span className={hasNumber ? 'text-green-600' : 'text-gray-500'}>123</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] ${
                    confirmPassword && !passwordsMatch ? 'border-[#7B2D8E]/50' : 'border-gray-200'
                  }`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-xs text-[#7B2D8E]">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !hasMinLength || !passwordsMatch}
              className="w-full py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
