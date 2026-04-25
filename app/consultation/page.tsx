'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
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
  ArrowRight,
  Heart,
  Stethoscope,
} from 'lucide-react'
import HCaptcha from '@/components/shared/hcaptcha'

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
  },
  {
    id: 'ikoyi',
    name: 'Ikoyi',
    address: '44A, Awolowo Road, Ikoyi, Lagos',
  },
]

const timeSlots = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
]

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

const TOTAL_STEPS = 4
const STEP_LABELS = ['Location', 'Date & Time', 'Details', 'Confirm']

export default function ConsultationPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [captchaToken, setCaptchaToken] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [locationPrefilled, setLocationPrefilled] = useState(false)

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

          const prefSlug: string | undefined = data?.preferences?.preferredLocation
          const isValidPref =
            typeof prefSlug === 'string' &&
            locations.some((l) => l.id === prefSlug)

          const resolvedLocation =
            draft?.location && draft.location !== ''
              ? draft.location
              : isValidPref
                ? (prefSlug as string)
                : ''

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
            (!draft?.location || draft.location === '')
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
    return date < today || date.getDay() === 0 // Disable past dates and Sundays
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
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md w-full">
            <div className="w-20 h-20 bg-[#7B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-[#7B2D8E]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              You&apos;re all set, {formData.firstName}!
            </h1>
            <p className="text-gray-600 mb-8">
              Your consultation request has been received. We&apos;ll send a
              confirmation email shortly and our team will reach out within 24
              hours to lock in your appointment.
            </p>

            <div className="bg-white rounded-2xl p-5 border border-gray-200 text-left mb-8">
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

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
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

      {/* Hero */}
      <section className="bg-[#7B2D8E] py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <Stethoscope className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white uppercase tracking-widest">
              Free Consultation
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Book a <span className="text-white/80">Consultation</span>
          </h1>
          <p className="text-sm text-white/70 max-w-md mx-auto">
            Meet with a licensed dermatologist — complimentary, no obligation
          </p>
        </div>
      </section>

      {/* Progress steps */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    step >= s
                      ? 'bg-[#7B2D8E] text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-10 sm:w-20 h-1 mx-2 rounded-full transition-colors ${
                      step > s ? 'bg-[#7B2D8E]' : 'bg-gray-100'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-gray-500">
            {STEP_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
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
                      setFormData((prev) => ({ ...prev, location: location.id }))
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
                        setFormData((prev) => ({ ...prev, date }))
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
                {timeSlots.map((time) => {
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
