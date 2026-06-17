'use client'

import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Legacy verification-link landing page.
//
// Email verification now happens INLINE in the signup wizard via a 6-digit
// code (see /app/signup + /api/auth/verify-email), and a successful code
// entry logs the user straight in. The old click-through links pointed here.
//
// We keep this route alive purely so any stale links already sitting in
// inboxes land somewhere sensible — a calm explainer that points people to
// sign in (most are already verified) or to start a fresh signup — instead
// of a broken token POST.
// ---------------------------------------------------------------------------
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="inline-block mb-8" aria-label="Dermaspace home">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-12 w-auto mx-auto"
          />
        </Link>

        <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-[#7B2D8E]" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Verify with a code</h1>
        <p className="text-gray-600 mb-8">
          We&apos;ve switched to faster, code-based verification. Enter the
          6-digit code we email you right on the signup screen and you&apos;ll be
          signed in automatically — no links to click.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signin"
            className="px-6 py-3 bg-[#7B2D8E] text-white rounded-xl text-sm font-semibold hover:bg-[#5A1D6A] transition-colors inline-flex items-center gap-2"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}
