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

      // For signed-in users we prefer the server's copy of their
      // last submission over localStorage so the recap survives a
      // browser-data clear, an incognito session, or signing in on a
      // new device. localStorage stays as the fallback for the
      // (rare) anonymous-then-back-as-signed-in case.
      if (authedUser) {
        try {
          const meRes = await fetch('/api/surveys/me', { cache: 'no-store' })
          if (meRes.ok) {
            const meJson = (await meRes.json()) as {
              submission: { data: SurveyData; submittedAt: string } | null
            }
            if (meJson?.submission) {
              prev = meJson.submission
            }
          }
        } catch {
          /* fall back to whatever localStorage had */
        }
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
      // Persist to Neon via /api/surveys so the admin dashboard
      // actually sees the response. Previously this handler only
      // wrote to localStorage and never hit the server, which was
      // the root cause of /admin/surveys showing 0 responses even
      // after real customer submissions. We treat a non-2xx as a
      // hard failure (don't pretend the submission succeeded) so
      // the customer gets a chance to retry on a flaky network.
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: surveyData }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail?.error || 'Submission failed')
      }

      const payload = {
        data: surveyData,
        submittedAt: new Date().toISOString(),
      }
      // Mirror to localStorage as a fast intro-screen recap — the
      // dashboard now reads the authoritative copy from
      // /api/surveys/me, but offline-first browsers can still show
      // the user's last response without an extra round trip.
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
      setIsSubmitted(true)
    } catch (err) {
      console.error('[v0] Survey submission failed:', err)
      alert(
        err instanceof Error
          ? err.message
          : 'We couldn\u2019t save your response. Please try again.',
      )
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
        <div className="flex items-center justify-center px-4 py-10 sm:py-12">
          <div className="text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#7B2D8E]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {user ? `Thanks, ${user.firstName}!` : 'Thank You!'}
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Your feedback helps us tailor every future visit to you.
            </p>

            {/* Recommended services — based on the user's answers */}
            <div className="text-left mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span
                  aria-hidden
                  className="block w-1 h-3 rounded-full bg-[#7B2D8E]"
                />
                <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                  Recommended for you
                </h2>
              </div>
              <div className="space-y-1.5">
                {recommended.map((svc) => (
                  <Link
                    key={svc.slug + svc.name}
                    href={svc.slug}
                    className="group flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/[0.02] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                      <Flower2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 leading-tight">
                        {svc.name}
                      </p>
                      <p className="text-[10px] text-gray-500 leading-snug mt-0.25 text-pretty">
                        {svc.blurb}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
              >
                Back to Home
              </button>
              <Link
                href="/booking"
                className="px-5 py-2.5 border-2 border-[#7B2D8E] text-[#7B2D8E] text-sm font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors text-center"
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

        {/* Intro body — tightened: narrower column on desktop
            (max-w-xl, was max-w-2xl) so the recap stays compact,
            top/bottom padding cut roughly in half, recap card
            converted from a 3-row dl with two divider rules into a
            single 3-up summary grid that holds the same data in ~40%
            less vertical space. CTA pair is unchanged in
            functionality — just smaller, in line with the rest of
            the dashboard scale. */}
        <div className="max-w-xl mx-auto px-4 py-3 md:py-4">
          {!previousSubmission && (
            <p className="text-sm text-gray-600 mb-3 text-pretty">
              Your feedback takes about a minute and helps us shape every
              future visit. {user ? `Thanks for taking the time, ${user.firstName}.` : ''}
            </p>
          )}

          {previousSubmission ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-3.5 mb-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-[11px] font-semibold text-gray-900 uppercase tracking-wide">
                  Your last response
                </p>
                <p className="text-[11px] text-gray-500">
                  {new Date(previousSubmission.submittedAt).toLocaleDateString(
                    undefined,
                    { month: 'short', day: 'numeric', year: 'numeric' },
                  )}
                </p>
              </div>
              {/* Three-column summary — denser than the previous
                  divider-stacked list, scales to two cols on phones
                  via the auto-fit grid so labels never wrap mid-word. */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gray-50 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Rating
                  </p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    {previousSubmission.data.overallRating > 0
                      ? `${previousSubmission.data.overallRating} / 5`
                      : '\u2014'}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Visit again
                  </p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    {previousSubmission.data.visitAgain || '\u2014'}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Staff
                  </p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                    {previousSubmission.data.staffProfessional || '\u2014'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* CTAs — shrunk from py-3 -> py-2.5 + size-down to match
              the smaller column. Same actions. */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {previousSubmission ? (
              <>
                <Link
                  href="/"
                  className="flex-1 inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 text-gray-800 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors"
                >
                  Back to Home
                </Link>
                <button
                  onClick={startFresh}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake Survey
                </button>
              </>
            ) : (
              <button
                onClick={() => setMode('filling')}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
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

      {/* Form — dashboard-tight density: column padding cut from
          py-4/6 to py-3/4 and the inter-question rhythm pulled from
          space-y-6 to space-y-4 so the customer can scan a step
          without scrolling on a typical phone. Section headers also
          tightened to mb-3 (was mb-6) to claw back fold space, and
          the question label margin tightened from mb-3 to mb-2. */}
      <div className="max-w-2xl mx-auto px-4 py-3 md:py-4">
        {draftRestored && step === 1 && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 text-[12px] text-[#7B2D8E] font-medium">
            Picked up where you left off
          </div>
        )}

        {/* STEP 1 — Spa Environment */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">
                Spa environment
              </h2>
              <p className="text-xs text-gray-500">
                How did the space feel?
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
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
              <p className="text-sm font-semibold text-gray-900 mb-2">
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
          <div className="space-y-4">
            <div className="text-center mb-3">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">
                Spa staff
              </h2>
              <p className="text-xs text-gray-500">
                How did our team treat you?
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
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
              <p className="text-sm font-semibold text-gray-900 mb-2">
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
          <div className="space-y-4">
            <div className="text-center mb-3">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">
                Your visit
              </h2>
              <p className="text-xs text-gray-500">
                Tell us about your experience
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
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
              <p className="text-sm font-semibold text-gray-900 mb-2">
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
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
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
                <p className="text-center text-xs text-gray-500 mt-2">
                  {surveyData.overallRating === 5 && 'Excellent'}
                  {surveyData.overallRating === 4 && 'Very Good'}
                  {surveyData.overallRating === 3 && 'Good'}
                  {surveyData.overallRating === 2 && 'Fair'}
                  {surveyData.overallRating === 1 && 'Poor'}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
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
          <div className="space-y-3">
            <div className="text-center mb-3">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">
                Anything else?
              </h2>
              <p className="text-xs text-gray-500">
                Optional — leave it blank if you&apos;ve covered everything
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Your Comments
              </label>
              <textarea
                rows={5}
                value={surveyData.comments}
                onChange={(e) =>
                  setSurveyData({ ...surveyData, comments: e.target.value })
                }
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                placeholder="Tell us about your experience…"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
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
