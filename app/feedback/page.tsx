'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Send,
  Check,
  ArrowRight,
} from 'lucide-react'

/**
 * Personalisation data for the feedback flow.
 *
 * `/api/auth/me`        – current user (used to pre-fill name + email
 *                         on step 3 so a logged-in user doesn't have
 *                         to retype).
 * `/api/feedback`       – the user's previous submissions (powers the
 *                         "you've shared X pieces of feedback so far"
 *                         hero accent).
 *
 * Both endpoints return `authenticated: false` shaped payloads when
 * the user is anonymous, so the same hook works for both cases.
 */
type AuthMe = {
  user?: {
    firstName?: string
    lastName?: string
    email?: string
  }
}
type FeedbackHistory = {
  authenticated: boolean
  total: number
  submissions: Array<{ id: number; rating: number; experience: string; createdAt: string }>
}
const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (r.status === 401) return null
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })

const feedbackCategories = [
  { id: 'service', label: 'Service Quality', description: 'Share your treatment experience' },
  { id: 'staff', label: 'Staff & Support', description: 'Feedback about our team' },
  { id: 'facility', label: 'Facility & Ambiance', description: 'Environment and cleanliness' },
  { id: 'booking', label: 'Booking Experience', description: 'Website and appointment process' },
  { id: 'suggestion', label: 'Suggestions', description: 'Ideas for improvement' },
  { id: 'complaint', label: 'Report an Issue', description: 'Let us know what went wrong' },
]

const experienceOptions = [
  { id: 'positive', label: 'Positive', icon: ThumbsUp, color: 'text-green-600 bg-green-50 border-green-200' },
  { id: 'neutral', label: 'Neutral', icon: Meh, color: 'text-gray-600 bg-gray-50 border-gray-200' },
  { id: 'negative', label: 'Negative', icon: ThumbsDown, color: 'text-red-500 bg-red-50 border-red-200' },
]

// Suspense wrapper — `useSearchParams` requires it during static
// pre-render in App Router. The fallback is a tiny shell so users on
// slow connections still see the page chrome immediately.
export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="bg-gray-50 min-h-[60vh] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
          </main>
          <Footer />
        </>
      }
    >
      <FeedbackPageInner />
    </Suspense>
  )
}

function FeedbackPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // `?source=shake` arrives when the user reached the page via the
  // shake-to-feedback gesture. Tagging it lets the admin slice
  // submissions by entry path later.
  const source = searchParams.get('source') === 'shake' ? 'shake' : 'web'

  const [step, setStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [experience, setExperience] = useState('')
  const [rating, setRating] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Pull the current user (if any) and their feedback history. SWR's
  // dedupe means we only hit the network once per route mount.
  const { data: authMe } = useSWR<AuthMe | null>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
  })
  const { data: history } = useSWR<FeedbackHistory | null>('/api/feedback', fetcher, {
    revalidateOnFocus: false,
  })

  const isLoggedIn = Boolean(authMe?.user)
  const firstName = authMe?.user?.firstName?.trim() || ''
  const fullName = [authMe?.user?.firstName, authMe?.user?.lastName].filter(Boolean).join(' ').trim()
  const accountEmail = authMe?.user?.email || ''
  const submissionCount = history?.authenticated ? history.total : 0

  // Pre-fill the optional name + email fields the moment we know who
  // the user is. We only set them once so a user is free to clear /
  // override them on step 3 (they're explicitly labelled "Optional").
  // The `name === ''` check prevents the auto-fill from clobbering
  // anything they typed in between fetches.
  useEffect(() => {
    if (!isLoggedIn) return
    setName((prev) => (prev ? prev : fullName))
    setEmail((prev) => (prev ? prev : accountEmail))
  }, [isLoggedIn, fullName, accountEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          experience,
          rating,
          message,
          name: name || undefined,
          email: email || undefined,
          source,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || 'Could not submit feedback')
      }
      setIsSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return selectedCategory !== ''
    if (step === 2) return experience !== '' && rating > 0
    if (step === 3) return message.trim().length > 10
    return true
  }

  // Where the back-arrow in the compact app header points. We send
  // logged-in users to their dashboard (the natural origin for this
  // flow — most reach feedback from the dashboard tile or the
  // shake-gesture which is dashboard-only) and anonymous visitors
  // back to the home page.
  const backHref = isLoggedIn ? '/dashboard' : '/'
  const backLabel = isLoggedIn ? 'Back to dashboard' : 'Back to home'

  // ─────────────────────────────────────────────────────────────────
  // Submitted state — uses the same gray-50 / white-card app shell
  // as the form below so the visual language doesn't whiplash between
  // a marketing-style success card and the rest of the experience.
  // ─────────────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <>
        <Header />
        <main className="bg-gray-50 pb-6">
          <div className="max-w-2xl mx-auto px-3 sm:px-6">
            <div className="flex items-center gap-2 py-2">
              <Link
                href={backHref}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={backLabel}
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-900 leading-tight">Feedback</h1>
                <p className="text-[11px] text-gray-500 leading-tight">Thanks for sharing</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 px-5 py-8 sm:px-8 sm:py-10 text-center">
              <div className="w-16 h-16 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[#7B2D8E]" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {firstName ? `Thank you, ${firstName}` : 'Thank You for Your Feedback'}
              </h2>
              <p className="text-sm text-gray-600 max-w-sm mx-auto mb-6">
                {isLoggedIn
                  ? "Your feedback has been logged on your account. Our team reviews every submission — we'll reach out if we need more details."
                  : 'Your feedback helps us improve our services. We appreciate you taking the time to share your experience with us.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  onClick={() => router.push(backHref)}
                  className="px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2278] transition-colors"
                >
                  {isLoggedIn ? 'Back to Dashboard' : 'Back to Home'}
                </button>
                <button
                  onClick={() => {
                    setIsSubmitted(false)
                    setStep(1)
                    setSelectedCategory('')
                    setExperience('')
                    setRating(0)
                    setMessage('')
                  }}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Submit Another
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // Form state — app shell mirrors `app/dashboard/support/page.tsx`:
  //   • gray-50 page background
  //   • compact back-arrow + title row at the top (no marketing hero)
  //   • single white rounded card holding the entire flow
  //   • progress strip lives inside the card so it doesn't introduce
  //     another full-bleed band
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      <main className="bg-gray-50 pb-6">
        <div className="max-w-2xl mx-auto px-3 sm:px-6">
          {/* Compact top bar — same pattern as the dashboard support
              page so the feedback flow feels like part of the app
              rather than a marketing landing page. The personalised
              greeting now lives in the subtitle line instead of a
              giant purple hero. */}
          <div className="flex items-center gap-2 py-2">
            <Link
              href={backHref}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={backLabel}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-gray-900 leading-tight truncate">
                {isLoggedIn && firstName ? `Hi ${firstName}, share your thoughts` : 'Share your feedback'}
              </h1>
              <p className="text-[11px] text-gray-500 leading-tight truncate">
                {isLoggedIn && submissionCount > 0
                  ? `${submissionCount} ${submissionCount === 1 ? 'submission' : 'submissions'} so far · helps us improve`
                  : 'Help us serve you better by sharing your experience'}
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11px] font-medium shrink-0">
              <MessageSquare className="w-3 h-3" aria-hidden="true" />
              {isLoggedIn ? 'Member' : 'Feedback'}
            </span>
          </div>

          {/* Main card */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Progress strip — moved inside the card and tightened
                up. Step labels sit on the same row as the dots on
                tablet+ to save vertical space; on phones we keep
                them stacked directly below to stay readable. */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between max-w-sm mx-auto">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        step >= s ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`w-12 sm:w-20 h-0.5 mx-2 rounded-full transition-colors ${
                          step > s ? 'bg-[#7B2D8E]' : 'bg-gray-100'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-gray-500 max-w-sm mx-auto">
                <span className={step === 1 ? 'text-[#7B2D8E] font-medium' : ''}>Category</span>
                <span className={step === 2 ? 'text-[#7B2D8E] font-medium' : ''}>Rating</span>
                <span className={step === 3 ? 'text-[#7B2D8E] font-medium' : ''}>Details</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5">
              {/* Step 1: Category */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="mb-1">
                    <h2 className="text-base font-semibold text-gray-900">What would you like to share?</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Select a category that best fits your feedback</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {feedbackCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedCategory === cat.id
                            ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <p
                          className={`text-sm font-semibold ${
                            selectedCategory === cat.id ? 'text-[#7B2D8E]' : 'text-gray-900'
                          }`}
                        >
                          {cat.label}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{cat.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Rating */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="mb-1">
                    <h2 className="text-base font-semibold text-gray-900">How was your experience?</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Rate your overall satisfaction</p>
                  </div>

                  {/* Experience type — sits on a single row on phones
                      using flex with auto-shrinking buttons so we
                      avoid the wide white gutters the old min-w-[100px]
                      design produced on small screens. */}
                  <div className="flex justify-center gap-2 sm:gap-3">
                    {experienceOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setExperience(opt.id)}
                        className={`flex-1 sm:flex-none flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all sm:min-w-[96px] ${
                          experience === opt.id
                            ? opt.color + ' border-current'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <opt.icon className={`w-5 h-5 ${experience === opt.id ? '' : 'text-gray-400'}`} />
                        <span className={`text-[11px] font-medium ${experience === opt.id ? '' : 'text-gray-600'}`}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Number rating */}
                  <div>
                    <p className="text-xs text-gray-700 text-center mb-2">Rate from 1 to 10</p>
                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                            rating === n
                              ? 'bg-[#7B2D8E] text-white scale-110'
                              : rating > 0 && n <= rating
                              ? 'bg-[#7B2D8E]/20 text-[#7B2D8E]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Details */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="mb-1">
                    <h2 className="text-base font-semibold text-gray-900">Tell us more</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isLoggedIn
                        ? "We've pre-filled your details from your account — feel free to edit them."
                        : 'Share the details of your feedback'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name (Optional)</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email (Optional)</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Your Feedback *</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please share the details of your experience..."
                      rows={5}
                      required
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">{message.length} characters (minimum 10)</p>
                  </div>
                </div>
              )}

              {/* Inline submit error — shown only when the API call
                  fails. We use a polite role so screen readers announce
                  the problem without yanking focus. */}
              {submitError && (
                <p
                  role="status"
                  className="mt-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5"
                >
                  {submitError}
                </p>
              )}

              {/* Navigation row — kept inside the card so the action
                  buttons sit directly under the form fields without
                  the wide outer padding the old layout used. */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canProceed() || isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-lg hover:bg-[#6B2278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Feedback
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
