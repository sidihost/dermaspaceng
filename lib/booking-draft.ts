/**
 * Booking wizard draft persistence.
 *
 * The 5-step booking wizard (`app/booking/booking-client.tsx`) lives
 * entirely in `useState`, which means a hard refresh, an accidental
 * tab close, or a quick switch to another page wipes the customer's
 * progress. From their seat that read as the page "forgetting" them
 * — they had to re-pick the location, re-pick the services, and
 * re-pick the slot every single time.
 *
 * Real-world checkout flows (Booking.com, Airbnb, Uber, even native
 * iOS apps) all auto-save the in-progress order to local storage and
 * restore it on the next visit, usually with a small "Continue where
 * you left off" banner so the user can either resume or discard. We
 * follow the same pattern here.
 *
 * Design notes:
 *
 *   • localStorage, not cookies — the draft is per-device, never
 *     leaves the browser, never hits our server, never appears in
 *     analytics. A draft on phone A should not appear on laptop B.
 *
 *   • TTL of 6 hours — long enough that a customer can step away
 *     for lunch and come back, short enough that a stale draft
 *     against a slot that's already booked elsewhere doesn't haunt
 *     them tomorrow morning. Stale drafts are quietly discarded on
 *     read.
 *
 *   • Per-user scoping — when the viewer signs in we tag the draft
 *     with their id so signing OUT (or signing in as a different
 *     person) clears it. Anonymous drafts use the `anon` bucket.
 *     This avoids the awkward "I'm now logged in as Sarah and the
 *     page is asking me to resume Itunu's booking" bug.
 *
 *   • Versioned schema — we bump `BOOKING_DRAFT_VERSION` whenever
 *     the persisted shape changes. Old drafts simply fall through
 *     the version check and get discarded, no migrations needed.
 *
 *   • Best-effort, never throws — localStorage can throw in private
 *     mode, in iOS Safari with cookies disabled, on quota-exceeded.
 *     Every helper here swallows those failures so a draft-storage
 *     hiccup never breaks the actual booking flow.
 */

import type {
  WizardServiceChoice,
} from '@/components/booking/wizard/types'
import type {
  AppliedVoucherState,
  BookingRecurrence,
} from '@/components/booking/wizard/review-step'

// Bump this whenever the persisted shape changes in a way that
// older drafts can't safely hydrate into the current wizard.
const BOOKING_DRAFT_VERSION = 1

// 6 hours. See the file header for the rationale.
const BOOKING_DRAFT_TTL_MS = 6 * 60 * 60 * 1000

const STORAGE_KEY = 'dermaspace.booking-draft.v1'

export type BookingStepKey = 'location' | 'services' | 'datetime' | 'review'

export interface BookingDraft {
  version: number
  /** ms-since-epoch when the draft was last written. */
  savedAt: number
  /** User id the draft belongs to, or `anon` for signed-out visitors. */
  userScope: string
  step: BookingStepKey
  locationId: string | null
  services: WizardServiceChoice[]
  date: string | null
  time: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
  paymentMethod: 'wallet' | 'paystack'
  voucher: AppliedVoucherState | null
  recurrence: BookingRecurrence
  recurrenceCustom: string
}

export interface BookingDraftInput {
  step: BookingStepKey
  locationId: string | null
  services: WizardServiceChoice[]
  date: string | null
  time: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
  paymentMethod: 'wallet' | 'paystack'
  voucher: AppliedVoucherState | null
  recurrence: BookingRecurrence
  recurrenceCustom: string
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function scopeFor(userId: string | null | undefined): string {
  return userId && userId.length > 0 ? `user:${userId}` : 'anon'
}

/**
 * Returns true when there is enough information in the draft to be
 * worth restoring — picking a location alone counts (the customer
 * already showed intent), but an empty wizard does not. We use this
 * to decide whether to show the "Continue where you left off" banner.
 */
export function isDraftMeaningful(draft: BookingDraft | null): boolean {
  if (!draft) return false
  if (draft.locationId) return true
  if (draft.services.length > 0) return true
  if (draft.date || draft.time) return true
  // Notes/recurrence/voucher alone aren't enough — they only matter
  // in the context of a chosen location + services.
  return false
}

/**
 * Read the saved draft for the given viewer. Returns null when:
 *   • SSR (no window)
 *   • no draft persisted
 *   • the draft belongs to a different user
 *   • the draft is older than the TTL
 *   • the persisted shape doesn't match the current version
 *   • localStorage throws (private mode, quota, etc)
 */
export function readBookingDraft(
  userId: string | null | undefined,
): BookingDraft | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BookingDraft> | null
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.version !== BOOKING_DRAFT_VERSION) return null
    const expectedScope = scopeFor(userId)
    if (parsed.userScope !== expectedScope) return null
    const savedAt = Number(parsed.savedAt)
    if (!Number.isFinite(savedAt)) return null
    if (Date.now() - savedAt > BOOKING_DRAFT_TTL_MS) {
      // Quietly evict — no need to keep stale data around.
      try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      return null
    }
    // Coerce to the expected shape with safe fallbacks. Anything we
    // can't trust gets a sane default — never a crash.
    const draft: BookingDraft = {
      version: BOOKING_DRAFT_VERSION,
      savedAt,
      userScope: expectedScope,
      step: (['location', 'services', 'datetime', 'review'] as const).includes(
        parsed.step as BookingStepKey,
      )
        ? (parsed.step as BookingStepKey)
        : 'location',
      locationId: typeof parsed.locationId === 'string' ? parsed.locationId : null,
      services: Array.isArray(parsed.services)
        ? (parsed.services as WizardServiceChoice[])
        : [],
      date: typeof parsed.date === 'string' ? parsed.date : null,
      time: typeof parsed.time === 'string' ? parsed.time : null,
      customerName: typeof parsed.customerName === 'string' ? parsed.customerName : '',
      customerEmail: typeof parsed.customerEmail === 'string' ? parsed.customerEmail : '',
      customerPhone: typeof parsed.customerPhone === 'string' ? parsed.customerPhone : '',
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      paymentMethod:
        parsed.paymentMethod === 'wallet' || parsed.paymentMethod === 'paystack'
          ? parsed.paymentMethod
          : 'paystack',
      voucher:
        parsed.voucher && typeof parsed.voucher === 'object'
          ? (parsed.voucher as AppliedVoucherState)
          : null,
      recurrence: (['none', 'weekly', 'biweekly', 'monthly', 'custom'] as const).includes(
        parsed.recurrence as BookingRecurrence,
      )
        ? (parsed.recurrence as BookingRecurrence)
        : 'none',
      recurrenceCustom:
        typeof parsed.recurrenceCustom === 'string' ? parsed.recurrenceCustom : '',
    }
    return draft
  } catch (err) {
    console.error('[booking-draft] read failed', err)
    return null
  }
}

/**
 * Persist a draft for the given viewer. Safe to call on every render
 * — we only actually touch storage when something meaningful is in
 * the draft, so an untouched wizard never creates a phantom draft.
 */
export function writeBookingDraft(
  userId: string | null | undefined,
  input: BookingDraftInput,
): void {
  if (!isBrowser()) return
  try {
    const draft: BookingDraft = {
      version: BOOKING_DRAFT_VERSION,
      savedAt: Date.now(),
      userScope: scopeFor(userId),
      ...input,
    }
    if (!isDraftMeaningful(draft)) {
      // Don't pollute storage with an empty wizard.
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch (err) {
    // Quota / private mode / disabled storage — we silently give up.
    console.error('[booking-draft] write failed', err)
  }
}

/**
 * Drop the draft entirely. Called after a successful initiate
 * (whether to Paystack or wallet) so a customer who completes a
 * booking and then comes back for a second one doesn't see a "resume"
 * banner against their already-paid order.
 */
export function clearBookingDraft(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('[booking-draft] clear failed', err)
  }
}
