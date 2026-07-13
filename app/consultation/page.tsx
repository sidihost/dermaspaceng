'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  Calendar,
  CalendarPlus,
  Clock,
  Download,
  User,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  Heart,
  Stethoscope,
} from 'lucide-react'
import HCaptcha from '@/components/shared/hcaptcha'
import { resolvePreferredLocationId } from '@/lib/location-pref'

// ---------------------------------------------------------------------------
// /consultation — book a free dermatology consultation.
//
// This page renders inside the regular site chrome (global Header + Footer,
// hero band, max-w-2xl form column) — the same layout pattern as /feedback,
// /contact, /booking. An earlier revision wrapped the page in a fixed-position
// "native app" shell with sticky top + bottom bars, but that broke on Chrome
// Android (header / CTA disappearing on viewport resize) and was rolled back
// at the user's request.
//
// Behaviour preserved verbatim from the previous revision:
//   • auth-aware prefill (firstName/lastName/email/phone from /api/auth/me)
//   • preferred-clinic auto-jump to the date step
//   • localStorage draft restore mid-booking
//   • hCaptcha gate on the final review step
//   • POST /api/consultation on confirm
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string | null
}

const DRAFT_KEY = 'dermaspace-consultation-draft'

const locations = [
  {
    id: 'vi',
    name: 'Victoria Island',
    address: '237b Muri Okunola St, Victoria Island, Lagos',
    // Weekday numbers we do NOT accept bookings on (0 = Sun).
    // VI is open every day (Sun & Mon: 1pm–7pm, Tue–Thu: 10am–7pm,
    // Fri & Sat: 10am–10pm).
    closedDays: [] as number[],
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    address: '9 Agbeke Rotinwa Cl, Dolphin Extension Estate, Ikoyi, Lagos 106104',
    // Ikoyi is closed on Sundays (0) and Mondays (1).
    closedDays: [0, 1],
  },
]

// Opening hours vary by day:
//   Sun & Mon: 1pm – 7pm
//   Tue – Thu: 10am – 7pm
//   Fri & Sat: 10am – 10pm
// The last bookable slot is one hour before closing.
const timeSlots = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
  '09:00 PM',
]

function getTimeSlotsForDate(date: Date | null): string[] {
  if (!date) return timeSlots.slice(0, 9) // default Tue–Thu window: 10am – 6pm
  const day = date.getDay()
  if (day === 0 || day === 1) {
    // Sun & Mon: 1pm – 7pm → slots 1pm – 6pm
    return ['01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM']
  }
  if (day === 5 || day === 6) {
    // Fri & Sat: 10am – 10pm → slots 10am – 9pm
    return timeSlots
  }
  // Tue – Thu: 10am – 7pm → slots 10am – 6pm
  return timeSlots.slice(0, 9)
}

const concernsList = [
  'Acne & Breakouts',
  'Anti-Aging',
  'Hyperpigmentation',
  'Dry Skin',
  'Oily Skin',
  'Sensitive Skin',
  'Body Treatment',
  'General Consultation',
]

// Map the saved skin-profile preferences (skin type + concerns, set on
// the dashboard) onto the consultation's own "Areas of concern" chips so
// a returning customer never has to re-pick what we already know about
// their skin. The dashboard stores concerns like "Acne" / "Aging" and a
// skin type like "Dry" / "Oily"; both are translated into the chip
// labels this form renders. Anything we can't confidently map is simply
// skipped (no wrong guesses).
const PREFERENCE_CONCERN_MAP: Record<string, string> = {
  // Saved concerns
  acne: 'Acne & Breakouts',
  aging: 'Anti-Aging',
  'anti-aging': 'Anti-Aging',
  hyperpigmentation: 'Hyperpigmentation',
  dehydration: 'Dry Skin',
  // Saved skin types
  dry: 'Dry Skin',
  oily: 'Oily Skin',
  sensitive: 'Sensitive Skin',
}

function mapPreferencesToConcerns(
  skinType: string | undefined,
  concerns: string[] | undefined,
): string[] {
  const out = new Set<string>()
  for (const c of concerns ?? []) {
    const hit = PREFERENCE_CONCERN_MAP[c.trim().toLowerCase()]
    if (hit && concernsList.includes(hit)) out.add(hit)
  }
  if (skinType) {
    const hit = PREFERENCE_CONCERN_MAP[skinType.trim().toLowerCase()]
    if (hit && concernsList.includes(hit)) out.add(hit)
  }
  return Array.from(out)
}

const TOTAL_STEPS = 4
const STEP_LABELS = ['Location', 'Date & Time', 'Details', 'Confirm']

export default function ConsultationPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  // Set from the submit response so the confirmation screen can offer
  // a private tracking link (anonymous) or the dashboard (signed-in).
  const [trackToken, setTrackToken] = useState<string | null>(null)
  const [submittedAnonymous, setSubmittedAnonymous] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [captchaToken, setCaptchaToken] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [locationPrefilled, setLocationPrefilled] = useState(false)
  const [concernsPrefilled, setConcernsPrefilled] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    date: null as Date | null,
    time: '',
    concerns: [] as string[],
    notes: '',
  })

  // Hydrate: auth + saved draft + preferred-clinic auto-jump.
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
        const res = await fetch('/api/auth/me')
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.user) setUser(data.user as AuthUser)

          // The preference is stored as a display name ("Victoria
          // Island"); resolve it against our slug-keyed locations so the
          // clinic actually auto-selects for returning customers.
          const resolvedPrefId = resolvePreferredLocationId(
            data?.preferences?.preferredLocation,
            locations,
          )
          const isValidPref = Boolean(resolvedPrefId)

          const resolvedLocation =
            draft?.location && draft.location !== ''
              ? draft.location
              : resolvedPrefId ?? ''

          // Pre-fill the "Areas of concern" chips from the saved skin
          // profile so we don't ask the user to describe their skin all
          // over again. Only when the draft doesn't already carry its
          // own concern selection.
          const mappedConcerns = mapPreferencesToConcerns(
            data?.preferences?.skinType,
            data?.preferences?.concerns,
          )
          const draftHasConcerns =
            Array.isArray(draft?.concerns) && draft!.concerns!.length > 0
          const resolvedConcerns = draftHasConcerns
            ? draft!.concerns!
            : mappedConcerns

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
              concerns: resolvedConcerns,
              notes: draft?.notes ?? prev.notes,
            }))
            if (!draftHasConcerns && mappedConcerns.length > 0) {
              setConcernsPrefilled(true)
            }
          } else if (draft) {
            setFormData((prev) => ({ ...prev, ...draft }))
          }

          if (!cancelled && isValidPref) {
            setLocationPrefilled(true)
            // Advance past the location step whenever we have a valid
            // preferred clinic — whether the draft was empty or already
            // had the preferred location saved. Drafts pointing at a
            // later step are left alone by the Math.max guard below.
            setStep((s) => Math.max(s, 2))
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

  // Persist draft on every change after hydration.
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
    if (date < today) return true // Disable past dates
    // Disable days the selected clinic is closed (Ikoyi: Sun & Mon, VI: open daily).
    const selected = locations.find((l) => l.id === formData.location)
    const closedDays = selected?.closedDays ?? []
    return closedDays.includes(date.getDay())
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const handleConcernToggle = (concern: string) => {
    setFormData((prev) => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter((c) => c !== concern)
        : [...prev.concerns, concern],
    }))
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.location !== ''
      case 2:
        return formData.date !== null && formData.time !== ''
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
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }
  const goBack = () => {
    if (step > 1) setStep((s) => s - 1)
    else router.back()
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        try {
          const data = await res.json()
          setTrackToken(data.trackToken ?? null)
          // Fall back to the client-side auth check if the API doesn't
          // report it, so signed-in users always see the dashboard CTA.
          setSubmittedAnonymous(
            typeof data.isAnonymous === 'boolean' ? data.isAnonymous : !user,
          )
        } catch {
          setSubmittedAnonymous(!user)
        }
        setIsSubmitted(true)
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // SUBMITTED state
  // ---------------------------------------------------------------------------
  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
          <div className="text-center max-w-md w-full">
            <div className="w-14 h-14 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-[#7B2D8E]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              You&apos;re all set, {formData.firstName}!
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Your consultation request has been received, and your personalised
              AI skin analysis is ready. We&apos;ll send a confirmation email
              shortly and our team will reach out within 24 hours to lock in your
              appointment.
            </p>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 text-left mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                Appointment details
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {locations.find((l) => l.id === formData.location)?.name}
                    </p>
                    <p className="text-xs text-gray-500">
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

            <AddToCalendar
              title="Dermaspace Consultation"
              description={`Free dermatology consultation at Dermaspace ${
                locations.find((l) => l.id === formData.location)?.name ?? ''
              }.${formData.notes ? `\n\nNotes: ${formData.notes}` : ''}`}
              location={
                locations.find((l) => l.id === formData.location)?.address ?? ''
              }
              date={formData.date}
              time={formData.time}
            />

            {submittedAnonymous ? (
              <>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                  {trackToken && (
                    <Link
                      href={`/consultation/track/${trackToken}`}
                      className="px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors text-center"
                    >
                      View your skin analysis
                    </Link>
                  )}
                  <Link
                    href="/"
                    className="px-6 py-3 border-2 border-[#7B2D8E] text-[#7B2D8E] text-sm font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors text-center"
                  >
                    Back to Home
                  </Link>
                </div>

                {/* Gentle sign-up nudge — no dashboard for anonymous users. */}
                <div className="mt-6 bg-[#7B2D8E]/5 rounded-2xl p-4 border border-[#7B2D8E]/15 text-left">
                  <p className="text-sm font-semibold text-gray-900">
                    Get a more personalised experience
                  </p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed text-pretty">
                    Create a free account to save your skin profile and keep all
                    your consultations and recommendations in one place.
                  </p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] transition-colors"
                  >
                    Create an account
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {trackToken && (
                  <p className="text-[11px] text-gray-500 mt-4 text-pretty">
                    Tip: bookmark your analysis page — we&apos;ve also emailed you
                    the private link so you can check your status anytime.
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Link
                  href="/"
                  className="px-6 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors text-center"
                >
                  Back to Home
                </Link>
                <Link
                  href="/dashboard"
                  className="px-6 py-3 border-2 border-[#7B2D8E] text-[#7B2D8E] text-sm font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  // ---------------------------------------------------------------------------
  // BOOKING flow
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* App bar — same slim pattern used by /survey so the two
          flows feel like the same product. The "Step X of Y" pill
          on the right doubles as wayfinding for users who skip past
          the progress dots below. */}
      <section className="bg-[#7B2D8E]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-white/70 uppercase tracking-widest leading-none">
              Free Consultation
            </p>
            <h1 className="text-sm font-semibold text-white mt-0.5">
              Book your visit
            </h1>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-semibold text-white bg-white/10 border border-white/15 rounded-full whitespace-nowrap">
            Step {step} of 4
          </span>
        </div>
      </section>

      {/* Progress steps — tightened to match the survey page; smaller
          dots, less vertical padding, thinner rails. */}
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
            {STEP_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Form — tight top padding so the first step sits right
          under the progress dots, no dead space between sections. */}
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
        {/* Auth + draft hint chips — only on the first visible step */}
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

        {/* STEP 1 — Location */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Choose your clinic
              </h2>
              <p className="text-sm text-gray-500">
                Pick the Dermaspace location that&apos;s closest to you
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locations.map((location) => {
                const selected = formData.location === location.id
                return (
                  <button
                    key={location.id}
                    type="button"
                  onClick={() =>
                    setFormData((prev) => {
                      // If the previously chosen date falls on a day the
                      // newly selected clinic is closed, clear it so the
                      // user is forced to repick a valid day.
                      const closedDays =
                        locations.find((l) => l.id === location.id)?.closedDays ?? []
                      const dateStillValid =
                        prev.date && !closedDays.includes(prev.date.getDay())
                      return {
                        ...prev,
                        location: location.id,
                        date: dateStillValid ? prev.date : null,
                        time: dateStillValid ? prev.time : '',
                      }
                    })
                  }
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selected
                            ? 'bg-[#7B2D8E] text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            selected ? 'text-[#7B2D8E]' : 'text-gray-900'
                          }`}
                        >
                          {location.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {location.address}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2 — Date & Time */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Pick a date & time
              </h2>
              <p className="text-sm text-gray-500">
                We&apos;re open Monday through Saturday. Sundays are off.
              </p>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                      ),
                    )
                  }
                  aria-label="Previous month"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                      ),
                    )
                  }
                  aria-label="Next month"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
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
                      type="button"
                      onClick={() =>
                        !disabled &&
                        setFormData((prev) => ({
                          ...prev,
                          date,
                          // Clear the time if it's outside the new day's
                          // opening window (hours differ per weekday).
                          time: getTimeSlotsForDate(date).includes(prev.time)
                            ? prev.time
                            : '',
                        }))
                      }
                      disabled={disabled}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-[#7B2D8E] text-white'
                          : disabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-[#7B2D8E]/10'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time slots */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Available times
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {getTimeSlotsForDate(formData.date).map((time) => {
                  const selected = formData.time === time
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, time }))
                      }
                      className={`h-10 rounded-lg text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
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

        {/* STEP 3 — Personal Details */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Your details
              </h2>
              <p className="text-sm text-gray-500">
                {user
                  ? "We've prefilled these from your account. Edit anything you'd like for this booking."
                  : 'Tell us a bit about you so we can confirm your slot.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                icon={<User className="w-4 h-4" />}
                label="First Name"
                value={formData.firstName}
                onChange={(v) =>
                  setFormData((prev) => ({ ...prev, firstName: v }))
                }
                placeholder="Jane"
              />
              <Field
                icon={<User className="w-4 h-4" />}
                label="Last Name"
                value={formData.lastName}
                onChange={(v) =>
                  setFormData((prev) => ({ ...prev, lastName: v }))
                }
                placeholder="Doe"
              />
            </div>
            <Field
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              type="email"
              value={formData.email}
              onChange={(v) => setFormData((prev) => ({ ...prev, email: v }))}
              placeholder="you@email.com"
            />
            <Field
              icon={<Phone className="w-4 h-4" />}
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(v) => setFormData((prev) => ({ ...prev, phone: v }))}
              placeholder="+234 000 000 0000"
            />

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Areas of concern{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              {concernsPrefilled && (
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/8 px-3 py-1.5 text-[11px] font-medium text-[#7B2D8E]">
                  <Heart className="h-3 w-3 fill-[#7B2D8E]" aria-hidden="true" />
                  Filled in from your skin profile — tap to adjust
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {concernsList.map((concern) => {
                  const selected = formData.concerns.includes(concern)
                  return (
                    <button
                      key={concern}
                      type="button"
                      onClick={() => handleConcernToggle(concern)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selected
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {concern}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none placeholder:text-gray-400"
                placeholder="Anything you'd like the team to know…"
              />
            </div>
          </div>
        )}

        {/* STEP 4 — Confirmation */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Confirm your booking
              </h2>
              <p className="text-sm text-gray-500">
                Take a quick look — you can still go back and tweak anything
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              <SummaryRow
                icon={<MapPin className="w-4 h-4" />}
                label="Location"
                primary={
                  locations.find((l) => l.id === formData.location)?.name ?? ''
                }
                secondary={
                  locations.find((l) => l.id === formData.location)?.address
                }
              />
              <SummaryRow
                icon={<Calendar className="w-4 h-4" />}
                label="Date"
                primary={formData.date ? formatDate(formData.date) : ''}
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

            <p className="text-[11px] text-gray-500 text-center text-pretty">
              By confirming you agree to receive appointment confirmations and
              reminders via email and SMS. This consultation is complimentary
              with no obligation.
            </p>
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
              disabled={!canProceed()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming…
                </>
              ) : (
                <>
                  Confirm Booking
                  <Check className="w-4 h-4" />
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
// Local helper components
// ---------------------------------------------------------------------------
function Field({
  icon,
  label,
  type = 'text',
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
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
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
          className="w-full h-11 pl-10 pr-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] placeholder:text-gray-400"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddToCalendar — twin CTAs that drop the freshly-confirmed
// consultation straight into the user's calendar.
//
// We support two flows so every device "just works":
//   1. Google Calendar — opens calendar.google.com in a new tab with
//      the event pre-filled. Best for desktop + Android users who
//      live in Google Calendar.
//   2. .ics download    — generates a small RFC 5545 file the OS
//      hands off to Apple Calendar / Outlook / Fantastical / etc.
//      This is the path iOS Safari uses.
//
// All values are static strings produced from the booking form, so
// nothing user-controlled is ever interpolated as HTML — the .ics
// stays plain text and the Google Calendar URL is URL-encoded.
// ---------------------------------------------------------------------------
function AddToCalendar({
  title,
  description,
  location,
  date,
  time,
}: {
  title: string
  description: string
  location: string
  date: Date | null
  time: string
}) {
  // Bail-out: we can't build a calendar entry without both a date and
  // a time. The success state should always have these (the form
  // gates `Continue` on them), but defensive coding here means a
  // partial draft never produces a broken Google URL.
  if (!date || !time) return null

  // Parse "10:00 AM" / "01:00 PM" → 24h hours + minutes. We trust the
  // hard-coded `timeSlots` array as the only source of values.
  const parseSlot = (slot: string): { hours: number; minutes: number } => {
    const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return { hours: 10, minutes: 0 }
    let hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const meridiem = match[3].toUpperCase()
    if (meridiem === 'PM' && hours !== 12) hours += 12
    if (meridiem === 'AM' && hours === 12) hours = 0
    return { hours, minutes }
  }

  const { hours, minutes } = parseSlot(time)
  const start = new Date(date)
  start.setHours(hours, minutes, 0, 0)
  // Consultations run ~30 minutes — same default the email reminder
  // uses, so the calendar block lines up with the prep window we send
  // customers.
  const end = new Date(start.getTime() + 30 * 60 * 1000)

  // YYYYMMDDTHHMMSS — RFC 5545 floating local time (no Z suffix) so
  // Google + Apple show the time the user picked rather than shifting
  // it to whichever timezone they happen to be in when they import.
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
      `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    )
  }

  const startStr = fmt(start)
  const endStr = fmt(end)

  const googleUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${startStr}/${endStr}` +
    `&details=${encodeURIComponent(description)}` +
    `&location=${encodeURIComponent(location)}`

  const downloadIcs = () => {
    // RFC 5545 line endings are CRLF. Escape commas, semicolons and
    // newlines inside DESCRIPTION / LOCATION so importers don't
    // mis-parse the multi-line notes.
    const escape = (s: string) =>
      s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

    const uid = `${Date.now()}@dermaspaceng.com`
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Dermaspace//Consultation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${escape(title)}`,
      `DESCRIPTION:${escape(description)}`,
      `LOCATION:${escape(location)}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'TRIGGER:-PT1H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dermaspace-consultation.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="bg-[#7B2D8E]/5 border border-[#7B2D8E]/15 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3 justify-center">
        <CalendarPlus className="w-4 h-4 text-[#7B2D8E]" />
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7B2D8E]">
          Add to calendar
        </p>
      </div>
      <p className="text-[11px] text-gray-600 text-center mb-3 text-pretty">
        Don&apos;t miss your appointment — drop it into your calendar in one tap.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#7B2D8E]/20 text-[#7B2D8E] text-xs font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          Google Calendar
        </a>
        <button
          type="button"
          onClick={downloadIcs}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-[#7B2D8E]/20 text-[#7B2D8E] text-xs font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Apple / Outlook (.ics)
        </button>
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
        <p className="text-sm font-medium text-gray-900">{primary}</p>
        {secondary && (
          <p className="text-xs text-gray-500">{secondary}</p>
        )}
      </div>
    </div>
  )
}
