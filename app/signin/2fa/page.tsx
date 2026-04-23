'use client'

import { useState, useEffect, useRef, Suspense, KeyboardEvent, ClipboardEvent } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, HelpCircle } from 'lucide-react'

/**
 * Two-Factor Authentication screen.
 *
 * Redesigned to feel closer to Yandex ID's "calm, centered, single-column"
 * sign-in flow while keeping the Dermaspace purple palette and logo
 * proportions. Layout is a single column (no decorative side panel) so the
 * page reads the same on mobile and desktop, with a large 6-slot OTP input
 * as the focal point and a full-width pill CTA in brand purple.
 */
function TwoFactorForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const partialToken = searchParams.get('token')
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  // Each slot is tracked individually so we can render an OTP-style group
  // (similar to banking / passport apps) while still submitting a single
  // 6-character code to the existing API.
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // If no token is present the user hit this URL directly — send them
    // back to sign in rather than showing a half-broken 2FA form.
    if (!partialToken) {
      router.push('/signin')
    }
  }, [partialToken, router])

  useEffect(() => {
    // Auto-focus the first slot once the form is ready.
    inputsRef.current[0]?.focus()
  }, [])

  const code = digits.join('')
  const isComplete = code.length === 6

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function handleChange(index: number, raw: string) {
    // Strip non-digits and take only the last typed character so holding a
    // key doesn't stuff the whole string into one slot.
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned) {
      setDigitAt(index, '')
      return
    }
    const char = cleaned[cleaned.length - 1]
    setDigitAt(index, char)
    // Advance focus when a digit is entered.
    if (index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Jump back a slot on backspace when the current slot is empty so
      // users can correct mistakes fluidly.
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    // Support pasting the entire 6-digit code from the authenticator app
    // or a password manager — a very common flow on 2FA screens.
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const nextFocus = Math.min(pasted.length, 5)
    inputsRef.current[nextFocus]?.focus()
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!isComplete) return
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partialToken, code }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code')
      }

      // Full-page navigation so the freshly-issued session cookie is
      // definitely picked up on the destination route.
      window.location.href = redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      // Clear the slots on error so the user can retype cleanly.
      setDigits(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Slim top bar: back arrow on the left, centered logo, help icon on
          the right — same rhythm as the Yandex ID reference screens. */}
      <header className="flex items-center justify-between px-5 py-4 md:px-8 md:py-5">
        <Link
          href="/signin"
          aria-label="Back to sign in"
          className="p-2 -ml-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <Link href="/" className="flex items-center" aria-label="Dermaspace home">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
            alt="Dermaspace"
            className="h-8 w-auto md:h-9"
          />
        </Link>

        <Link
          href="/contact"
          aria-label="Get help"
          className="p-2 -mr-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
        </Link>
      </header>

      {/* Centered content column. Capped at max-w-sm so slots stay large
          and tappable without stretching on wide screens. */}
      <main className="flex-1 flex items-start justify-center px-5 pt-6 md:pt-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-balance mb-3">
              Two-factor authentication
            </h1>
            <p className="text-[15px] text-gray-600 leading-relaxed text-pretty">
              Enter the 6-digit code from your authenticator app to finish signing in.
            </p>
          </div>

          <form onSubmit={handleVerify} noValidate>
            {/* 6-slot OTP input. Each slot is a separate <input> so mobile
                keyboards show the numeric pad and autofill/paste work well. */}
            <div
              className="flex items-center justify-between gap-2 sm:gap-3"
              role="group"
              aria-label="Verification code"
            >
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputsRef.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  onFocus={(e) => e.target.select()}
                  aria-label={`Digit ${i + 1}`}
                  className={`w-full aspect-square text-center text-2xl font-semibold text-gray-900 bg-white border rounded-xl outline-none transition-all
                    ${
                      error
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                        : digit
                          ? 'border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20'
                          : 'border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20'
                    }`}
                />
              ))}
            </div>

            {/* Inline error slot — reserves space so the layout doesn't
                jump when an error appears. */}
            <p
              className={`text-sm text-center mt-3 min-h-[20px] ${error ? 'text-red-600' : 'text-gray-500'}`}
              role={error ? 'alert' : undefined}
            >
              {error || 'You can also use a backup code from your account.'}
            </p>

            <button
              type="submit"
              disabled={isLoading || !isComplete}
              className="mt-6 w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] disabled:bg-[#7B2D8E]/40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify & sign in'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default function TwoFactorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TwoFactorForm />
    </Suspense>
  )
}
