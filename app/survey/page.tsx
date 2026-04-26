'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  CheckCircle,
  Send,
  Flower2,
  RefreshCw,
  ArrowRight,
  Star,
  MessageSquare,
  Check,
} from 'lucide-react'

// -----------------------------------------------------------------------------
// /survey — customer feedback survey.
//
// This page renders inside the regular site chrome (global Header + Footer,
// hero band, max-w-2xl form column) — the same pattern as /feedback,
// /contact, /booking. An earlier revision wrapped it in a fixed-position
// "native app" shell with a gradient hero card and sticky bottom CTA, but
// that drifted away from the rest of the site, broke on Chrome Android when
// the address bar collapsed, and was rolled back at the user's request.
//
// All of the original behaviour is preserved:
//   • auth-aware greeting (signed-in name, prefilled email)
//   • previous-submission view + Retake flow
//   • localStorage draft restore mid-survey
//   • deterministic service recommendations on the success screen
// -----------------------------------------------------------------------------

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

const SERVICE_CATALOG: Record<
  string,
  { name: string; slug: string; blurb: string }
> = {
  facial: {
    name: 'Signature Hydrating Facial',
    slug: '/services/facials',
    blurb: 'Deep cleanse + hydration boost to restore glow.',
  },
  massage: {
    name: 'Relaxation Massage',
    slug: '/services/massages',
    blurb: 'Unwind with a full-body therapeutic massage.',
  },
  premium: {
    name: 'Dermaspace VIP Package',
    slug: '/services/packages',
    blurb: 'Our premium end-to-end wellness experience.',
  },
  skincare: {
    name: 'Pro Skincare Consultation',
    slug: '/consultation',
    blurb: 'Personalised routine with a licensed dermatologist.',
  },
  express: {
    name: 'Express Glow-Up',
    slug: '/services/facials',
    blurb: 'A 30-minute pick-me-up, perfect between appointments.',
  },
}

const EMPTY_SURVEY: SurveyData = {
  aesthetics: '',
  ambiance: '',
  frontDesk: '',
  staffProfessional: '',
  appointmentDelay: '',
  overallRating: 0,
  visitAgain: '',
  comments: '',
}

const DRAFT_KEY = 'dermaspace-survey-draft'
const PREV_KEY = 'dermaspace-survey-last'

function recommendServices(s: SurveyData) {
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
  if (s.appointmentDelay === '30 mins' || s.appointmentDelay === '15 mins')
    picks.add('express')
  if (picks.size === 0) picks.add('facial')
  return Array.from(picks)
    .slice(0, 3)
    .map((k) => SERVICE_CATALOG[k])
}

const TOTAL_STEPS = 4

export default function SurveyPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [surveyData, setSurveyData] = useState<SurveyData>(EMPTY_SURVEY)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [previousSubmission, setPreviousSubmission] = useState<
    null | { data: SurveyData; submittedAt: string }
  >(null)
  const [mode, setMode] = useState<'loading' | 'intro' | 'filling'>('loading')
  const [draftRestored, setDraftRestored] = useState(false)

  // Hydrate user + draft + previous submission. The draft (in-progress survey)
  // takes precedence over a previous submission so users never lose work in
  // flight.
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      let draft: SurveyData | null = null
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (raw) draft = JSON.parse(raw) as SurveyData
      } catch {
        /* ignore */
      }

      let prev: { data: SurveyData; submittedAt: string } | null = null
      try {
        const raw = localStorage.getItem(PREV_KEY)
        if (raw) prev = JSON.parse(raw) as { data: SurveyData; submittedAt: string }
      } catch {
        /* ignore */
      }

      let authedUser: AuthUser | null = null
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) authedUser = data.user as AuthUser
        }
      } catch {
        /* ignore */
      }

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
    return () => {
      cancelled = true
    }
  }, [])

  // Persist drafts as the user fills the form. We only persist while in
  // "filling" mode so just viewing past results doesn't overwrite a real
  // previous response with an empty draft.
  useEffect(() => {
    if (!authChecked || mode !== 'filling') return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(surveyData))
    } catch {
      /* quota */
    }
  }, [surveyData, authChecked, mode])

  const recommended = useMemo(() => recommendServices(surveyData), [surveyData])

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }
  const goBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const payload = {
        data: surveyData,
        submittedAt: new Date().toISOString(),
      }
      try {
        localStorage.setItem(PREV_KEY, JSON.stringify(payload))
      } catch {
        /* quota */
      }
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {
        /* ignore */
      }
      await new Promise((resolve) => setTimeout(resolve, 800))
      setIsSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startFresh = () => {
    setSurveyData(EMPTY_SURVEY)
    setStep(1)
    setDraftRestored(false)
    setMode('filling')
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }

  // Per-step "can advance" gate. Every non-final step has at least one
  // required radio question; the final step's textarea is optional.
  const canAdvance = (() => {
    if (step === 1) return Boolean(surveyData.aesthetics && surveyData.ambiance)
    if (step === 2)
      return Boolean(surveyData.frontDesk && surveyData.staffProfessional)
    if (step === 3)
      return Boolean(
        surveyData.appointmentDelay &&
          surveyData.overallRating > 0 &&
          surveyData.visitAgain,
      )
    return true
  })()

  // ---------------------------------------------------------------------------
  // SUBMITTED (success) state
  // ---------------------------------------------------------------------------
  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md w-full">
            <div className="w-20 h-20 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#7B2D8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {user ? `Thanks, ${user.firstName}!` : 'Thank You!'}
            </h1>
            <p className="text-gray-600 mb-8">
              Your feedback helps us tailor every future visit to you.
            </p>

            {/* Recommended services — based on the user's answers.
                Header marker is a small solid brand-purple bar
                instead of a Sparkles glyph (the team has dropped
                Sparkles across the product), so the heading reads
                as an editorial section divider rather than an "AI"
                callout. */}
            <div className="text-left mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span
                  aria-hidden
                  className="block w-1 h-3.5 rounded-full bg-[#7B2D8E]"
                />
                <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                  Recommended for you
                </h2>
              </div>
              <div className="space-y-2">
                {recommended.map((svc) => (
                  <Link
                    key={svc.slug + svc.name}
                    href={svc.slug}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/[0.02] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                      <Flower2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {svc.name}
                      </p>
                      <p className="text-[11px] text-gray-500 leading-snug mt-0.5 text-pretty">
                        {svc.blurb}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
              >
                Back to Home
              </button>
              <Link
                href="/booking"
                className="px-6 py-3 border-2 border-[#7B2D8E] text-[#7B2D8E] text-sm font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors text-center"
              >
                Book a session
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  // ---------------------------------------------------------------------------
  // LOADING state — auth + draft hydration in flight
  // ---------------------------------------------------------------------------
  if (mode === 'loading') {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="min-h-[70vh] flex items-center justify-center">
          <div
            className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin"
            aria-label="Loading"
          />
        </div>
        <Footer />
      </main>
    )
  }

  // ---------------------------------------------------------------------------
  // INTRO state — first-time users see the start CTA, returning users see a
  // recap of their last submission with a Retake option.
  // ---------------------------------------------------------------------------
  if (mode === 'intro') {
    return (
      <main className="min-h-screen bg-white">
        <Header />

        {/* App bar — slim purple strip with icon + title on the left
            and a single short status hint on the right. Replaces the
            previous banner-style hero so the page reads as an app
            screen, not a marketing landing. The title and the hint
            below give the user the same context the long hero used
            to provide, without burning the mobile fold on chrome. */}
        <section className="bg-[#7B2D8E]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-white/70 uppercase tracking-widest leading-none">
                Customer Feedback
              </p>
              <h1 className="text-sm font-semibold text-white truncate mt-0.5">
                {user ? `Hey ${user.firstName}` : 'Share your experience'}
              </h1>
            </div>
            {previousSubmission && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-white bg-white/10 border border-white/15 rounded-full">
                Last response on file
              </span>
            )}
          </div>
        </section>

        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
          {previousSubmission ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 mb-6">
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1">
                Your last response
              </p>
              <p className="text-[11px] text-gray-500 mb-4">
                Submitted{' '}
                {new Date(previousSubmission.submittedAt).toLocaleDateString(
                  undefined,
                  { month: 'short', day: 'numeric', year: 'numeric' },
                )}
              </p>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <dt className="text-gray-500">Overall rating</dt>
                  <dd className="text-gray-900 font-semibold">
                    {previousSubmission.data.overallRating > 0
                      ? `${previousSubmission.data.overallRating} / 5`
                      : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <dt className="text-gray-500">Visit again</dt>
                  <dd className="text-gray-900 font-semibold">
                    {previousSubmission.data.visitAgain || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">SPA staff</dt>
                  <dd className="text-gray-900 font-semibold text-right">
                    {previousSubmission.data.staffProfessional || '—'}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3">
            {previousSubmission ? (
              <>
                <Link
                  href="/"
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-gray-200 text-gray-800 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors"
                >
                  Back to Home
                </Link>
                <button
                  onClick={startFresh}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake Survey
                </button>
              </>
            ) : (
              <button
                onClick={() => setMode('filling')}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
              >
                Start Survey
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <Footer />
      </main>
    )
  }

  // ---------------------------------------------------------------------------
  // FILLING — main multi-step form
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* App bar — same slim pattern as the intro screen, with a
          live "Step X of Y" pill on the right so the user can see
          where they are without reading the dot row below. */}
      <section className="bg-[#7B2D8E]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-white/70 uppercase tracking-widest leading-none">
              Customer Survey
            </p>
            <h1 className="text-sm font-semibold text-white mt-0.5">
              How was your visit?
            </h1>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-semibold text-white bg-white/10 border border-white/15 rounded-full whitespace-nowrap">
            Step {step} of 4
          </span>
        </div>
      </section>

      {/* Progress steps — tightened: smaller dots, less vertical
          padding, no rail shadow. Mobile users were complaining the
          previous `py-4` + `w-8 h-8` combo dominated the viewport
          before any actual question appeared. */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    step >= s
                      ? 'bg-[#7B2D8E] text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step > s ? <Check className="w-3 h-3" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-10 sm:w-20 h-0.5 mx-1.5 rounded-full transition-colors ${
                      step > s ? 'bg-[#7B2D8E]' : 'bg-gray-100'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] sm:text-xs text-gray-500">
            <span>Environment</span>
            <span>Staff</span>
            <span>Visit</span>
            <span>Comments</span>
          </div>
        </div>
      </div>

      {/* Form — tight top padding so the first question sits right
          under the progress dots, no dead space between sections. */}
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        {draftRestored && step === 1 && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 text-[12px] text-[#7B2D8E] font-medium">
            Picked up where you left off
          </div>
        )}

        {/* STEP 1 — Spa Environment */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Spa environment
              </h2>
              <p className="text-sm text-gray-500">
                How did the space feel?
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                The aesthetics of the SPA were appropriate and pleasing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'].map(
                  (option) => (
                    <RadioRow
                      key={option}
                      name="aesthetics"
                      value={option}
                      label={option}
                      selected={surveyData.aesthetics === option}
                      onSelect={(v) =>
                        setSurveyData({ ...surveyData, aesthetics: v })
                      }
                    />
                  ),
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                The treatment area was fresh, clean and pleasantly scented.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'].map(
                  (option) => (
                    <RadioRow
                      key={option}
                      name="ambiance"
                      value={option}
                      label={option}
                      selected={surveyData.ambiance === option}
                      onSelect={(v) =>
                        setSurveyData({ ...surveyData, ambiance: v })
                      }
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Spa Staff */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Spa staff
              </h2>
              <p className="text-sm text-gray-500">
                How did our team treat you?
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                The front desk was friendly and courteous.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'].map(
                  (option) => (
                    <RadioRow
                      key={option}
                      name="frontDesk"
                      value={option}
                      label={option}
                      selected={surveyData.frontDesk === option}
                      onSelect={(v) =>
                        setSurveyData({ ...surveyData, frontDesk: v })
                      }
                    />
                  ),
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                The SPA staff were prompt, professional and friendly.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'].map(
                  (option) => (
                    <RadioRow
                      key={option}
                      name="staffProfessional"
                      value={option}
                      label={option}
                      selected={surveyData.staffProfessional === option}
                      onSelect={(v) =>
                        setSurveyData({ ...surveyData, staffProfessional: v })
                      }
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Visit experience */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Your visit
              </h2>
              <p className="text-sm text-gray-500">
                Tell us about your experience
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Was your appointment delayed? How long?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['5 mins', '10 mins', '15 mins', '30 mins'].map((option) => (
                  <RadioRow
                    key={option}
                    name="appointmentDelay"
                    value={option}
                    label={option}
                    selected={surveyData.appointmentDelay === option}
                    onSelect={(v) =>
                      setSurveyData({ ...surveyData, appointmentDelay: v })
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Rate your overall experience
              </p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= surveyData.overallRating
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setSurveyData({ ...surveyData, overallRating: value })
                      }
                      aria-label={`Rate ${value} out of 5`}
                      aria-pressed={active}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        active
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <Star
                        className={`w-5 h-5 ${active ? 'fill-white' : ''}`}
                      />
                    </button>
                  )
                })}
              </div>
              {surveyData.overallRating > 0 && (
                <p className="text-center text-xs text-gray-500 mt-3">
                  {surveyData.overallRating === 5 && 'Excellent'}
                  {surveyData.overallRating === 4 && 'Very Good'}
                  {surveyData.overallRating === 3 && 'Good'}
                  {surveyData.overallRating === 2 && 'Fair'}
                  {surveyData.overallRating === 1 && 'Poor'}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Do you plan on visiting the SPA again?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {['Yes', 'No', 'Not sure'].map((option) => (
                  <RadioRow
                    key={option}
                    name="visitAgain"
                    value={option}
                    label={option}
                    selected={surveyData.visitAgain === option}
                    onSelect={(v) =>
                      setSurveyData({ ...surveyData, visitAgain: v })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Free-form comments */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Anything else?
              </h2>
              <p className="text-sm text-gray-500">
                Optional — leave it blank if you&apos;ve covered everything
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Your Comments
              </label>
              <textarea
                rows={6}
                value={surveyData.comments}
                onChange={(e) =>
                  setSurveyData({ ...surveyData, comments: e.target.value })
                }
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                placeholder="Tell us about your experience…"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting…
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
      </div>

      <Footer />
    </main>
  )
}

// ---------------------------------------------------------------------------
// RadioRow — full-width tappable option used by every multiple-choice step.
// Bigger hit target than a tiny radio button, matches the styling of every
// other choice control on the marketing site (rounded-xl, purple selection
// state) and remains keyboard-accessible because the underlying <input> is
// still a real radio.
// ---------------------------------------------------------------------------
function RadioRow({
  name,
  value,
  label,
  selected,
  onSelect,
}: {
  name: string
  value: string
  label: string
  selected: boolean
  onSelect: (v: string) => void
}) {
  return (
    <label
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm select-none ${
        selected
          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 text-[#7B2D8E] font-medium'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          selected ? 'border-[#7B2D8E] bg-[#7B2D8E]' : 'border-gray-300'
        }`}
      >
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="sr-only"
      />
      <span className="flex-1">{label}</span>
    </label>
  )
}
