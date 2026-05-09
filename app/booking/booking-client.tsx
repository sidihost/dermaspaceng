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
// Calendar is rendered as a tiny inline glyph next to the page title
// inside the slim purple bar. We deliberately do NOT bring back the
// old tall hero or its "Choose your perfect time" subtitle — the
// wizard progress directly below already labels the user's step.
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CalendarDays,
} from 'lucide-react'

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

import { WizardProgress } from '@/components/booking/wizard/progress'
import { LocationStep } from '@/components/booking/wizard/location-step'
import { ServicesStep } from '@/components/booking/wizard/services-step'
import { DateTimeStep } from '@/components/booking/wizard/datetime-step'
import { ReviewStep, type AppliedVoucherState } from '@/components/booking/wizard/review-step'
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
  // Voucher applied at the review step. We hold the full snapshot
  // (id, code, discount in kobo) so the review UI can show "WELCOME20
  // — ₦5,000 off" without re-fetching, and we forward `code` to the
  // initiate API which re-validates server-side before persisting.
  const [voucher, setVoucher] = useState<AppliedVoucherState | null>(null)

  // Whenever the customer changes which services are in the cart we
  // clear the voucher so they don't see a stale "20% off" pill that
  // was computed against a different subtotal — the voucher input
  // itself also re-probes on subtotal change, but clearing here
  // gives us a clean state for vouchers that no longer satisfy
  // `min_amount` after the change.
  useEffect(() => {
    setVoucher(null)
  }, [services])

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
          // We only forward the code — the API re-validates against
          // the live `vouchers` row to compute the canonical discount.
          voucherCode: voucher?.code ?? null,
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
    // Removed `min-h-screen`: the booking page is a focused wizard,
    // not a marketing page. With min-h-screen the main element was
    // forcing the gray-50 background to fill the entire viewport,
    // creating an awkward empty stretch between the "Need help?"
    // line and the bottom of the screen on phones (~250px of
    // nothing on a 6.7" device). Letting the page hug its actual
    // content + Footer gives Google/Vercel-style density — content
    // ends where it ends, no padded void below.
    <main className="bg-gray-50">
      <Header />

      {/* Slim brand hero — single line, centered. We keep the same
          ~44px mobile height as before (no subtitle, no chip stack)
          so the wizard progress remains the visual anchor of the
          page. What changed: the title is now centered, a small
          CalendarDays glyph sits next to it, hairline rules flank
          the heading to give the bar a quiet "ticket header" feel,
          and a subtle horizontal gradient + bottom highlight add
          depth without leaving the established purple palette.
          Color (#7B2D8E) and size are unchanged. */}
      <section
        className="relative overflow-hidden bg-[#7B2D8E] text-white"
        aria-labelledby="booking-hero-title"
      >
        {/* Soft directional gradient over the brand purple — adds
            polish without introducing a new color. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_35%,rgba(255,255,255,0)_65%,rgba(255,255,255,0.08)_100%)]"
        />
        {/* Hairline highlight at the bottom edge — separates the
            hero from the gray-50 page below more crisply than a
            flat block while staying visually quiet. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/15"
        />
        <div className="relative mx-auto flex max-w-3xl items-center justify-center gap-2.5 px-4 py-2.5 sm:py-3">
          <span
            aria-hidden
            className="hidden h-px flex-1 max-w-[72px] bg-white/20 sm:block"
          />
          <CalendarDays
            aria-hidden
            className="h-3.5 w-3.5 text-white/85"
            strokeWidth={2.25}
          />
          <h1
            id="booking-hero-title"
            className="text-[15px] font-semibold leading-tight tracking-[0.01em] text-balance sm:text-base"
          >
            Book an appointment
          </h1>
          <span
            aria-hidden
            className="hidden h-px flex-1 max-w-[72px] bg-white/20 sm:block"
          />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-3 pt-3 pb-4 sm:px-4 sm:pt-4">
        {/* Flat card — no shadow. The bordered white block on a
            gray-50 page already gives enough separation from the
            background; adding `shadow-sm` on top made the card look
            like it was hovering above the page (which felt
            "stickered on" against the otherwise calm chrome). Apps
            like Google's booking flows and the Vercel dashboard
            keep their step cards completely flat for the same
            reason — depth comes from the border, not a drop. */}
        <div className="rounded-2xl border border-gray-100 bg-white p-3 sm:rounded-3xl sm:p-5">
          <WizardProgress
            steps={STEPS as unknown as { key: string; label: string }[]}
            current={stepIndex}
          />

          {/* Step body: ~16px gap from progress (down from 20). The
              wizard child components handle their own internal
              spacing, so we only own the gap to the progress bar. */}
          <div className="mt-4">
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
                voucher={voucher}
                onCustomerChange={(field, value) => {
                  if (field === 'name') setCustomerName(value)
                  if (field === 'email') setCustomerEmail(value)
                  if (field === 'phone') setCustomerPhone(value)
                  if (field === 'notes') setNotes(value)
                }}
                onPaymentMethodChange={setPaymentMethod}
                onVoucherChange={setVoucher}
              />
            ) : null}
          </div>

          {submitError ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-[12px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
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

        <p className="mt-2.5 text-center text-[11px] text-gray-500">
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
