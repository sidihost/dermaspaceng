"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  Heart,
} from "lucide-react"
import HCaptcha from "@/components/shared/hcaptcha"

// ---------------------------------------------------------------------------
// Consultation booking — full app-shell experience.
//
// Mirror of the survey page rewrite: this screen is now a fixed-position
// viewport with a slim app bar, a scrolling content area, and a sticky bottom
// action bar. The intent is that, on mobile, the booking flow no longer feels
// like "a page on a website" but like a mini native app — bigger tap targets,
// slide transitions between steps, and a CTA that always sits above the home
// indicator.
//
// All of the existing behaviour (auth-aware prefill, in-progress draft
// restore, preferred-clinic auto-jump, hCaptcha gate, /api/consultation POST)
// is preserved verbatim — only the chrome and step-by-step layout was
// reworked.
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string | null
}

// localStorage key for in-progress consultation drafts so users who bail
// mid-booking can pick up where they left off next visit.
const DRAFT_KEY = "dermaspace-consultation-draft"

const locations = [
  {
    id: "vi",
    name: "Victoria Island",
    address: "237b Muri Okunola St, Victoria Island, Lagos",
  },
  {
    id: "ikoyi",
    name: "Ikoyi",
    address: "44A, Awolowo Road, Ikoyi, Lagos",
  },
]

const timeSlots = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
]

const concernsList = [
  "Acne & Breakouts",
  "Anti-Aging",
  "Hyperpigmentation",
  "Dry Skin",
  "Oily Skin",
  "Sensitive Skin",
  "Body Treatment",
  "General Consultation",
]

const TOTAL_STEPS = 4
const STEP_TITLES = ["Choose location", "Pick a time", "Your details", "Review & confirm"]

export default function ConsultationPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  // Tracks whether we're advancing forward or going back so the slide-in
  // animation directions look correct (forward steps slide in from the right,
  // back steps slide in from the left). Without this the transition feels
  // wrong when the user taps the back arrow.
  const [slideDir, setSlideDir] = useState<"fwd" | "back">("fwd")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [captchaToken, setCaptchaToken] = useState("")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [locationPrefilled, setLocationPrefilled] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    date: null as Date | null,
    time: "",
    concerns: [] as string[],
    notes: "",
  })

  // Hydrate: auth + any saved draft. Draft takes precedence over raw auth
  // fields so the user never loses their in-progress edits. Draft persists
  // until submission succeeds.
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      let draft: Partial<typeof formData> | null = null
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as typeof formData & {
            date?: string | null
          }
          draft = {
            ...parsed,
            date: parsed.date ? new Date(parsed.date) : null,
          }
        }
      } catch {
        /* ignore corrupt draft */
      }

      try {
        const res = await fetch("/api/auth/me")
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.user) setUser(data.user as AuthUser)

          const prefSlug: string | undefined = data?.preferences?.preferredLocation
          const isValidPref =
            typeof prefSlug === "string" &&
            locations.some((l) => l.id === prefSlug)

          const resolvedLocation =
            draft?.location && draft.location !== ""
              ? draft.location
              : isValidPref
                ? (prefSlug as string)
                : ""

          if (data.user && !cancelled) {
            setFormData((prev) => ({
              ...prev,
              firstName: draft?.firstName || data.user.firstName || prev.firstName,
              lastName: draft?.lastName || data.user.lastName || prev.lastName,
              email: draft?.email || data.user.email || prev.email,
              phone: draft?.phone || data.user.phone || prev.phone,
              location: resolvedLocation || prev.location,
              date: draft?.date ?? prev.date,
              time: draft?.time ?? prev.time,
              concerns: draft?.concerns ?? prev.concerns,
              notes: draft?.notes ?? prev.notes,
            }))
          } else if (draft) {
            setFormData((prev) => ({ ...prev, ...draft }))
          }

          if (
            !cancelled &&
            isValidPref &&
            (!draft?.location || draft.location === "")
          ) {
            setLocationPrefilled(true)
            setStep(2)
          }
        } else if (draft && !cancelled) {
          setFormData((prev) => ({ ...prev, ...draft }))
        }
      } catch {
        if (draft && !cancelled) {
          setFormData((prev) => ({ ...prev, ...draft }))
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true)
          setDraftRestored(Boolean(draft))
        }
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist the draft on every change after hydration so a refresh or
  // navigation-away doesn't wipe what the user has entered.
  useEffect(() => {
    if (!authChecked) return
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          ...formData,
          date: formData.date?.toISOString() ?? null,
        }),
      )
    } catch {
      /* quota */
    }
  }, [formData, authChecked])

  // Calendar helpers
  const { firstDay, daysInMonth } = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const fd = new Date(year, month, 1).getDay()
    const dim = new Date(year, month + 1, 0).getDate()
    return { firstDay: fd, daysInMonth: dim }
  }, [currentMonth])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date < today || date.getDay() === 0 // Disable past dates and Sundays
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  const handleConcernToggle = (concern: string) => {
    setFormData((prev) => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter((c) => c !== concern)
        : [...prev.concerns, concern],
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          date: formData.date?.toISOString(),
          captchaToken,
        }),
      })
      if (res.ok) {
        try {
          localStorage.removeItem(DRAFT_KEY)
        } catch {
          /* ignore */
        }
        setIsSubmitted(true)
      }
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.location !== ""
      case 2:
        return formData.date !== null && formData.time !== ""
      case 3:
        return Boolean(
          formData.firstName &&
            formData.lastName &&
            formData.email &&
            formData.phone,
        )
      default:
        return true
    }
  }

  const goNext = () => {
    if (!canProceed()) return
    setSlideDir("fwd")
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  const goBack = () => {
    if (step > 1) {
      setSlideDir("back")
      setStep((s) => s - 1)
    } else {
      // First step — back arrow exits to the previous route.
      router.back()
    }
  }

  const progress = (step / TOTAL_STEPS) * 100

  // Animation classes for the per-step content. tw-animate-css ships these
  // helpers in the project's globals.css so we don't need extra deps.
  const stepAnimClass =
    slideDir === "fwd"
      ? "animate-in fade-in slide-in-from-right-3 duration-300"
      : "animate-in fade-in slide-in-from-left-3 duration-300"

  // --------------------------- Submitted state -----------------------------
  // Once submission succeeds we replace the whole flow with a confirmation
  // screen. We keep the same fixed-viewport shell (no back arrow, no progress)
  // and use a simple "Back to Home" CTA in the bottom bar.
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 flex flex-col bg-[#F7F5F9] text-gray-900">
        <header
          className="flex-shrink-0 bg-white border-b border-gray-100"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-center h-14 px-4">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              Booking confirmed
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-md mx-auto px-5 pt-8 pb-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-[#7B2D8E]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 text-balance">
              You&apos;re all set, {formData.firstName}!
            </h2>
            <p className="text-sm text-gray-600 mb-6 text-pretty leading-relaxed">
              Your consultation request has been received. We&apos;ll send a
              confirmation email shortly and our team will reach out within 24
              hours to lock in your appointment.
            </p>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 text-left shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                Appointment details
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {locations.find((l) => l.id === formData.location)?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {locations.find((l) => l.id === formData.location)?.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {formData.date && formatDate(formData.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{formData.time}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div
          className="flex-shrink-0 bg-white border-t border-gray-100 px-4 pt-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          <a
            href="/"
            className="flex items-center justify-center w-full h-12 rounded-2xl bg-[#7B2D8E] text-white text-sm font-semibold active:bg-[#5A1D6A] transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  // --------------------------- Booking flow --------------------------------
  return (
    <div className="fixed inset-0 flex flex-col bg-[#F7F5F9] text-gray-900">
      {/* App bar */}
      <header
        className="flex-shrink-0 bg-white border-b border-gray-100"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 h-14 px-2">
          <button
            onClick={goBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 active:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-sm font-semibold text-gray-900 truncate">
              Book consultation
            </h1>
            <p className="text-[11px] text-gray-500 truncate leading-tight">
              {STEP_TITLES[step - 1]}
            </p>
          </div>
          <span className="w-10 h-10" aria-hidden="true" />
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[#7B2D8E]">
              Step {step} of {TOTAL_STEPS}
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
      </header>

      {/* Scroll area */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-md mx-auto px-4 pt-5 pb-6">
          {/* Auth + draft hint chips — only show on the first visible step
              for the session so we don't repeat ourselves on every screen.
              These echo the survey page's "we restored your draft" pattern. */}
          {(draftRestored || locationPrefilled || user) && step === 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {user && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/8 border border-[#7B2D8E]/15 rounded-full">
                  <Heart className="w-3 h-3 fill-[#7B2D8E]" aria-hidden="true" />
                  Personalised for {user.firstName}
                </span>
              )}
              {draftRestored && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full">
                  Picked up where you left off
                </span>
              )}
            </div>
          )}
          {locationPrefilled && step === 2 && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full">
                <MapPin className="w-3 h-3" aria-hidden="true" />
                Using your preferred clinic
              </span>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div key="step-1" className={stepAnimClass}>
              <h2 className="text-2xl font-bold text-gray-900 mb-1.5 text-balance">
                Choose your clinic
              </h2>
              <p className="text-sm text-gray-500 mb-5 text-pretty">
                Pick the Dermaspace location that&apos;s closest to you.
              </p>

              <div className="space-y-3">
                {locations.map((location) => {
                  const selected = formData.location === location.id
                  return (
                    <button
                      key={location.id}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, location: location.id }))
                      }
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border bg-white text-left transition-all active:scale-[0.99] ${
                        selected
                          ? "border-[#7B2D8E] bg-[#7B2D8E]/[0.04] shadow-[0_1px_0_rgba(123,45,142,0.06)]"
                          : "border-gray-200"
                      }`}
                    >
                      <span
                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected
                            ? "bg-[#7B2D8E] text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <MapPin className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className={`block font-semibold text-sm ${selected ? "text-gray-900" : "text-gray-800"}`}
                        >
                          {location.name}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">
                          {location.address}
                        </span>
                      </span>
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selected
                            ? "border-[#7B2D8E] bg-[#7B2D8E]"
                            : "border-gray-300"
                        }`}
                      >
                        {selected && (
                          <span className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div key="step-2" className={stepAnimClass}>
              <h2 className="text-2xl font-bold text-gray-900 mb-1.5 text-balance">
                Pick a date & time
              </h2>
              <p className="text-sm text-gray-500 mb-5 text-pretty">
                We&apos;re open Monday through Saturday. Sundays are off.
              </p>

              {/* Calendar card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() - 1,
                        ),
                      )
                    }
                    aria-label="Previous month"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 active:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {currentMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() + 1,
                        ),
                      )
                    }
                    aria-label="Next month"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 active:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <div
                      key={`${day}-${i}`}
                      className="text-center text-[11px] font-medium text-gray-400 py-1.5"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const date = new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      day,
                    )
                    const isSelected =
                      formData.date?.toDateString() === date.toDateString()
                    const disabled = isDateDisabled(day)
                    return (
                      <button
                        key={day}
                        onClick={() =>
                          !disabled &&
                          setFormData((prev) => ({ ...prev, date }))
                        }
                        disabled={disabled}
                        className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-[#7B2D8E] text-white shadow-[0_4px_10px_-4px_rgba(123,45,142,0.45)]"
                            : disabled
                              ? "text-gray-300"
                              : "text-gray-700 active:bg-[#7B2D8E]/10"
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time slots */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                  Available times
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => {
                    const selected = formData.time === time
                    return (
                      <button
                        key={time}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, time }))
                        }
                        className={`h-11 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
                          selected
                            ? "bg-[#7B2D8E] text-white"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Personal Details */}
          {step === 3 && (
            <div key="step-3" className={stepAnimClass}>
              <h2 className="text-2xl font-bold text-gray-900 mb-1.5 text-balance">
                Your details
              </h2>
              <p className="text-sm text-gray-500 mb-5 text-pretty">
                {user
                  ? "We've prefilled these from your account. Edit anything you'd like for this booking."
                  : "Tell us a bit about you so we can confirm your slot."}
              </p>

              {user && (
                <div className="mb-4 flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-semibold shrink-0 overflow-hidden">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl || "/placeholder.svg"}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 rounded-full px-2.5 py-1">
                    Signed in
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    icon={<User className="w-4 h-4" />}
                    label="First name"
                    value={formData.firstName}
                    onChange={(v) =>
                      setFormData((prev) => ({ ...prev, firstName: v }))
                    }
                    placeholder="First name"
                  />
                  <Field
                    icon={<User className="w-4 h-4" />}
                    label="Last name"
                    value={formData.lastName}
                    onChange={(v) =>
                      setFormData((prev) => ({ ...prev, lastName: v }))
                    }
                    placeholder="Last name"
                  />
                </div>
                <Field
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, email: v }))
                  }
                  placeholder="you@email.com"
                />
                <Field
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, phone: v }))
                  }
                  placeholder="+234 000 000 0000"
                />

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Areas of concern{" "}
                    <span className="font-normal text-gray-400 normal-case tracking-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {concernsList.map((concern) => {
                      const selected = formData.concerns.includes(concern)
                      return (
                        <button
                          key={concern}
                          type="button"
                          onClick={() => handleConcernToggle(concern)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
                            selected
                              ? "bg-[#7B2D8E] text-white"
                              : "bg-white border border-gray-200 text-gray-600"
                          }`}
                        >
                          {concern}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Notes{" "}
                    <span className="font-normal text-gray-400 normal-case tracking-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none placeholder:text-gray-400"
                    placeholder="Anything you'd like the team to know…"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div key="step-4" className={stepAnimClass}>
              <h2 className="text-2xl font-bold text-gray-900 mb-1.5 text-balance">
                Confirm your booking
              </h2>
              <p className="text-sm text-gray-500 mb-5 text-pretty">
                Take a quick look — you can still go back and tweak anything.
              </p>

              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 mb-5">
                <SummaryRow
                  icon={<MapPin className="w-4 h-4" />}
                  label="Location"
                  primary={
                    locations.find((l) => l.id === formData.location)?.name ?? ""
                  }
                  secondary={
                    locations.find((l) => l.id === formData.location)?.address
                  }
                />
                <SummaryRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Date"
                  primary={formData.date ? formatDate(formData.date) : ""}
                />
                <SummaryRow
                  icon={<Clock className="w-4 h-4" />}
                  label="Time"
                  primary={formData.time}
                />
                <SummaryRow
                  icon={<User className="w-4 h-4" />}
                  label="Name"
                  primary={`${formData.firstName} ${formData.lastName}`}
                />
                <SummaryRow
                  icon={<Mail className="w-4 h-4" />}
                  label="Contact"
                  primary={formData.email}
                  secondary={formData.phone}
                />
                {formData.concerns.length > 0 && (
                  <div className="px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Areas of concern
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.concerns.map((concern) => (
                        <span
                          key={concern}
                          className="px-2.5 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full text-[11px] font-medium"
                        >
                          {concern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <HCaptcha onVerify={setCaptchaToken} />

              <p className="mt-5 text-[11px] text-gray-500 text-center text-pretty">
                By confirming you agree to receive appointment confirmations and
                reminders via email and SMS. This consultation is complimentary
                with no obligation.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Sticky bottom action bar — sits above iOS home indicator */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-4 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        {step < TOTAL_STEPS ? (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-[#7B2D8E] text-white text-sm font-semibold active:bg-[#5A1D6A] transition-colors disabled:opacity-40 disabled:active:bg-[#7B2D8E]"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-[#7B2D8E] text-white text-sm font-semibold active:bg-[#5A1D6A] transition-colors disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Confirming…
              </>
            ) : (
              <>
                Confirm booking
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Local helper components — kept inside this file so the main route stays
// self-contained. These are intentionally simple wrappers around plain
// inputs / divs; we don't need to add them to the design system.
// ---------------------------------------------------------------------------
function Field({
  icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 pl-10 pr-4 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] placeholder:text-gray-400"
        />
      </div>
    </div>
  )
}

function SummaryRow({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ReactNode
  label: string
  primary: string
  secondary?: string
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-900 truncate">{primary}</p>
        {secondary && (
          <p className="text-xs text-gray-500 truncate">{secondary}</p>
        )}
      </div>
    </div>
  )
}
