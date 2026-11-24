'use client'

import { useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'

interface RegionalWaitlistFormProps {
  region: string
  source: 'blocked' | 'waitlist'
  title?: string
  description?: string
  cityPlaceholder?: string
  submitLabel?: string
  compact?: boolean
}

export function RegionalWaitlistForm({
  region,
  source,
  title,
  description,
  cityPlaceholder = 'City or country (optional)',
  submitLabel = 'Join Waitlist',
  compact = false,
}: RegionalWaitlistFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/regional-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: trimmedEmail,
          city: city.trim(),
          region,
          source,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        message?: string
        error?: string
      }
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not join the waitlist right now. Please try again.')
        return
      }
      setConfirmation(
        data.message ||
          'You are on the waitlist. We will notify you as soon as Dermaspace launches in your region.',
      )
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <div
        role="status"
        className="rounded-xl border border-[#7B2D8E]/25 bg-[#F8F5FA] p-5 text-left space-y-2.5"
      >
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-lg bg-[#7B2D8E] text-white flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Waitlist spot confirmed</p>
            <p className="text-xs text-gray-600 leading-relaxed mt-1">{confirmation}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setConfirmation(null)
            setEmail('')
            setName('')
            setCity('')
          }}
          className="text-xs font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] underline underline-offset-2"
        >
          Register another email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 text-left">
      {title && (
        <div>
          <h2 className={compact ? 'text-sm font-semibold text-gray-900' : 'text-lg font-semibold text-gray-900'}>
            {title}
          </h2>
          {description && (
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mt-1">
              {description}
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className={compact ? 'space-y-2.5' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        <div>
          <label
            htmlFor={`waitlist-name-${source}-${region}`}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Full name
          </label>
          <input
            id={`waitlist-name-${source}-${region}`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="w-full h-10 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label
            htmlFor={`waitlist-city-${source}-${region}`}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            City
          </label>
          <input
            id={`waitlist-city-${source}-${region}`}
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={cityPlaceholder}
            className="w-full h-10 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`waitlist-email-${source}-${region}`}
          className="block text-xs font-medium text-gray-700 mb-1"
        >
          Email address <span className="text-[#7B2D8E]">*</span>
        </label>
        <input
          id={`waitlist-email-${source}-${region}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full h-10 px-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#5A1D6A] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Joining waitlist…</span>
          </>
        ) : (
          <>
            <span>{submitLabel}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  )
}
