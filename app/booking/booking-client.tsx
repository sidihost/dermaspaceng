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

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate as globalMutate } from 'swr'

import SignInModal from '@/components/auth/signin-modal'
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
  RotateCcw,
  X,
} from 'lucide-react'

import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'

import { WizardProgress } from '@/components/booking/wizard/progress'
import { LocationStep } from '@/components/booking/wizard/location-step'
import { ServicesStep } from '@/components/booking/wizard/services-step'
import { DateTimeStep } from '@/components/booking/wizard/datetime-step'
import {
  ReviewStep,
  type AppliedVoucherState,
  type BookingRecurrence,
} from '@/components/booking/wizard/review-step'
import type {
  WizardLocation,
  WizardServiceChoice,
} from '@/components/booking/wizard/types'
import {
  loadBookingDraft,
  saveBookingDraft,
  clearBookingDraft,
  reconcileServicesWithCatalog,
  type WizardStepKey,
} from '@/components/booking/wizard/use-booking-draft'
import { SERVICES_CATALOG, type CatalogCategory } from '@/lib/services-catalog'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ALL_STEPS = [
  { key: 'location', label: 'Location' },
  { key: 'services', label: 'Services' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'review', label: 'Review' },
] as const

type StepKey = (typeof ALL_STEPS)[number]['key']

interface AuthMeResponse {
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string | null
  }
  // /api/auth/me exposes saved customer preferences at the top
  // level (mirrors the dashboard's prefs panel). The booking flow
  // only cares about `preferredLocation` so it can short-circuit
  // the location step for returning customers.
  preferences?: {
    preferredLocation?: string | null
  } | null
}

const catalogFetcher = (url: string) =>
  fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('catalog'))))
    .then(
      (body) =>
        ((body?.catalog as CatalogCategory[] | undefined) ??
          SERVICES_CATALOG) as CatalogCategory[],
    )

export default function BookingClient() {
  // Eagerly load any saved draft from localStorage *before* the first
  // render so the user never sees the empty wizard flash followed by
  // their previous state being restored — that single-frame jump
  // feels broken on mobile.
  const initialDraft = useMemo(() => loadBookingDraft(), [])
  const hadInitialDraft = Boolean(initialDraft)

  const [step, setStep] = useState<StepKey>(
    (initialDraft?.step as StepKey | undefined) ?? 'location',
  )

  // Load locations + viewer up front. SWR caches across renders so
  // `?initiate=fail` re-renders won't re-fetch. We revalidate on
  // focus/reconnect so admin edits to clinic hours or new locations
  // surface the next time the customer brings the tab forward.
  const { data: locationsData, isLoading: locationsLoading } = useSWR<{
    locations: WizardLocation[]
  }>('/api/bookings/locations', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const locations = locationsData?.locations ?? []

  // Subscribe to the catalog in the orchestrator (separate from the
  // copy ServicesStep renders against) so we can reconcile saved
  // selections against admin changes the moment they arrive. Both
  // hooks share the SWR cache key, so this isn't a second request —
  // it's the same network call, observed from two places.
  const { data: catalog = SERVICES_CATALOG } = useSWR<CatalogCategory[]>(
    '/api/services-catalog',
    catalogFetcher,
    {
      fallbackData: SERVICES_CATALOG as CatalogCategory[],
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // Keep the catalog warm without hammering the API — 60s
      // matches the route's `revalidate = 60`, so this is a cache
      // hit at the edge most of the time.
      refreshInterval: 60_000,
    },
  )

  const { data: meData } = useSWR<AuthMeResponse>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
  })
  const me = meData?.user
  // Preferred-clinic id (preference set on the dashboard). Lives in
  // a sibling `preferences` block in the /api/auth/me payload.
  const preferredLocationId = meData?.preferences?.preferredLocation || null

  // Wizard state (seeded from the draft when present so a returning
  // user lands on the same step with the same selections, dates,
  // contact details, voucher and recurrence still intact).
  const [locationId, setLocationId] = useState<string | null>(
    initialDraft?.locationId ?? null,
  )
  const [services, setServices] = useState<WizardServiceChoice[]>(
    initialDraft?.services ?? [],
  )
  const [date, setDate] = useState<string | null>(initialDraft?.date ?? null)
  const [time, setTime] = useState<string | null>(initialDraft?.time ?? null)
  const [customerName, setCustomerName] = useState(
    initialDraft?.customerName ?? '',
  )
  const [customerEmail, setCustomerEmail] = useState(
    initialDraft?.customerEmail ?? '',
  )
  const [customerPhone, setCustomerPhone] = useState(
    initialDraft?.customerPhone ?? '',
  )
  const [notes, setNotes] = useState(initialDraft?.notes ?? '')
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>(
    initialDraft?.paymentMethod ?? 'paystack',
  )
  // Voucher applied at the review step. We hold the full snapshot
  // (id, code, discount in kobo) so the review UI can show "WELCOME20
  // — ₦5,000 off" without re-fetching, and we forward `code` to the
  // initiate API which re-validates server-side before persisting.
  const [voucher, setVoucher] = useState<AppliedVoucherState | null>(
    initialDraft?.voucher ?? null,
  )
  // Recurring-appointment metadata. Captured at the review step and
  // prepended to the booking notes so the salon team can see the
  // cadence without us schema-migrating the bookings table. The
  // free-text "custom" string is only used when recurrence === 'custom'.
  const [recurrence, setRecurrence] = useState<BookingRecurrence>(
    initialDraft?.recurrence ?? 'none',
  )
  const [recurrenceCustom, setRecurrenceCustom] = useState(
    initialDraft?.recurrenceCustom ?? '',
  )

  // Non-blocking notices for the customer — used for both "we
  // resumed your draft" and "a service was removed". Auto-dismisses
  // after a few seconds so it doesn't linger and the wizard stays
  // calm.
  const [resumeNotice, setResumeNotice] = useState<string | null>(
    hadInitialDraft ? 'Picked up where you left off' : null,
  )
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null)

  // Whenever the customer changes which services are in the cart we
  // clear the voucher so they don't see a stale "20% off" pill that
  // was computed against a different subtotal — the voucher input
  // itself also re-probes on subtotal change, but clearing here
  // gives us a clean state for vouchers that no longer satisfy
  // `min_amount` after the change. Guard against the reconcile pass
  // (which also touches `services`) wiping a still-valid voucher
  // when only the price or name changed — we use a ref to remember
  // the previous service-key set so we only nuke the voucher on a
  // real user-driven change.
  const prevServicesKeyRef = useRef<string>(
    services.map((s) => `${s.categoryId}::${s.treatmentId}`).sort().join('|'),
  )
  useEffect(() => {
    const nextKey = services
      .map((s) => `${s.categoryId}::${s.treatmentId}`)
      .sort()
      .join('|')
    if (nextKey !== prevServicesKeyRef.current) {
      setVoucher(null)
      prevServicesKeyRef.current = nextKey
    }
  }, [services])

  // Reconcile saved selections against the live catalog whenever a
  // fresh catalog payload arrives. This is what makes admin edits
  // "reflect fast" in the booking flow:
  //   - service renamed in admin → name updates in place
  //   - price changed → total updates in place
  //   - service removed → silently dropped + we show a small notice
  // We only run this once the catalog has actually loaded from the
  // network (not on the static fallback) to avoid wiping a draft
  // built against the real catalog just because the page reloaded.
  const reconciledRef = useRef(false)
  useEffect(() => {
    if (reconciledRef.current) return
    if (!catalog || catalog === SERVICES_CATALOG) return
    if (services.length === 0) {
      reconciledRef.current = true
      return
    }
    const { kept, removed, changed } = reconcileServicesWithCatalog(
      services,
      catalog,
    )
    if (changed) {
      setServices(kept)
      // Updating services would also reset the previous-key ref via
      // the effect above — but those changes are catalog-driven, not
      // user-driven, so pre-seed the ref with the new key so the
      // voucher isn't cleared as a side effect.
      prevServicesKeyRef.current = kept
        .map((s) => `${s.categoryId}::${s.treatmentId}`)
        .sort()
        .join('|')
      if (removed.length > 0) {
        const label =
          removed.length === 1
            ? `${removed[0]} is no longer offered — we removed it from your booking.`
            : `${removed.length} services are no longer offered and were removed.`
        setReconcileNotice(label)
      }
      // If everything we had got removed, fall back to the services
      // step so the customer can re-pick.
      if (kept.length === 0 && step !== 'location') {
        setStep('services')
      }
    }
    reconciledRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog])

  // Auto-populate location from user preference and skip the
  // location step entirely when:
  //   1. User just logged in (me changes and we didn't already have locationId)
  //   2. Locations just finished loading
  //   3. There is no saved draft (`hadInitialDraft`) — i.e. this is a
  //      fresh booking flow, not a resumed one where the user already
  //      decided which clinic
  // This provides a frictionless flow for returning customers who
  // set a preferred clinic — they jump straight to picking services,
  // the way big-tech booking flows handle known preferences.
  const preferredAutoAppliedRef = useRef(false)
  useEffect(() => {
    if (preferredAutoAppliedRef.current) return
    if (locationId) return // Already picked (could be from draft or user)
    if (locations.length === 0) return // Locations not loaded yet
    if (!preferredLocationId) return // No preference set

    const preferred = locations.find((l) => l.id === preferredLocationId)
    if (!preferred) return

    setLocationId(preferred.id)
    preferredAutoAppliedRef.current = true

    // If the wizard is sitting on the (now redundant) location step,
    // advance to services. We do this for both fresh flows AND
    // resumed drafts whose saved step is still 'location' — there's
    // no point making a returning customer re-confirm the clinic
    // they've already saved as their preference. Drafts already
    // pointing at a later step (services/datetime/review) are left
    // alone so we don't yank them backwards.
    if (step === 'location') {
      setStep('services')
      setResumeNotice(`Using your preferred clinic: ${preferred.name}`)
    }
  }, [locations, preferredLocationId, locationId, step])

  // Validate the persisted locationId once locations load — if the
  // clinic was removed/disabled in admin, drop the selection rather
  // than dead-ending the flow.
  useEffect(() => {
    if (!locationId) return
    if (locations.length === 0) return
    const stillExists = locations.some((l) => l.id === locationId)
    if (!stillExists) {
      setLocationId(null)
      setDate(null)
      setTime(null)
      if (step !== 'location') setStep('location')
      setReconcileNotice(
        'Your saved clinic is no longer available — please pick another.',
      )
    }
  }, [locations, locationId, step])

  // Auto-dismiss the resume notice so it doesn't linger on screen.
  useEffect(() => {
    if (!resumeNotice) return
    const t = window.setTimeout(() => setResumeNotice(null), 4000)
    return () => window.clearTimeout(t)
  }, [resumeNotice])
  useEffect(() => {
    if (!reconcileNotice) return
    const t = window.setTimeout(() => setReconcileNotice(null), 6000)
    return () => window.clearTimeout(t)
  }, [reconcileNotice])

  // Persist the draft to localStorage on any meaningful change. The
  // hook itself short-circuits when everything is empty so we don't
  // write garbage. Debounce-free is fine here — the writes are tiny
  // and localStorage is synchronous + cheap.
  useEffect(() => {
    saveBookingDraft({
      step,
      locationId,
      services,
      date,
      time,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      paymentMethod,
      voucher,
      recurrence,
      recurrenceCustom,
    })
  }, [
    step,
    locationId,
    services,
    date,
    time,
    customerName,
    customerEmail,
    customerPhone,
    notes,
    paymentMethod,
    voucher,
    recurrence,
    recurrenceCustom,
  ])

  // Smooth scroll to the top of the wizard card on step change so
  // each step feels like a fresh "screen" on mobile, the way an
  // in-app flow would. Skips on first render so we don't yank the
  // page on initial mount.
  const cardRef = useRef<HTMLDivElement>(null)
  const firstRenderRef = useRef(true)
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    const el = cardRef.current
    if (!el) return
    // Honour reduced-motion users by skipping the smooth scroll.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [step])

  // Hard reset — used by the "Start fresh" affordance on the resume
  // banner so a customer can throw away the saved draft and begin a
  // brand new booking without manually clearing each step.
  const startFresh = () => {
    clearBookingDraft()
    setStep('location')
    setLocationId(null)
    setServices([])
    setDate(null)
    setTime(null)
    setNotes('')
    setVoucher(null)
    setRecurrence('none')
    setRecurrenceCustom('')
    setResumeNotice(null)
    setSubmitError(null)
  }

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Sign-in modal: opens when /api/bookings/initiate returns 401 so
  // the visitor can authenticate inline without losing their wizard
  // state. Re-submits automatically once they sign in.
  const [showSignIn, setShowSignIn] = useState(false)

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

  // When the customer has a saved clinic preference and we already
  // applied it (or they chose one and want to keep it), drop the
  // Location step from the wizard entirely. They can still change
  // clinic via a "change" chip on the Services step. Surfacing the
  // step is forced back when (a) we couldn't auto-apply a preference
  // (no preference saved, or saved clinic disappeared in admin) or
  // (b) the user explicitly tapped "change" on the chip.
  const [forceLocationStep, setForceLocationStep] = useState(false)
  const STEPS = useMemo(() => {
    const skip =
      !forceLocationStep &&
      Boolean(preferredLocationId) &&
      Boolean(locationId) &&
      locationId === preferredLocationId
    return skip
      ? ALL_STEPS.filter((s) => s.key !== 'location')
      : (ALL_STEPS as unknown as Array<{ key: StepKey; label: string }>)
  }, [forceLocationStep, preferredLocationId, locationId])

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
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key as StepKey)
  }
  const goBack = () => {
    const idx = STEPS.findIndex((s) => s.key === step)
    if (idx > 0) setStep(STEPS[idx - 1].key as StepKey)
  }

  // Safety: if we just dropped the Location step but the user is
  // somehow still on it, push them to the next step automatically so
  // they don't see a "step 0 of 3" empty state.
  useEffect(() => {
    if (step === 'location' && !STEPS.some((s) => s.key === 'location')) {
      setStep('services')
    }
  }, [STEPS, step])

  // Submit handler — `paymentMethod` decides whether we redirect to
  // Paystack or jump straight to the success page.
  const onSubmit = async () => {
    if (!canAdvance || !locationId || !date || !time) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      // Build the final notes payload. If the customer asked for a
      // recurring cadence we tag the notes with a machine-readable
      // line ("Recurring: weekly") so the salon team can spot the
      // series without us schema-migrating the bookings table.
      const recurrenceTag = (() => {
        if (recurrence === 'none') return ''
        if (recurrence === 'custom') {
          const custom = recurrenceCustom.trim()
          return custom
            ? `Recurring: custom — ${custom}`
            : 'Recurring: custom'
        }
        const labels: Record<Exclude<BookingRecurrence, 'none' | 'custom'>, string> = {
          weekly: 'weekly',
          biweekly: 'bi-weekly',
          monthly: 'monthly',
        }
        return `Recurring: ${labels[recurrence]}`
      })()
      const trimmedNotes = notes.trim()
      const finalNotes =
        recurrenceTag && trimmedNotes
          ? `${recurrenceTag}\n${trimmedNotes}`
          : recurrenceTag || trimmedNotes || null

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
          notes: finalNotes,
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
        // Booking successfully created server-side — the draft is no
        // longer useful and would otherwise cause the success
        // landing page or a return visit to re-restore stale state.
        clearBookingDraft()
        window.location.href = json.redirect
        return
      }
      if (json.status === 'redirect' && json.authorizationUrl) {
        // Same here: the booking is persisted on the server, payment
        // is the next step. Clear the draft so we don't restore it
        // after the customer returns from Paystack.
        clearBookingDraft()
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

      {/* ----------------------------------------------------------
          Booking hero — refined edition.

          Same compact height as before (`py-2.5 sm:py-3`, ~44–50px
          on phones) so the wizard progress remains the visual anchor
          and existing screenshots / lighthouse numbers stay stable.
          What's new is purely decorative polish, on the established
          #7B2D8E palette only:

          • A soft radial spotlight glows behind the icon — gives
            the bar a centered focal point instead of a flat block.
          • The CalendarDays glyph now sits inside a small circular
            badge with a frosted-glass treatment (white/12 fill,
            hairline ring) so it reads as an emblem, not a stray
            icon.
          • The flanking hairlines now fade out at their inner ends
            via a mask — much more "ticket header"-like than the
            previous hard line.
          • Two small "•" punctuation dots sit between the lines and
            the title for a quiet typographic accent (the same
            pattern Stripe / Linear use on their internal banners).
          • Title gets a hairline tracking bump so it feels
            considered at 15px without growing.
          • A 1px highlight at the bottom edge is unchanged; we
            added a near-invisible top highlight too so the hero
            reads as a slim "ticket" with light catching both
            edges.

          No new icons (no Sparkles, no Zap), no new colors. */}
      <section
        className="relative overflow-hidden bg-[#7B2D8E] text-white"
        aria-labelledby="booking-hero-title"
      >
        {/* Wide directional sheen + a centered radial glow. The
            radial focuses light behind the title so the eye lands
            there immediately; the linear sheen keeps the rest of
            the bar from looking dead-flat. Both are pure white
            transparency so the brand color stays the only hue. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_35%,rgba(255,255,255,0)_65%,rgba(255,255,255,0.08)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_120%_at_50%_50%,rgba(255,255,255,0.14),rgba(255,255,255,0)_70%)]"
        />
        {/* Hairline highlights on both edges — top is barely there
            on purpose, bottom matches the previous bar. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/15"
        />
        <div className="relative mx-auto flex max-w-3xl items-center justify-center gap-2.5 px-4 py-2.5 sm:py-3">
          {/* Left hairline + dot. The hairline fades into the
              dot via a CSS mask so the line "ends" softly instead
              of butting against the punctuation. */}
          <span
            aria-hidden
            className="hidden h-px flex-1 max-w-[80px] bg-white/25 [mask-image:linear-gradient(to_right,transparent,#fff_55%,#fff)] sm:block"
          />
          <span
            aria-hidden
            className="hidden h-1 w-1 rounded-full bg-white/40 sm:block"
          />
          {/* Glyph badge — circular frosted disc with a hairline
              ring. Sized small (20px) so the bar height never
              changes. */}
          <span
            aria-hidden
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/25"
          >
            <CalendarDays
              aria-hidden
              className="h-3 w-3 text-white"
              strokeWidth={2.5}
            />
          </span>
          <h1
            id="booking-hero-title"
            className="text-[15px] font-semibold leading-tight tracking-[0.02em] text-balance sm:text-base"
          >
            Book an appointment
          </h1>
          {/* Right dot + hairline — mirrored mask so it fades
              outward symmetrically. */}
          <span
            aria-hidden
            className="hidden h-1 w-1 rounded-full bg-white/40 sm:block"
          />
          <span
            aria-hidden
            className="hidden h-px flex-1 max-w-[80px] bg-white/25 [mask-image:linear-gradient(to_left,transparent,#fff_55%,#fff)] sm:block"
          />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-3 pt-3 pb-4 sm:px-4 sm:pt-4">
        {/* Resume banner — confirms to the customer that we restored
            their progress (so the wizard not being empty isn't
            mysterious) and gives them a one-tap exit to start over.
            Rendered above the card so it doesn't push step content
            around when it auto-dismisses. */}
        {resumeNotice ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-2 flex items-center gap-2 rounded-xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/[0.06] px-3 py-2 text-[12.5px] text-[#5A1D6A]"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{resumeNotice}</span>
            <button
              type="button"
              onClick={startFresh}
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/10"
            >
              Start fresh
            </button>
            <button
              type="button"
              onClick={() => setResumeNotice(null)}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-1 text-[#7B2D8E]/70 hover:bg-[#7B2D8E]/10 hover:text-[#7B2D8E]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {/* Reconciliation banner — surfaced when the live catalog
            drops a previously-selected service or a saved clinic
            disappears. Amber-leaning purple keeps it on-brand
            without looking like a hard error. */}
        {reconcileNotice ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{reconcileNotice}</span>
            <button
              type="button"
              onClick={() => setReconcileNotice(null)}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-1 text-amber-700 hover:bg-amber-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {/* Flat card — no shadow. The bordered white block on a
            gray-50 page already gives enough separation from the
            background; adding `shadow-sm` on top made the card look
            like it was hovering above the page (which felt
            "stickered on" against the otherwise calm chrome). Apps
            like Google's booking flows and the Vercel dashboard
            keep their step cards completely flat for the same
            reason — depth comes from the border, not a drop. */}
        <div
          ref={cardRef}
          className="scroll-mt-3 rounded-2xl border border-gray-100 bg-white p-3 sm:rounded-3xl sm:p-5"
        >
          <WizardProgress
            steps={STEPS as unknown as { key: string; label: string }[]}
            current={stepIndex < 0 ? 0 : stepIndex}
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
              <>
                {/* When the Location step is hidden because the user
                    has a saved preference, surface the chosen clinic
                    here as a small chip with a "change" affordance,
                    so they can still switch branches without us
                    showing the full step every time. */}
                {selectedLocation &&
                !STEPS.some((s) => s.key === 'location') ? (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-700">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#7B2D8E]" />
                    <span className="min-w-0 flex-1 truncate">
                      Booking at <strong className="font-semibold text-gray-900">{selectedLocation.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForceLocationStep(true)
                        setStep('location')
                      }}
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/10"
                    >
                      Change
                    </button>
                  </div>
                ) : null}
                <ServicesStep
                  locationId={locationId}
                  selected={services}
                  onChange={(next) => {
                    setServices(next)
                    // Service duration affects which slots are bookable
                    // — wipe time so the next step re-validates.
                    setTime(null)
                  }}
                />
              </>
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
                recurrence={recurrence}
                recurrenceCustom={recurrenceCustom}
                onCustomerChange={(field, value) => {
                  if (field === 'name') setCustomerName(value)
                  if (field === 'email') setCustomerEmail(value)
                  if (field === 'phone') setCustomerPhone(value)
                  if (field === 'notes') setNotes(value)
                }}
                onPaymentMethodChange={setPaymentMethod}
                onVoucherChange={setVoucher}
                onRecurrenceChange={setRecurrence}
                onRecurrenceCustomChange={setRecurrenceCustom}
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
