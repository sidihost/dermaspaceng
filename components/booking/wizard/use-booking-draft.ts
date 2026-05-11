'use client'

// ---------------------------------------------------------------------------
// /components/booking/wizard/use-booking-draft.ts
//
// Persists the booking wizard state to `localStorage` so the customer
// can leave the page mid-flow (open WhatsApp to check a date, close
// the tab, switch apps on mobile, get knocked offline) and pick up
// exactly where they left off when they return.
//
// We chose `localStorage` (not `sessionStorage`) so a closed tab or
// a fresh PWA launch still restores the draft. A 24h TTL keeps a
// stale draft from haunting the user weeks later — booking intent
// is a same-day or next-day signal.
//
// Catalog changes from the admin panel are handled separately by
// `validateServicesAgainstCatalog()` below: the orchestrator runs
// it whenever a fresh catalog arrives, so a selection that was
// renamed/repriced in admin is updated in place, and a treatment
// that was removed is silently dropped with a non-blocking notice.
// ---------------------------------------------------------------------------

import type { CatalogCategory } from '@/lib/services-catalog'
import type {
  AppliedVoucherState,
  BookingRecurrence,
} from './review-step'
import type { WizardServiceChoice } from './types'

export type WizardStepKey = 'location' | 'services' | 'datetime' | 'review'

export interface BookingDraft {
  step: WizardStepKey
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
  savedAt: number
}

// Bump this if the shape of `BookingDraft` ever changes incompatibly —
// older drafts under the old key will simply be ignored.
const STORAGE_KEY = 'dermaspace.booking-draft.v1'
const TTL_MS = 24 * 60 * 60 * 1000 // 24h

export function loadBookingDraft(): BookingDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BookingDraft
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      clearBookingDraft()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveBookingDraft(
  draft: Omit<BookingDraft, 'savedAt'>,
): void {
  if (typeof window === 'undefined') return
  // A truly empty draft (no location picked, no services, no date) is
  // not worth persisting — it would just trigger a confusing "Resumed
  // your booking" banner with nothing actually restored.
  const isEmpty =
    !draft.locationId &&
    draft.services.length === 0 &&
    !draft.date &&
    !draft.time &&
    !draft.customerName.trim() &&
    !draft.customerEmail.trim() &&
    !draft.customerPhone.trim() &&
    !draft.notes.trim()
  if (isEmpty) {
    clearBookingDraft()
    return
  }
  try {
    const payload: BookingDraft = { ...draft, savedAt: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage can throw in private-browsing modes or when quota
    // is exhausted. We swallow because losing the draft is annoying
    // but never fatal — the wizard still works.
  }
}

export function clearBookingDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Catalog reconciliation
//
// When a fresh catalog arrives (either on mount or after a focus
// revalidate triggered by the admin editing a service), we reconcile
// the customer's saved selections against it:
//
//   - keep + refresh: treatment still exists → update name/duration/
//     price in place so the wizard always reflects the live catalog.
//   - drop: treatment was removed → omit from `kept` and add a label
//     to `removed[]` so the UI can show a quiet "we removed X" note.
//
// We deliberately do NOT block the wizard or surface a scary modal —
// catalog edits are admin housekeeping, not customer errors.
// ---------------------------------------------------------------------------

export interface ReconciliationResult {
  kept: WizardServiceChoice[]
  removed: string[]
  changed: boolean
}

function parseDuration(label: string | null | undefined, fallback: number): number {
  if (!label) return fallback
  const m = label.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : fallback
}

export function reconcileServicesWithCatalog(
  services: WizardServiceChoice[],
  catalog: CatalogCategory[],
): ReconciliationResult {
  if (services.length === 0) {
    return { kept: [], removed: [], changed: false }
  }
  const kept: WizardServiceChoice[] = []
  const removed: string[] = []
  let changed = false

  for (const sel of services) {
    const cat = catalog.find((c) => c.slug === sel.categoryId)
    const tr = cat?.treatments.find((t) => t.id === sel.treatmentId)
    if (!cat || !tr) {
      removed.push(sel.treatmentName || sel.categoryName || 'a service')
      changed = true
      continue
    }
    const nextDuration = parseDuration(tr.duration, sel.duration)
    const nextPrice = tr.priceFrom * 100
    const nextName = tr.name
    const nextCatName = cat.title
    if (
      nextDuration !== sel.duration ||
      nextPrice !== sel.priceKobo ||
      nextName !== sel.treatmentName ||
      nextCatName !== sel.categoryName
    ) {
      changed = true
    }
    kept.push({
      categoryId: cat.slug,
      categoryName: nextCatName,
      treatmentId: tr.id,
      treatmentName: nextName,
      duration: nextDuration,
      priceKobo: nextPrice,
    })
  }

  return { kept, removed, changed }
}
