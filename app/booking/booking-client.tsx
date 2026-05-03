'use client'

// ---------------------------------------------------------------------------
// /app/booking/booking-client.tsx
//
// The 5-step appointment booking wizard.
//
//   1. Location  → which clinic
//   2. Services  → what to book
//   3. Date/Time → when
//   4. Review    → confirm details + pay (wallet | Paystack)
//   5. Done      → handled at /booking/[reference]?status=success
//
// Steps live in their own files under `components/booking/wizard/*`
// to keep this orchestrator under 300 lines and focused on:
//   - Step state (which step is current, can the user advance?)
//   - Loading the things needed by all steps (locations, viewer)
//   - Submitting to /api/bookings/initiate and routing the user to
//     the right next page (Paystack URL or local success URL)
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react'

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

import { WizardProgress } from '@/components/booking/wizard/progress'
import { LocationStep } from '@/components/booking/wizard/location-step'
import { ServicesStep } from '@/components/booking/wizard/services-step'
import { DateTimeStep } from '@/components/booking/wizard/datetime-step'
import { ReviewStep } from '@/components/booking/wizard/review-step'
import type {
  WizardLocation,
  WizardServiceChoice,
} from '@/components/booking/wizard/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STEPS = [
  { key: 'location', label: 'Location' },
  { key: 'services', label: 'Services' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'review', label: 'Review' },
] as const

type StepKey = (typeof STEPS)[number]['key']

interface AuthMeResponse {
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string | null
  }
}

export default function BookingClient() {
  const [step, setStep] = useState<StepKey>('location')

  // Load locations + viewer up front. SWR caches across renders so
  // `?initiate=fail` re-renders won't re-fetch.
  const { data: locationsData, isLoading: locationsLoading } = useSWR<{
    locations: WizardLocation[]
  }>('/api/bookings/locations', fetcher, { revalidateOnFocus: false })
  const locations = locationsData?.locations ?? []

  const { data: meData } = useSWR<AuthMeResponse>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
  })
  const me = meData?.user

  // Wizard state
  const [locationId, setLocationId] = useState<string | null>(null)
  const [services, setServices] = useState<WizardServiceChoice[]>([])
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>(
    'paystack',
  )

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Pre-fill the contact card from the signed-in user the first time
  // we know who they are. Don't clobber edits the user has already
  // made — they might be booking on someone else's behalf.
  useEffect(() => {
    if (!me) return
    setCustomerName((curr) => curr || `${me.firstName} ${me.lastName}`.trim())
    setCustomerEmail((curr) => curr || me.email)
    setCustomerPhone((curr) => curr || me.phone || '')
  }, [me])

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  )

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  // Per-step "can the user advance?" check.
  const canAdvance = useMemo(() => {
    switch (step) {
      case 'location':
        return Boolean(locationId)
      case 'services':
        return services.length > 0
      case 'datetime':
        return Boolean(date && time)
      case 'review':
        return Boolean(
          customerName.trim() &&
            /\S+@\S+\.\S+/.test(customerEmail) &&
            customerPhone.trim().length >= 7,
        )
      default:
        return false
    }
  }, [
    step,
    locationId,
    services.length,
    date,
    time,
    customerName,
    customerEmail,
    customerPhone,
  ])

  const goNext = () => {
    if (!canAdvance) return
    const idx = STEPS.findIndex((s) => s.key === step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key)
  }
  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.key === step)
    if (idx > 0) setStep(STEPS[idx - 1].key)
  }

  // Submit handler — `paymentMethod` decides whether we redirect to
  // Paystack or jump straight to the success page.
  const onSubmit = async () => {
    if (!canAdvance || !locationId || !date || !time) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/bookings/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          appointmentDate: date,
          appointmentTime: time,
          services: services.map((s) => ({
            categoryId: s.categoryId,
            treatmentId: s.treatmentId,
          })),
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim() || null,
          paymentMethod,
        }),
      })

      // Auth-required surfaces a sign-in redirect.
      if (res.status === 401) {
        window.location.href = `/signin?next=${encodeURIComponent('/booking')}`
        return
      }

      const json = await res.json()
      if (!res.ok || json.error) {
        setSubmitError(json.error || 'Could not start booking.')
        return
      }
      if (json.status === 'paid' && json.redirect) {
        window.location.href = json.redirect
        return
      }
      if (json.status === 'redirect' && json.authorizationUrl) {
        window.location.href = json.authorizationUrl
        return
      }
      setSubmitError('Unexpected response from server. Please try again.')
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-[#7B2D8E] text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-white/70">
              Book an appointment
            </p>
            <h1 className="text-base font-semibold">Choose your perfect time</h1>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <WizardProgress
            steps={STEPS as unknown as { key: string; label: string }[]}
            current={stepIndex}
          />

          <div className="mt-5">
            {step === 'location' ? (
              <LocationStep
                locations={locations}
                loading={locationsLoading}
                selectedId={locationId}
                onSelect={(id) => {
                  setLocationId(id)
                  // Reset downstream state when location changes — slot
                  // grids are per-location so a previously-picked time
                  // is no longer guaranteed to exist.
                  setDate(null)
                  setTime(null)
                }}
              />
            ) : null}

            {step === 'services' ? (
              <ServicesStep
                selected={services}
                onChange={(next) => {
                  setServices(next)
                  // Service duration affects which slots are bookable
                  // — wipe time so the next step re-validates.
                  setTime(null)
                }}
              />
            ) : null}

            {step === 'datetime' && selectedLocation ? (
              <DateTimeStep
                location={selectedLocation}
                services={services}
                selectedDate={date}
                selectedTime={time}
                onChange={(d, t) => {
                  setDate(d)
                  setTime(t)
                }}
              />
            ) : null}

            {step === 'review' && selectedLocation && date && time ? (
              <ReviewStep
                location={selectedLocation}
                services={services}
                date={date}
                time={time}
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                notes={notes}
                paymentMethod={paymentMethod}
                onCustomerChange={(field, value) => {
                  if (field === 'name') setCustomerName(value)
                  if (field === 'email') setCustomerEmail(value)
                  if (field === 'phone') setCustomerPhone(value)
                  if (field === 'notes') setNotes(value)
                }}
                onPaymentMethodChange={setPaymentMethod}
              />
            ) : null}
          </div>

          {submitError ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[12px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0 || submitting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <span className="ml-auto" />
            {step !== 'review' ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A1D6A] disabled:opacity-40"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canAdvance || submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7B2D8E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A1D6A] disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {paymentMethod === 'wallet' ? 'Pay with wallet' : 'Pay & confirm'}
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-gray-500">
          Need help?{' '}
          <Link href="/contact" className="font-semibold text-[#7B2D8E] hover:underline">
            Contact us
          </Link>
          {' • '}
          Your payment is secured by Paystack.
        </p>
      </section>

      <Footer />
    </main>
  )
}
