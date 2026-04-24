"use client"

import { useState, useEffect, useMemo } from "react"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { CheckCircle, Send, Sparkles, RefreshCw, ArrowRight, Star } from "lucide-react"
import Link from "next/link"

type SurveyData = {
  aesthetics: string
  ambiance: string
  frontDesk: string
  staffProfessional: string
  appointmentDelay: string
  overallRating: number
  visitAgain: string
  comments: string
}

interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string | null
}

// Recommendation rules. We derive a small set of services to suggest
// at the end of the survey based on the user's feedback. This is the
// "AI-recommended services" feature — keeping it deterministic here so
// we don't need an extra round-trip or model call for every submission.
// Each rule returns 0..n services; we de-dupe at the end.
const SERVICE_CATALOG: Record<string, { name: string; slug: string; blurb: string }> = {
  facial: { name: 'Signature Hydrating Facial', slug: '/services/facials', blurb: 'Deep cleanse + hydration boost to restore glow.' },
  massage: { name: 'Relaxation Massage', slug: '/services/massages', blurb: 'Unwind with a full-body therapeutic massage.' },
  premium: { name: 'Dermaspace VIP Package', slug: '/services/packages', blurb: 'Our premium end-to-end wellness experience.' },
  skincare: { name: 'Pro Skincare Consultation', slug: '/consultation', blurb: 'Personalised routine with a licensed dermatologist.' },
  express: { name: 'Express Glow-Up', slug: '/services/facials', blurb: 'A 30-minute pick-me-up, perfect between appointments.' },
}

const EMPTY_SURVEY: SurveyData = {
  aesthetics: "",
  ambiance: "",
  frontDesk: "",
  staffProfessional: "",
  appointmentDelay: "",
  overallRating: 0,
  visitAgain: "",
  comments: "",
}

const DRAFT_KEY = 'dermaspace-survey-draft'
const PREV_KEY = 'dermaspace-survey-last'

function recommendServices(s: SurveyData): { name: string; slug: string; blurb: string }[] {
  const picks = new Set<string>()
  if (s.overallRating >= 4) {
    picks.add('premium')
    picks.add('massage')
  }
  if (s.overallRating > 0 && s.overallRating <= 3) {
    picks.add('skincare')
    picks.add('express')
  }
  if (s.visitAgain === 'Yes') picks.add('facial')
  if (s.visitAgain === 'Not sure') picks.add('skincare')
  if (s.appointmentDelay === '30 mins' || s.appointmentDelay === '15 mins') picks.add('express')
  // Always give at least one suggestion.
  if (picks.size === 0) picks.add('facial')
  return Array.from(picks).slice(0, 3).map((k) => SERVICE_CATALOG[k])
}

export default function SurveyPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [surveyData, setSurveyData] = useState<SurveyData>(EMPTY_SURVEY)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  // A prior submission either from the server (for logged-in users)
  // or from localStorage (guests). When present we show the "you've
  // taken this before" summary + retake CTA instead of jumping
  // straight into step 1.
  const [previousSubmission, setPreviousSubmission] = useState<
    | null
    | { data: SurveyData; submittedAt: string }
  >(null)
  const [mode, setMode] = useState<'loading' | 'intro' | 'filling'>('loading')
  const [draftRestored, setDraftRestored] = useState(false)

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  // Hydrate user + draft + previous submission.
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      // Saved draft
      let draft: SurveyData | null = null
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (raw) draft = JSON.parse(raw) as SurveyData
      } catch { /* ignore */ }

      // Previous submission (local cache; best-effort server fetch too)
      let prev: { data: SurveyData; submittedAt: string } | null = null
      try {
        const raw = localStorage.getItem(PREV_KEY)
        if (raw) prev = JSON.parse(raw) as { data: SurveyData; submittedAt: string }
      } catch { /* ignore */ }

      // Auth fetch
      let authedUser: AuthUser | null = null
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) authedUser = data.user as AuthUser
        }
      } catch { /* ignore */ }

      if (cancelled) return
      setUser(authedUser)
      setAuthChecked(true)

      if (draft) {
        setSurveyData(draft)
        setDraftRestored(true)
        setMode('filling')
      } else if (prev) {
        setPreviousSubmission(prev)
        setMode('intro')
      } else {
        setMode('intro')
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  // Persist drafts between sessions — only once the user has actually
  // started filling out the survey so the "intro" screen stays stable
  // on repeat visits.
  useEffect(() => {
    if (!authChecked || mode !== 'filling') return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(surveyData))
    } catch { /* quota */ }
  }, [surveyData, authChecked, mode])

  const recommended = useMemo(() => recommendServices(surveyData), [surveyData])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Save locally so we can show "previous submission" on next visit.
      // In a production build this would also POST to /api/survey.
      const payload = { data: surveyData, submittedAt: new Date().toISOString() }
      try { localStorage.setItem(PREV_KEY, JSON.stringify(payload)) } catch { /* quota */ }
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
      await new Promise(resolve => setTimeout(resolve, 800))
      setIsSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startFresh = () => {
    setSurveyData(EMPTY_SURVEY)
    setCurrentStep(1)
    setDraftRestored(false)
    setMode('filling')
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
  }

  const RadioOption = ({
    name,
    value,
    label,
    selected
  }: {
    name: keyof SurveyData
    value: string
    label: string
    selected: boolean
  }) => (
    <label className={`
      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm
      ${selected
        ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
        : 'border-gray-200 hover:border-[#7B2D8E]/30'
      }
    `}>
      <div className={`
        w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
        ${selected ? 'border-[#7B2D8E] bg-[#7B2D8E]' : 'border-gray-300'}
      `}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={(e) => setSurveyData({ ...surveyData, [name]: e.target.value })}
        className="sr-only"
      />
      <span className="text-gray-700">{label}</span>
    </label>
  )

  const RatingButton = ({ value }: { value: number }) => (
    <button
      type="button"
      onClick={() => setSurveyData({ ...surveyData, overallRating: value })}
      aria-label={`Rate ${value} out of 5`}
      aria-pressed={value <= surveyData.overallRating}
      className={`
        w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm transition-all
        ${value <= surveyData.overallRating
          ? 'bg-[#7B2D8E] text-white'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }
      `}
    >
      {value}
    </button>
  )

  if (isSubmitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-[#7B2D8E]" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2 text-balance">
                {user ? `Thanks, ${user.firstName}!` : 'Thank You!'}
              </h1>
              <p className="text-sm text-gray-600 text-pretty">
                Your feedback helps us improve our services and provide you with an even better spa experience.
              </p>

              {/* Personalised recommendations */}
              <div className="mt-7 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#7B2D8E]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-gray-900">Recommended for you</h2>
                </div>
                <div className="space-y-2">
                  {recommended.map((svc) => (
                    <Link
                      key={svc.slug + svc.name}
                      href={svc.slug}
                      className="group flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 transition-all"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
                        <p className="text-xs text-gray-500 text-pretty">{svc.blurb}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] mt-1.5 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                >
                  Book a session
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // Intro / previous-submission screen for users who have already
  // completed the survey (or are logged in with no draft). Keeps the
  // experience feeling "remembered" instead of asking them the same
  // questions from scratch.
  if (mode === 'intro') {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white">
          <section className="relative py-12 bg-[#7B2D8E]">
            <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                {user ? 'Personalised for you' : 'Customer Feedback'}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-balance">
                {user ? `Hey ${user.firstName}, how was your visit?` : 'Share Your Experience'}
              </h1>
              <p className="text-sm text-white/80 text-pretty">
                {previousSubmission
                  ? 'We have your last response on file. Want to retake it?'
                  : 'Your answers shape our next appointment with you.'}
              </p>
            </div>
          </section>

          <section className="py-8 -mt-4 relative z-20">
            <div className="max-w-xl mx-auto px-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {previousSubmission ? (
                  <>
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 text-[#7B2D8E]" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Your last response</p>
                        <p className="text-xs text-gray-500">
                          Submitted {new Date(previousSubmission.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <dl className="space-y-3 text-sm mb-5">
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500">Overall rating</dt>
                        <dd className="text-gray-900 font-medium">
                          {previousSubmission.data.overallRating > 0
                            ? `${previousSubmission.data.overallRating} / 5`
                            : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500">Visit again</dt>
                        <dd className="text-gray-900 font-medium">{previousSubmission.data.visitAgain || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500">SPA staff</dt>
                        <dd className="text-gray-900 font-medium text-right">{previousSubmission.data.staffProfessional || '—'}</dd>
                      </div>
                    </dl>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={startFresh}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retake the survey
                      </button>
                      <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 transition-colors"
                      >
                        Back to Home
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-5 text-pretty">
                      This quick survey takes about 2 minutes and helps us tailor every future visit to you.
                    </p>
                    <button
                      onClick={() => setMode('filling')}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                    >
                      Start survey
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (mode === 'loading') {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin" aria-label="Loading" />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="relative py-12 bg-[#7B2D8E]">
          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {user ? 'Personalised for you' : 'Customer Feedback'}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-balance">
              {user ? `${user.firstName}, share your experience` : 'Share Your Experience'}
            </h1>
            <p className="text-sm text-white/80 text-pretty">
              {draftRestored
                ? 'We picked up right where you left off.'
                : 'Help us serve you better'}
            </p>
          </div>
        </section>

        {/* Survey Form */}
        <section className="py-8 -mt-4 relative z-20">
          <div className="max-w-xl mx-auto px-4">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#7B2D8E]">Step {currentStep} of {totalSteps}</span>
                <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7B2D8E] transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              {/* Step 1 */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    Spa Environment
                  </h2>

                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        The esthetics of the SPA was appropriate and pleasing.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map((option) => (
                          <RadioOption
                            key={option}
                            name="aesthetics"
                            value={option}
                            label={option}
                            selected={surveyData.aesthetics === option}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        The ambiance of the treatment area was fresh, clean and scented.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map((option) => (
                          <RadioOption
                            key={option}
                            name="ambiance"
                            value={option}
                            label={option}
                            selected={surveyData.ambiance === option}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    SPA Staff
                  </h2>

                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        The front desk was friendly and courteous.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map((option) => (
                          <RadioOption
                            key={option}
                            name="frontDesk"
                            value={option}
                            label={option}
                            selected={surveyData.frontDesk === option}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        The SPA staff was prompt, professional and friendly.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map((option) => (
                          <RadioOption
                            key={option}
                            name="staffProfessional"
                            value={option}
                            label={option}
                            selected={surveyData.staffProfessional === option}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    General Experience
                  </h2>

                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Was your appointment delayed? How long?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {["5 mins", "10 mins", "15 mins", "30 mins"].map((option) => (
                          <RadioOption
                            key={option}
                            name="appointmentDelay"
                            value={option}
                            label={option}
                            selected={surveyData.appointmentDelay === option}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Rate your overall experience (1-5)
                      </p>
                      <div className="flex items-center justify-center gap-3 py-3">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <RatingButton key={value} value={value} />
                        ))}
                      </div>
                      {surveyData.overallRating > 0 && (
                        <p className="text-center text-xs text-gray-500 mt-2">
                          {surveyData.overallRating === 5 && "Excellent!"}
                          {surveyData.overallRating === 4 && "Very Good"}
                          {surveyData.overallRating === 3 && "Good"}
                          {surveyData.overallRating === 2 && "Fair"}
                          {surveyData.overallRating === 1 && "Poor"}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Do you plan on visiting the SPA again?
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {["Yes", "No", "Not sure"].map((option) => (
                          <RadioOption
                            key={option}
                            name="visitAgain"
                            value={option}
                            label={option}
                            selected={surveyData.visitAgain === option}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">
                    Additional Comments
                  </h2>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Please share any additional feedback.
                    </p>
                    <textarea
                      rows={5}
                      value={surveyData.comments}
                      onChange={(e) => setSurveyData({ ...surveyData, comments: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none text-sm"
                      placeholder="Tell us about your experience..."
                    />
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                <button
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  className="px-5 py-2.5 text-sm text-gray-600 font-medium rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {currentStep < totalSteps ? (
                  <button
                    onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                    className="px-6 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
