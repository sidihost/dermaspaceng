'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Check, X, Loader2 } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

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
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }

    verifyEmail()
  }, [token])

  return (
    <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
            alt="Dermaspace"
            width={48}
            height={48}
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
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
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

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-red-600" />
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
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7B2D8E] animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
