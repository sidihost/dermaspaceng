"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle,
  Send,
  Flower2,
  RefreshCw,
  ArrowRight,
  Heart,
  ChevronLeft,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

// -----------------------------------------------------------------------------
// Survey data + recommendation rules
//
// The /survey route is presented as a native-feeling app screen rather than
// a regular site page (no global Header/Footer chrome, slim app bar, sticky
// bottom CTA, slide transitions between steps). All of the form data and the
// "recommend services" logic are preserved verbatim from the previous web
// version — only the chrome around them has changed.
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

// Deterministic recommendation engine — same rules as before. We compute
// these client-side so the success screen feels instant; in production this
// could be swapped for a server call without changing the surface area.
const SERVICE_CATALOG: Record<
  string,
  { name: string; slug: string; blurb: string }
> = {
  facial: {
    name: "Signature Hydrating Facial",
    slug: "/services/facials",
    blurb: "Deep cleanse + hydration boost to restore glow.",
  },
  massage: {
    name: "Relaxation Massage",
    slug: "/services/massages",
    blurb: "Unwind with a full-body therapeutic massage.",
  },
  premium: {
    name: "Dermaspace VIP Package",
    slug: "/services/packages",
    blurb: "Our premium end-to-end wellness experience.",
  },
  skincare: {
    name: "Pro Skincare Consultation",
    slug: "/consultation",
    blurb: "Personalised routine with a licensed dermatologist.",
  },
  express: {
    name: "Express Glow-Up",
    slug: "/services/facials",
    blurb: "A 30-minute pick-me-up, perfect between appointments.",
  },
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

const DRAFT_KEY = "dermaspace-survey-draft"
const PREV_KEY = "dermaspace-survey-last"

function recommendServices(s: SurveyData) {
  const picks = new Set<string>()
  if (s.overallRating >= 4) {
    picks.add("premium")
    picks.add("massage")
  }
  if (s.overallRating > 0 && s.overallRating <= 3) {
    picks.add("skincare")
    picks.add("express")
  }
  if (s.visitAgain === "Yes") picks.add("facial")
  if (s.visitAgain === "Not sure") picks.add("skincare")
  if (s.appointmentDelay === "30 mins" || s.appointmentDelay === "15 mins")
    picks.add("express")
  if (picks.size === 0) picks.add("facial")
  return Array.from(picks)
    .slice(0, 3)
    .map((k) => SERVICE_CATALOG[k])
}

// -----------------------------------------------------------------------------
// Step metadata — drives the app-bar title and the per-step layout. Keeping
// this declarative makes the slide animation + progress logic one-liners.
// -----------------------------------------------------------------------------
const STEPS = [
  { id: 1, title: "Spa Environment", subtitle: "How did the space feel?" },
  { id: 2, title: "Spa Staff", subtitle: "How did our team treat you?" },
  { id: 3, title: "Your Visit", subtitle: "Tell us about your experience" },
  { id: 4, title: "Anything else?", subtitle: "Optional — leave a note" },
] as const

const TOTAL_STEPS = STEPS.length

export default function SurveyPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [surveyData, setSurveyData] = useState<SurveyData>(EMPTY_SURVEY)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [previousSubmission, setPreviousSubmission] = useState<
    | null
    | { data: SurveyData; submittedAt: string }
  >(null)
  const [mode, setMode] = useState<"loading" | "intro" | "filling">("loading")
  const [draftRestored, setDraftRestored] = useState(false)
  // Track whether the user is moving forward or backward through the steps.
  // We use this to flip the slide direction so going Back doesn't feel
  // identical to going Forward — that small detail is what makes the screen
  // read as "an app" rather than "a paginated form".
  const [slideDir, setSlideDir] = useState<"fwd" | "back">("fwd")
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const progress = (currentStep / TOTAL_STEPS) * 100
  const stepMeta = STEPS[currentStep - 1]

  // Hydrate user + draft + previous submission. Same behaviour as before.
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
        if (raw)
          prev = JSON.parse(raw) as { data: SurveyData; submittedAt: string }
      } catch {
        /* ignore */
      }

      let authedUser: AuthUser | null = null
      try {
        const res = await fetch("/api/auth/me")
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
        setMode("filling")
      } else if (prev) {
        setPreviousSubmission(prev)
        setMode("intro")
      } else {
        setMode("intro")
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist the draft as the user fills it in. We only do this in "filling"
  // mode so opening the page just to view past results doesn't overwrite a
  // stale empty form on top of a real previous response.
  useEffect(() => {
    if (!authChecked || mode !== "filling") return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(surveyData))
    } catch {
      /* quota */
    }
  }, [surveyData, authChecked, mode])

  // Reset the scroll position on each step change so users don't land
  // halfway down the next screen — this is what every native app does.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [currentStep, mode, isSubmitted])

  const recommended = useMemo(() => recommendServices(surveyData), [surveyData])

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setSlideDir("fwd")
      setCurrentStep((s) => s + 1)
    }
  }

  const goBack = () => {
    if (currentStep > 1) {
      setSlideDir("back")
      setCurrentStep((s) => s - 1)
    } else {
      // First step — back arrow exits to the previous route, exactly like
      // tapping the back button in a native app screen.
      router.back()
    }
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
    setCurrentStep(1)
    setSlideDir("fwd")
    setDraftRestored(false)
    setMode("filling")
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }

  // Per-step "can advance" gate. Every non-final step has at least one
  // required radio question; the final step's textarea is optional.
  const canAdvance = (() => {
    if (currentStep === 1)
      return Boolean(surveyData.aesthetics && surveyData.ambiance)
    if (currentStep === 2)
      return Boolean(surveyData.frontDesk && surveyData.staffProfessional)
    if (currentStep === 3)
      return Boolean(
        surveyData.appointmentDelay &&
          surveyData.overallRating > 0 &&
          surveyData.visitAgain,
      )
    return true
  })()

  // ---------------------------------------------------------------------------
  // Native-feeling row radio. Renders as a full-width tappable row (like an
  // iOS settings cell) instead of a tiny pill, which is what gives the screen
  // the "this is an app" feel on phones.
  // ---------------------------------------------------------------------------
  const RowRadio = ({
    name,
    value,
    label,
    selected,
  }: {
    name: keyof SurveyData
    value: string
    label: string
    selected: boolean
  }) => (
    <label
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border bg-white cursor-pointer transition-all text-sm select-none active:scale-[0.99] ${
        selected
          ? "border-[#7B2D8E] bg-[#7B2D8E]/[0.04] shadow-[0_1px_0_rgba(123,45,142,0.06)]"
          : "border-gray-200 hover:border-[#7B2D8E]/40"
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          selected ? "border-[#7B2D8E] bg-[#7B2D8E]" : "border-gray-300"
        }`}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={(e) =>
          setSurveyData({ ...surveyData, [name]: e.target.value })
        }
        className="sr-only"
      />
      <span
        className={`flex-1 ${selected ? "text-gray-900 font-medium" : "text-gray-700"}`}
      >
        {label}
      </span>
    </label>
  )

  const RatingButton = ({ value }: { value: number }) => {
    const active = value <= surveyData.overallRating
    return (
      <button
        type="button"
        onClick={() => setSurveyData({ ...surveyData, overallRating: value })}
        aria-label={`Rate ${value} out of 5`}
        aria-pressed={active}
        className={`flex-1 aspect-square max-w-[56px] rounded-2xl flex items-center justify-center font-bold text-base transition-all active:scale-95 ${
          active
            ? "bg-[#7B2D8E] text-white shadow-[0_4px_12px_-4px_rgba(123,45,142,0.45)]"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {value}
      </button>
    )
  }

  // ---------------------------------------------------------------------------
  // App shell wrapper — every survey state (loading, intro, filling, success)
  // is rendered inside this so the chrome is consistent. Using `100dvh` on the
  // outer container plus safe-area-inset padding makes it sit flush against
  // the device chrome and keeps the bottom CTA above the home indicator.
  // ---------------------------------------------------------------------------
  const AppShell = ({
    title,
    subtitle,
    showBack = true,
    showProgress = false,
    children,
    bottom,
  }: {
    title: string
    subtitle?: string
    showBack?: boolean
    showProgress?: boolean
    children: React.ReactNode
    bottom?: React.ReactNode
  }) => (
    // We pin to the dynamic viewport (100dvh) instead of using `inset-0`.
    // `inset-0` sizes to the *large* viewport on mobile, which means the
    // sticky bottom bar with Continue/Submit ends up rendered behind the
    // browser's bottom address bar. Using `h-[100dvh]` ensures the bottom
    // bar always sits inside the visible area on phones.
    <div className="fixed top-0 left-0 right-0 h-[100dvh] flex flex-col bg-[#F7F5F9] text-gray-900">
      {/* App bar — slim, sticky-feel header. The status-bar inset keeps it
          flush on iOS PWA installs while staying compact in regular Chrome. */}
      <header
        className="flex-shrink-0 bg-white border-b border-gray-100"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 h-14 px-2">
          {showBack ? (
            <button
              onClick={goBack}
              aria-label="Go back"
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 active:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <span className="w-10 h-10" aria-hidden="true" />
          )}
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-gray-500 truncate leading-tight">
                {subtitle}
              </p>
            )}
          </div>
          <span className="w-10 h-10" aria-hidden="true" />
        </div>
        {showProgress && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[#7B2D8E]">
                Step {currentStep} of {TOTAL_STEPS}
              </span>
              <span className="text-[11px] text-gray-500">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7B2D8E] transition-[width] duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Scrollable content area — this is the only element that scrolls,
          which is the single biggest difference between a "web page" and
          a "screen in an app". */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      {/* Sticky bottom action bar. Lives above the iOS home indicator via
          safe-area-inset and gets a subtle shadow so the content reads as
          scrolling underneath it, not stacked behind it. */}
      {bottom && (
        <div
          className="flex-shrink-0 bg-white border-t border-gray-100 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="px-4 py-3">{bottom}</div>
        </div>
      )}
    </div>
  )

  // ---------------------------------------------------------------------------
  // SUCCESS / SUBMITTED SCREEN
  // ---------------------------------------------------------------------------
  if (isSubmitted) {
    return (
      <AppShell
        title="Survey complete"
        showBack={false}
        bottom={
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center px-4 py-3.5 bg-gray-100 text-gray-800 text-sm font-semibold rounded-2xl active:bg-gray-200 transition-colors"
            >
              Back to home
            </Link>
            <Link
              href="/book"
              className="flex-1 inline-flex items-center justify-center px-4 py-3.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-2xl active:bg-[#5A1D6A] transition-colors shadow-[0_4px_12px_-4px_rgba(123,45,142,0.45)]"
            >
              Book a session
            </Link>
          </div>
        }
      >
        <div className="px-5 py-8 max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-5 animate-in zoom-in-50 duration-500">
            <CheckCircle className="w-10 h-10 text-[#7B2D8E]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-balance">
            {user ? `Thanks, ${user.firstName}!` : "Thank You!"}
          </h2>
          <p className="text-sm text-gray-600 text-pretty leading-relaxed mb-8">
            Your feedback helps us tailor every future visit to you.
          </p>

          <div className="text-left">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                Recommended for you
              </h3>
            </div>
            <div className="space-y-2">
              {recommended.map((svc) => (
                <Link
                  key={svc.slug + svc.name}
                  href={svc.slug}
                  className="group flex items-center gap-3 p-3 rounded-2xl border border-gray-200 bg-white active:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
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
        </div>
      </AppShell>
    )
  }

  // ---------------------------------------------------------------------------
  // INTRO / PREVIOUS-SUBMISSION SCREEN
  // ---------------------------------------------------------------------------
  if (mode === "intro") {
    const greetingTitle = user
      ? `Hey ${user.firstName}`
      : "Share Your Experience"
    const greetingSub = previousSubmission
      ? "We have your last response on file"
      : "Quick 2-minute feedback"

    return (
      <AppShell
        title={greetingTitle}
        subtitle={greetingSub}
        bottom={
          previousSubmission ? (
            <div className="flex gap-2">
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center px-4 py-3.5 bg-gray-100 text-gray-800 text-sm font-semibold rounded-2xl active:bg-gray-200 transition-colors"
              >
                Back to home
              </Link>
              <button
                onClick={startFresh}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-2xl active:bg-[#5A1D6A] transition-colors shadow-[0_4px_12px_-4px_rgba(123,45,142,0.45)]"
              >
                <RefreshCw className="w-4 h-4" />
                Retake
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setSlideDir("fwd")
                setMode("filling")
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-2xl active:bg-[#5A1D6A] transition-colors shadow-[0_4px_12px_-4px_rgba(123,45,142,0.45)]"
            >
              Start survey
              <ArrowRight className="w-4 h-4" />
            </button>
          )
        }
      >
        <div className="px-5 py-6 max-w-md mx-auto">
          {/* Hero card — single big, friendly card instead of a long page */}
          <div className="rounded-3xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DAE] p-6 text-white shadow-[0_8px_24px_-8px_rgba(123,45,142,0.5)] mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[11px] font-medium mb-3">
              <Heart className="w-3 h-3 fill-white" aria-hidden="true" />
              {user ? "Personalised for you" : "Customer Feedback"}
            </div>
            <h2 className="text-xl font-bold mb-1.5 text-balance">
              {previousSubmission
                ? "Want to update your last response?"
                : "How was your visit?"}
            </h2>
            <p className="text-sm text-white/85 text-pretty leading-relaxed">
              {previousSubmission
                ? "We saved your previous answers. You can retake the survey anytime."
                : "Your answers shape every future appointment."}
            </p>
          </div>

          {previousSubmission && (
            <div className="rounded-2xl bg-white border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">
                Your last response
              </p>
              <p className="text-[11px] text-gray-500 mb-4">
                Submitted{" "}
                {new Date(previousSubmission.submittedAt).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <dt className="text-gray-500">Overall rating</dt>
                  <dd className="text-gray-900 font-semibold">
                    {previousSubmission.data.overallRating > 0
                      ? `${previousSubmission.data.overallRating} / 5`
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <dt className="text-gray-500">Visit again</dt>
                  <dd className="text-gray-900 font-semibold">
                    {previousSubmission.data.visitAgain || "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">SPA staff</dt>
                  <dd className="text-gray-900 font-semibold text-right">
                    {previousSubmission.data.staffProfessional || "—"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </AppShell>
    )
  }

  // ---------------------------------------------------------------------------
  // LOADING SCREEN — same chrome, just a centered spinner
  // ---------------------------------------------------------------------------
  if (mode === "loading") {
    return (
      <AppShell title="Loading" showBack={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div
            className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin"
            aria-label="Loading"
          />
        </div>
      </AppShell>
    )
  }

  // ---------------------------------------------------------------------------
  // FILLING — main multi-step form
  // ---------------------------------------------------------------------------
  return (
    <AppShell
      title={stepMeta.title}
      subtitle={stepMeta.subtitle}
      showProgress
      bottom={
        <div className="flex items-center gap-2">
          {currentStep > 1 ? (
            <button
              onClick={goBack}
              className="px-5 py-3.5 text-sm text-gray-700 font-semibold rounded-2xl bg-gray-100 active:bg-gray-200 transition-colors"
            >
              Back
            </button>
          ) : null}
          {currentStep < TOTAL_STEPS ? (
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-2xl active:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_-4px_rgba(123,45,142,0.45)]"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-2xl active:bg-[#5A1D6A] transition-colors disabled:opacity-70 shadow-[0_4px_12px_-4px_rgba(123,45,142,0.45)]"
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
      }
    >
      {/* The slide animation. Re-keying the wrapper on every step change
          remounts the children, and tailwindcss-animate's `animate-in` plus
          a directional `slide-in-from-*` makes Forward feel different from
          Back. If `tailwindcss-animate` isn't loaded the browser will simply
          ignore the unknown classes and we fall back to an instant swap. */}
      <div
        key={currentStep}
        className={`px-5 pt-5 pb-8 max-w-md mx-auto animate-in fade-in duration-300 ${
          slideDir === "fwd" ? "slide-in-from-right-3" : "slide-in-from-left-3"
        }`}
      >
        {draftRestored && currentStep === 1 && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-[#7B2D8E]/10 border border-[#7B2D8E]/20 text-[12px] text-[#7B2D8E] font-medium">
            Picked up where you left off
          </div>
        )}

        {/* STEP 1 — Spa Environment */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                The aesthetics of the SPA were appropriate and pleasing.
              </p>
              <div className="space-y-2">
                {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map(
                  (option) => (
                    <RowRadio
                      key={option}
                      name="aesthetics"
                      value={option}
                      label={option}
                      selected={surveyData.aesthetics === option}
                    />
                  ),
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                The treatment area was fresh, clean and pleasantly scented.
              </p>
              <div className="space-y-2">
                {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map(
                  (option) => (
                    <RowRadio
                      key={option}
                      name="ambiance"
                      value={option}
                      label={option}
                      selected={surveyData.ambiance === option}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Spa Staff */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                The front desk was friendly and courteous.
              </p>
              <div className="space-y-2">
                {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map(
                  (option) => (
                    <RowRadio
                      key={option}
                      name="frontDesk"
                      value={option}
                      label={option}
                      selected={surveyData.frontDesk === option}
                    />
                  ),
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                The SPA staff were prompt, professional and friendly.
              </p>
              <div className="space-y-2">
                {["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"].map(
                  (option) => (
                    <RowRadio
                      key={option}
                      name="staffProfessional"
                      value={option}
                      label={option}
                      selected={surveyData.staffProfessional === option}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Visit experience */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Was your appointment delayed? How long?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["5 mins", "10 mins", "15 mins", "30 mins"].map((option) => (
                  <RowRadio
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
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Rate your overall experience
              </p>
              <div className="flex items-center justify-between gap-2 py-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <RatingButton key={value} value={value} />
                ))}
              </div>
              {surveyData.overallRating > 0 && (
                <p className="text-center text-xs text-gray-500 mt-3">
                  {surveyData.overallRating === 5 && "Excellent"}
                  {surveyData.overallRating === 4 && "Very Good"}
                  {surveyData.overallRating === 3 && "Good"}
                  {surveyData.overallRating === 2 && "Fair"}
                  {surveyData.overallRating === 1 && "Poor"}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Do you plan on visiting the SPA again?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {["Yes", "No", "Not sure"].map((option) => (
                  <RowRadio
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
        )}

        {/* STEP 4 — Free-form comments */}
        {currentStep === 4 && (
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Anything else you&apos;d like us to know?
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Optional — leave it blank if you&apos;ve covered everything.
            </p>
            <textarea
              rows={6}
              value={surveyData.comments}
              onChange={(e) =>
                setSurveyData({ ...surveyData, comments: e.target.value })
              }
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none text-sm"
              placeholder="Tell us about your experience…"
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}
