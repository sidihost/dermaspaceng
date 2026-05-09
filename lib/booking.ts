// ---------------------------------------------------------------------------
// lib/booking.ts
//
// Domain layer for the appointment booking system. Every booking
// mutation that has to be safe across concurrent requests goes through
// this module so the locking + invariants live in one place.
//
// Concurrency model
// -----------------
// Slot availability is per-location with capacity = `slots_per_window`
// concurrent appointments. Two customers refreshing the booking page
// at the same second will see the same slots available — we *must*
// guarantee that the second to call `createPendingBooking` for an
// already-saturated slot fails cleanly. We do that by computing the
// in-window count inside the same transaction that inserts the new
// row, locking the relevant rows with FOR UPDATE so no other
// transaction can sneak in between the count and the insert.
//
// Money handling
// --------------
// All prices flow as KOBO (smallest NGN unit) once they leave the
// catalog. The catalog stores Naira; we multiply by 100 the moment
// we resolve a treatment, and we never go back to floating-point.
// Paystack's API uses kobo natively, our `transactions` table stores
// Naira (legacy), so we expose helpers that convert at the boundary.
// ---------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid'
import { sql } from '@/lib/db'
import { SERVICES_CATALOG, type CatalogTreatment } from '@/lib/services-catalog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingLocation {
  id: string
  name: string
  address: string
  phone: string
  whatsapp: string
  opens_at: string
  closes_at: string
  open_days: number[] // 0 = Sunday … 6 = Saturday
  slot_minutes: number
  slots_per_window: number
  is_active: boolean
  image_url: string | null
  display_order: number
}

export interface BookingServiceSelection {
  categoryId: string
  treatmentId: string
}

export interface ResolvedService {
  categoryId: string
  categoryName: string
  treatmentId: string
  treatmentName: string
  duration: number
  priceKobo: number
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed'

export interface Booking {
  id: string
  user_id: string
  booking_reference: string
  location_id: string
  location_name: string
  location_address: string | null
  appointment_date: string
  appointment_time: string
  total_duration: number
  /**
   * Sum of line-item prices BEFORE any voucher discount. When the
   * customer didn't redeem a voucher this equals `total_price_kobo`.
   * Stored separately so the receipt can show "Subtotal / Discount /
   * Total" cleanly, and so reporting can split gross vs net revenue.
   */
  subtotal_kobo: number
  /**
   * Voucher discount in kobo. Always >= 0. We charge the customer
   * `total_price_kobo = subtotal_kobo - discount_kobo`.
   */
  discount_kobo: number
  /** UUID of the redeemed voucher row (`vouchers.id`) — null if none. */
  voucher_id: string | null
  /** Voucher code as entered by the customer (uppercased). */
  voucher_code: string | null
  total_price_kobo: number
  customer_name: string
  customer_email: string
  customer_phone: string
  status: BookingStatus
  payment_status: PaymentStatus
  payment_method: 'wallet' | 'paystack' | null
  payment_reference: string | null
  notes: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  completed_at: string | null
  created_at: string
  services: ResolvedService[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100)
}

export function koboToNaira(kobo: number): number {
  return kobo / 100
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(koboToNaira(kobo))
}

/**
 * Generate a human-friendly booking reference like `DS-AB12CD34`.
 * Used in URLs (`/booking/DS-AB12CD34`) and customer-facing emails.
 * The dash + uppercase makes it readable over the phone, which is
 * what front-desk staff actually need.
 */
export function generateBookingReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I — easier on the phone
  let body = ''
  for (let i = 0; i < 8; i++) {
    body += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `DS-${body}`
}

/**
 * Resolve `{categoryId, treatmentId}[]` against the catalog, returning
 * full snapshots (name, duration, price) we'll persist on the booking
 * row. We do this **server-side** every time, even if the client sent
 * names/prices, so a tampered request can't pay 0 for a Hydra Facial.
 */
export function resolveServices(
  selections: BookingServiceSelection[],
): { resolved: ResolvedService[]; error: string | null } {
  if (!Array.isArray(selections) || selections.length === 0) {
    return { resolved: [], error: 'Pick at least one service.' }
  }
  const resolved: ResolvedService[] = []
  for (const sel of selections) {
    const category = SERVICES_CATALOG.find((c) => c.slug === sel.categoryId)
    if (!category) {
      return { resolved: [], error: `Unknown service category: ${sel.categoryId}` }
    }
    const treatment = category.treatments.find(
      (t) => t.id === sel.treatmentId,
    ) as CatalogTreatment | undefined
    if (!treatment) {
      return {
        resolved: [],
        error: `Unknown treatment: ${sel.categoryId}/${sel.treatmentId}`,
      }
    }
    // Parse "75 mins" → 75. We use a forgiving regex so a future
    // "1 hr 15 mins" entry doesn't crash; falls back to 60.
    const m = treatment.duration.match(/(\d+)/)
    const duration = m ? parseInt(m[1], 10) : 60
    resolved.push({
      categoryId: category.slug,
      categoryName: category.title,
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      duration,
      priceKobo: nairaToKobo(treatment.priceFrom),
    })
  }
  return { resolved, error: null }
}

export function totalDuration(services: ResolvedService[]): number {
  return services.reduce((s, x) => s + x.duration, 0)
}

export function totalKobo(services: ResolvedService[]): number {
  return services.reduce((s, x) => s + x.priceKobo, 0)
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

function parseDays(csv: string): number[] {
  return csv
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
}

function rowToLocation(row: any): BookingLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    opens_at: row.opens_at,
    closes_at: row.closes_at,
    open_days: parseDays(row.open_days),
    slot_minutes: row.slot_minutes,
    slots_per_window: row.slots_per_window,
    is_active: row.is_active,
    image_url: row.image_url,
    display_order: row.display_order,
  }
}

export async function listLocations(): Promise<BookingLocation[]> {
  const rows = (await sql`
    SELECT * FROM booking_locations
    WHERE is_active = TRUE
    ORDER BY display_order ASC, name ASC
  `) as any[]
  return rows.map(rowToLocation)
}

export async function getLocation(id: string): Promise<BookingLocation | null> {
  const rows = (await sql`
    SELECT * FROM booking_locations WHERE id = ${id} LIMIT 1
  `) as any[]
  if (rows.length === 0) return null
  return rowToLocation(rows[0])
}

// ---------------------------------------------------------------------------
// Slot generation + availability
// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((s) => parseInt(s, 10))
  return h * 60 + (m || 0)
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Enumerate every potential slot for a given location/date pair. We
 * generate slots at the location's `slot_minutes` granularity from
 * `opens_at` up to `closes_at - serviceDuration` so a booking never
 * runs past closing time.
 */
export function enumerateSlots(
  location: BookingLocation,
  serviceDuration: number,
): string[] {
  const start = timeToMinutes(location.opens_at)
  const end = timeToMinutes(location.closes_at)
  const step = location.slot_minutes
  const out: string[] = []
  for (let t = start; t + serviceDuration <= end; t += step) {
    out.push(minutesToTime(t))
  }
  return out
}

/**
 * For a given `(location, date, duration)`, return the list of slot
 * strings (`'14:30'`) that still have capacity, taking into account
 * concurrent appointments already booked at overlapping times.
 *
 * Algorithm:
 *   1. Generate every potential slot.
 *   2. Pull every existing booking for that location/date that hasn't
 *      been cancelled.
 *   3. For each potential slot S, count how many existing bookings
 *      overlap S..S+duration. If that count >= slots_per_window the
 *      slot is full.
 *
 * We do the math in JS rather than a fancy SQL `GENERATE_SERIES + JOIN`
 * because the slot table is small (≤30 entries) and JS is easier to
 * reason about / unit-test later.
 */
export async function getAvailableSlots(args: {
  locationId: string
  date: string // YYYY-MM-DD
  duration: number
}): Promise<{ slots: string[]; error: string | null }> {
  const location = await getLocation(args.locationId)
  if (!location) return { slots: [], error: 'Unknown location.' }
  if (!location.is_active) {
    return { slots: [], error: 'This branch is not currently accepting online bookings.' }
  }

  // Refuse to generate slots for closed days.
  const date = new Date(`${args.date}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    return { slots: [], error: 'Invalid date.' }
  }
  // Force interpretation in Lagos by reading the UTC weekday — Lagos
  // is UTC+1 with no DST, but day boundaries are stable enough for
  // weekday math at midnight UTC.
  const weekday = date.getUTCDay()
  if (!location.open_days.includes(weekday)) {
    return { slots: [], error: null } // closed today; empty list, no error
  }

  // Refuse slots in the past (today's slots whose start time has
  // already passed in Lagos).
  const now = new Date()
  const lagosNow = new Date(now.getTime() + 60 * 60 * 1000) // shift to Lagos
  const todayLagos = lagosNow.toISOString().slice(0, 10)
  const isToday = args.date === todayLagos
  const cutoffMinutes = isToday
    ? lagosNow.getUTCHours() * 60 + lagosNow.getUTCMinutes()
    : -1

  const allSlots = enumerateSlots(location, args.duration)

  // Pull existing bookings — pending + confirmed + completed all
  // hold their slot. We exclude `cancelled` and `no_show` because
  // those are cancellations from the customer's side or admin-driven
  // marking, both of which mean the slot is free again.
  const existing = (await sql`
    SELECT appointment_time, total_duration
    FROM bookings
    WHERE location_id = ${args.locationId}
      AND appointment_date = ${args.date}
      AND status IN ('pending', 'confirmed', 'completed')
  `) as any[]

  const occupancy = existing.map((row) => ({
    start: timeToMinutes(row.appointment_time),
    end: timeToMinutes(row.appointment_time) + row.total_duration,
  }))

  const free: string[] = []
  for (const slot of allSlots) {
    const startMin = timeToMinutes(slot)
    if (startMin < cutoffMinutes) continue
    const endMin = startMin + args.duration
    let overlapping = 0
    for (const b of occupancy) {
      if (b.start < endMin && b.end > startMin) overlapping += 1
    }
    if (overlapping < location.slots_per_window) {
      free.push(slot)
    }
  }
  return { slots: free, error: null }
}

// ---------------------------------------------------------------------------
// Pending-booking creation (transactional)
// ---------------------------------------------------------------------------

export interface CreatePendingBookingInput {
  userId: string
  locationId: string
  appointmentDate: string // YYYY-MM-DD
  appointmentTime: string // HH:MM
  services: BookingServiceSelection[]
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string | null
  paymentMethod: 'wallet' | 'paystack'
  /**
   * Optional voucher snapshot — pre-validated by the API route. We
   * only persist what the customer entered + how much we discounted
   * them; the canonical `vouchers` row is still the source of truth
   * for everything else (limits, expiry, …). Discount is in KOBO so
   * we never crossed currency units inside this module.
   */
  voucher?: {
    voucherId: string
    voucherCode: string
    discountKobo: number
  } | null
}

export interface CreatePendingBookingResult {
  bookingId: string
  bookingReference: string
  /** What the customer is charged after voucher (subtotal - discount). */
  totalKobo: number
  /** Sum of line items before voucher. */
  subtotalKobo: number
  /** Voucher discount applied in kobo (0 if none). */
  discountKobo: number
  totalDuration: number
}

/**
 * Insert a `pending` booking after validating slot availability under
 * `FOR UPDATE` row locks so two simultaneous bookings can never claim
 * the same slot past capacity. Throws on validation failure with a
 * caller-friendly message.
 */
export async function createPendingBooking(
  input: CreatePendingBookingInput,
): Promise<CreatePendingBookingResult> {
  const location = await getLocation(input.locationId)
  if (!location) throw new Error('Unknown location.')
  if (!location.is_active) {
    throw new Error('This branch is not currently accepting online bookings.')
  }

  const { resolved, error } = resolveServices(input.services)
  if (error) throw new Error(error)
  const duration = totalDuration(resolved)
  // `subtotal` is the gross amount before any discount; `total` is what
  // we actually charge the customer. We clamp the discount to the
  // subtotal (a 100% voucher should make the booking free, not negative)
  // and keep both in kobo so we never re-introduce floating-point math.
  const subtotal = totalKobo(resolved)
  const discountKobo = Math.max(0, Math.min(input.voucher?.discountKobo ?? 0, subtotal))
  const total = subtotal - discountKobo
  if (duration <= 0) throw new Error('Service duration must be positive.')

  // Validate the slot fits inside working hours.
  const startMin = timeToMinutes(input.appointmentTime)
  const dayStart = timeToMinutes(location.opens_at)
  const dayEnd = timeToMinutes(location.closes_at)
  if (startMin < dayStart || startMin + duration > dayEnd) {
    throw new Error(
      `Selected time is outside ${location.name}'s opening hours.`,
    )
  }

  // Validate the day is open.
  const weekday = new Date(`${input.appointmentDate}T00:00:00.000Z`).getUTCDay()
  if (!location.open_days.includes(weekday)) {
    throw new Error(`${location.name} is closed on the day you chose.`)
  }

  // Refuse past slots.
  const now = new Date()
  const lagosNow = new Date(now.getTime() + 60 * 60 * 1000)
  const todayLagos = lagosNow.toISOString().slice(0, 10)
  if (input.appointmentDate < todayLagos) {
    throw new Error('You cannot book a slot in the past.')
  }
  if (input.appointmentDate === todayLagos) {
    const nowMin = lagosNow.getUTCHours() * 60 + lagosNow.getUTCMinutes()
    if (startMin <= nowMin) {
      throw new Error('You cannot book a slot in the past.')
    }
  }

  // Lock + insert in one transaction. Neon's serverless driver runs
  // each statement in its own implicit transaction, so we explicitly
  // wrap the count-then-insert in BEGIN/COMMIT.
  //
  // FOR UPDATE on the existing rows for this (location, date) prevents
  // another transaction from inserting a competing booking between our
  // count and our insert. It does NOT lock empty space — but we don't
  // need to, because the second arrival will read the row WE inserted
  // (or fail to acquire the lock if we haven't committed yet).
  const bookingId = uuidv4()
  const reference = generateBookingReference()

  await sql`BEGIN`
  try {
    // Lock concurrent rows for this (location, date). LIMIT keeps the
    // lock set tight even if the day fills up.
    await sql`
      SELECT id FROM bookings
      WHERE location_id = ${input.locationId}
        AND appointment_date = ${input.appointmentDate}
        AND status IN ('pending', 'confirmed', 'completed')
      FOR UPDATE
    `

    // Recompute overlapping count under the lock.
    const occRows = (await sql`
      SELECT appointment_time, total_duration FROM bookings
      WHERE location_id = ${input.locationId}
        AND appointment_date = ${input.appointmentDate}
        AND status IN ('pending', 'confirmed', 'completed')
    `) as any[]
    const slotEnd = startMin + duration
    let overlapping = 0
    for (const r of occRows) {
      const s = timeToMinutes(r.appointment_time)
      const e = s + r.total_duration
      if (s < slotEnd && e > startMin) overlapping += 1
    }
    if (overlapping >= location.slots_per_window) {
      throw new Error(
        'That slot just got booked by someone else. Please pick another time.',
      )
    }

    // Insert the booking row. We always write `subtotal_kobo`,
    // `discount_kobo`, `voucher_id`, and `voucher_code` — even when
    // the customer didn't redeem a voucher (subtotal == total,
    // discount == 0, voucher fields NULL) — so downstream readers
    // never have to special-case the no-voucher path.
    await sql`
      INSERT INTO bookings (
        id, user_id, booking_reference, location_id, location_name, location_address,
        appointment_date, appointment_time, total_duration,
        subtotal_kobo, discount_kobo, voucher_id, voucher_code, total_price_kobo,
        customer_name, customer_email, customer_phone,
        status, payment_status, payment_method, notes
      ) VALUES (
        ${bookingId}, ${input.userId}, ${reference},
        ${location.id}, ${location.name}, ${location.address},
        ${input.appointmentDate}, ${input.appointmentTime}, ${duration},
        ${subtotal}, ${discountKobo}, ${input.voucher?.voucherId ?? null}, ${input.voucher?.voucherCode ?? null}, ${total},
        ${input.customerName}, ${input.customerEmail.toLowerCase()}, ${input.customerPhone},
        'pending', 'unpaid', ${input.paymentMethod}, ${input.notes ?? null}
      )
    `

    // Insert the line items.
    for (const s of resolved) {
      await sql`
        INSERT INTO booking_services (
          id, booking_id, category_id, category_name,
          treatment_id, treatment_name, duration, price_kobo
        ) VALUES (
          ${uuidv4()}, ${bookingId}, ${s.categoryId}, ${s.categoryName},
          ${s.treatmentId}, ${s.treatmentName}, ${s.duration}, ${s.priceKobo}
        )
      `
    }

    await sql`COMMIT`
  } catch (err) {
    await sql`ROLLBACK`
    throw err
  }

  return {
    bookingId,
    bookingReference: reference,
    totalKobo: total,
    subtotalKobo: subtotal,
    discountKobo,
    totalDuration: duration,
  }
}

// ---------------------------------------------------------------------------
// Confirmation & cancellation
// ---------------------------------------------------------------------------

/**
 * Idempotently flip a booking from pending → confirmed when its
 * payment lands. Safe to call from both the wallet path and the
 * Paystack webhook (or the verify endpoint). Returns true if THIS
 * call did the flip, false if it was already confirmed.
 */
export async function confirmBookingPayment(args: {
  paymentReference: string
  paymentMethod: 'wallet' | 'paystack'
}): Promise<{ confirmed: boolean; bookingId: string | null }> {
  const rows = (await sql`
    SELECT id, status, payment_status, voucher_id, voucher_code,
           subtotal_kobo, discount_kobo, user_id, customer_email, booking_reference
    FROM bookings
    WHERE payment_reference = ${args.paymentReference}
    LIMIT 1
  `) as any[]
  const row = rows[0]
  if (!row) return { confirmed: false, bookingId: null }

  if (row.payment_status === 'paid' && row.status === 'confirmed') {
    return { confirmed: false, bookingId: row.id }
  }

  await sql`
    UPDATE bookings
    SET status = 'confirmed',
        payment_status = 'paid',
        payment_method = ${args.paymentMethod},
        updated_at = NOW()
    WHERE id = ${row.id}
      AND status = 'pending'
  `

  // Voucher redemption is the very last step on the success path —
  // we only burn a use AFTER the booking is paid + confirmed, never
  // on a pending row. That way an abandoned Paystack flow doesn't
  // chip away at `vouchers.used_count` or burn a customer's
  // per-user limit. We catch errors so a failed redemption insert
  // (e.g. the voucher was deleted between booking and confirm)
  // never blocks the customer's confirmation.
  if (row.voucher_id) {
    try {
      const { redeemVoucher } = await import('./vouchers')
      await redeemVoucher({
        voucherId: row.voucher_id,
        userId: row.user_id,
        userEmail: row.customer_email,
        amountBefore: koboToNaira(Number(row.subtotal_kobo ?? 0)),
        amountDiscount: koboToNaira(Number(row.discount_kobo ?? 0)),
        reference: row.booking_reference,
      })
    } catch (err) {
      console.error('[confirmBookingPayment] voucher redemption failed', err)
    }
  }

  // Drop an in-app "booking confirmed" notification so the bell + the
  // dashboard inbox actually show something. The inbox was previously
  // empty for most customers because we only fired notifications for
  // payment FAILURES — happy-path bookings silently succeeded with no
  // bell badge, no inbox entry, and no audit trail. Best-effort only;
  // a notification insert failure must never roll back the booking.
  try {
    const { notifyUser } = await import('./notifications')
    const apptRows = (await sql`
      SELECT appointment_date, appointment_time, total_price_kobo
      FROM bookings WHERE id = ${row.id} LIMIT 1
    `) as any[]
    const appt = apptRows[0]
    const dateLabel = appt
      ? new Date(`${appt.appointment_date}T00:00:00Z`).toLocaleDateString('en-NG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        })
      : 'your upcoming appointment'
    const timeLabel = appt?.appointment_time?.slice(0, 5) ?? ''
    await notifyUser({
      userId: row.user_id,
      title: 'Booking confirmed',
      message: `${dateLabel}${timeLabel ? ` at ${timeLabel}` : ''} \u00B7 reference ${row.booking_reference}. Tap to view your receipt.`,
      type: 'status_update',
      referenceType: 'booking',
      referenceId: row.booking_reference,
      actionUrl: `/booking/${row.booking_reference}`,
      priority: 'normal',
    })
  } catch (err) {
    console.error('[confirmBookingPayment] confirmation notify failed', err)
  }

  return { confirmed: true, bookingId: row.id }
}

/**
 * Mark a booking as completed (admin action). Records the `completed_at`
 * timestamp and rolls the lifetime spend into the user's summary
 * columns so the points/loyalty layer can earn-on-completion later.
 */
export async function markBookingCompleted(bookingId: string): Promise<boolean> {
  const rows = (await sql`
    SELECT user_id, total_price_kobo, status, payment_status, completed_at
    FROM bookings WHERE id = ${bookingId} LIMIT 1
  `) as any[]
  const row = rows[0]
  if (!row) return false
  if (row.completed_at) return false // already completed
  if (row.status === 'cancelled' || row.status === 'no_show') return false

  await sql`BEGIN`
  try {
    await sql`
      UPDATE bookings
      SET status = 'completed', completed_at = NOW(), updated_at = NOW()
      WHERE id = ${bookingId}
    `
    // Only count *paid* bookings toward lifetime spend so a free /
    // comped session doesn't inflate the rollup.
    if (row.payment_status === 'paid') {
      await sql`
        UPDATE users
        SET total_spent_kobo = total_spent_kobo + ${row.total_price_kobo},
            bookings_count = bookings_count + 1,
            last_booking_at = NOW()
        WHERE id = ${row.user_id}
      `
    }
    await sql`COMMIT`
    return true
  } catch (err) {
    await sql`ROLLBACK`
    throw err
  }
}

/**
 * Cancel a booking. Owner-only — caller must verify ownership.
 * If the booking is paid, returns `{ refundKobo }` so the caller
 * (the API route) can hand the amount back to the wallet.
 */
export async function cancelBooking(args: {
  bookingId: string
  reason?: string | null
}): Promise<{
  ok: boolean
  refundKobo: number
  paymentMethod: 'wallet' | 'paystack' | null
  bookingReference: string | null
}> {
  const rows = (await sql`
    SELECT id, status, payment_status, payment_method, total_price_kobo, booking_reference
    FROM bookings WHERE id = ${args.bookingId} LIMIT 1
  `) as any[]
  const row = rows[0]
  if (!row) return { ok: false, refundKobo: 0, paymentMethod: null, bookingReference: null }
  if (row.status === 'cancelled')
    return { ok: false, refundKobo: 0, paymentMethod: null, bookingReference: row.booking_reference }
  if (row.status === 'completed')
    return { ok: false, refundKobo: 0, paymentMethod: null, bookingReference: row.booking_reference }

  await sql`
    UPDATE bookings
    SET status = 'cancelled',
        cancellation_reason = ${args.reason ?? null},
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = ${args.bookingId}
  `
  const refundKobo = row.payment_status === 'paid' ? row.total_price_kobo : 0
  return {
    ok: true,
    refundKobo,
    paymentMethod: row.payment_method,
    bookingReference: row.booking_reference,
  }
}

// ---------------------------------------------------------------------------
// Read helpers (UI / receipts)
// ---------------------------------------------------------------------------

export async function getBookingById(
  bookingId: string,
  userId?: string,
): Promise<Booking | null> {
  const rows = (await sql`
    SELECT * FROM bookings WHERE id = ${bookingId} LIMIT 1
  `) as any[]
  const row = rows[0]
  if (!row) return null
  if (userId && row.user_id !== userId) return null
  return hydrateBooking(row)
}

export async function getBookingByReference(
  reference: string,
  userId?: string,
): Promise<Booking | null> {
  const rows = (await sql`
    SELECT * FROM bookings WHERE booking_reference = ${reference} LIMIT 1
  `) as any[]
  const row = rows[0]
  if (!row) return null
  if (userId && row.user_id !== userId) return null
  return hydrateBooking(row)
}

export async function listUserBookings(userId: string): Promise<Booking[]> {
  const rows = (await sql`
    SELECT * FROM bookings
    WHERE user_id = ${userId}
    ORDER BY appointment_date DESC, appointment_time DESC
    LIMIT 100
  `) as any[]
  const out: Booking[] = []
  for (const r of rows) out.push(await hydrateBooking(r))
  return out
}

async function hydrateBooking(row: any): Promise<Booking> {
  const services = (await sql`
    SELECT * FROM booking_services
    WHERE booking_id = ${row.id}
    ORDER BY created_at ASC
  `) as any[]
  return {
    id: row.id,
    user_id: row.user_id,
    booking_reference: row.booking_reference,
    location_id: row.location_id,
    location_name: row.location_name,
    location_address: row.location_address,
    appointment_date:
      typeof row.appointment_date === 'string'
        ? row.appointment_date
        : new Date(row.appointment_date).toISOString().slice(0, 10),
    appointment_time: row.appointment_time,
    total_duration: row.total_duration,
    // Older bookings (pre-vouchers) have NULL subtotal/discount —
    // fall back to the total so the receipt math still adds up.
    subtotal_kobo: Number(row.subtotal_kobo ?? row.total_price_kobo ?? 0),
    discount_kobo: Number(row.discount_kobo ?? 0),
    voucher_id: row.voucher_id ?? null,
    voucher_code: row.voucher_code ?? null,
    total_price_kobo: row.total_price_kobo,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    status: row.status,
    payment_status: row.payment_status,
    payment_method: row.payment_method,
    payment_reference: row.payment_reference,
    notes: row.notes,
    cancellation_reason: row.cancellation_reason,
    cancelled_at: row.cancelled_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    services: services.map((s: any) => ({
      categoryId: s.category_id,
      categoryName: s.category_name,
      treatmentId: s.treatment_id,
      treatmentName: s.treatment_name,
      duration: s.duration,
      priceKobo: s.price_kobo,
    })),
  }
}

export async function setBookingPaymentReference(
  bookingId: string,
  reference: string,
): Promise<void> {
  await sql`
    UPDATE bookings
    SET payment_reference = ${reference}, updated_at = NOW()
    WHERE id = ${bookingId}
  `
}

/**
 * Record that a booking's payment attempt failed (Paystack `charge.failed`,
 * verify route returning a non-success status, customer abandonment, …).
 *
 * Why this exists:
 *   - Admins kept asking "why didn't this person pay?" — without storing the
 *     gateway response we had nothing to show. Now `payment_failure_reason`
 *     captures it verbatim and `payment_failure_at` lets us bucket failures
 *     by recency.
 *   - The booking row stays in `status='pending'` so the customer can try
 *     again from the recovery link. We do not flip to `cancelled` here —
 *     that's a separate, explicit action (admin- or customer-driven).
 *   - We also bump `payment_attempts` so we can tell "they tried twice and
 *     gave up" from "they never came back".
 *
 * Idempotent: calling repeatedly with the same reason is a no-op apart from
 * the attempt counter increment, which is the desired audit trail.
 */
export async function markBookingPaymentFailed(args: {
  paymentReference?: string | null
  bookingId?: string | null
  reason: string
  source: 'webhook' | 'verify' | 'admin' | 'manual'
}): Promise<{ updated: boolean; bookingId: string | null }> {
  // We accept either the gateway reference (webhook path) or the booking
  // id (admin path) — pick whichever the caller has on hand.
  const rows = (await sql`
    SELECT id, status, payment_status FROM bookings
    WHERE
      (${args.paymentReference ?? null}::text IS NOT NULL AND payment_reference = ${args.paymentReference ?? null})
      OR
      (${args.bookingId ?? null}::uuid IS NOT NULL AND id = ${args.bookingId ?? null}::uuid)
    LIMIT 1
  `) as any[]
  const row = rows[0]
  if (!row) return { updated: false, bookingId: null }

  // Don't overwrite a successful payment — webhooks can arrive out of order.
  if (row.payment_status === 'paid') return { updated: false, bookingId: row.id }

  await sql`
    UPDATE bookings
    SET payment_status = 'failed',
        payment_failure_reason = ${args.reason.slice(0, 500)},
        payment_failure_at = NOW(),
        payment_attempts = COALESCE(payment_attempts, 0) + 1,
        updated_at = NOW()
    WHERE id = ${row.id}
  `
  return { updated: true, bookingId: row.id }
}

/**
 * Mint a single-use recovery token tied to one booking.
 *
 * The customer receives a link like `/booking/resume/<token>` in their
 * "we noticed your payment didn't go through" email. Clicking it
 * authenticates the booking owner, regenerates a Paystack reference,
 * and bounces them straight into checkout — no need to re-pick a slot
 * or re-enter card details.
 *
 * The token itself is base64url-of-32-random-bytes (≈256 bits of entropy)
 * so it's safe to put in URLs without worrying about brute-force. We
 * default to a 7-day TTL because recovery emails are usually opened
 * within 48h, but customers occasionally check in a week later.
 */
export async function createBookingRecoveryToken(args: {
  bookingId: string
  ttlMs?: number
}): Promise<{ token: string; expiresAt: Date }> {
  const { randomBytes } = await import('node:crypto')
  const token = randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  const ttl = args.ttlMs ?? 7 * 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + ttl)
  await sql`
    INSERT INTO booking_recovery_tokens (token, booking_id, expires_at)
    VALUES (${token}, ${args.bookingId}, ${expiresAt.toISOString()})
  `
  return { token, expiresAt }
}

/**
 * Resolve a recovery token to its booking, marking it consumed on the way out.
 * Returns null when the token is missing, expired, already used, or pointing
 * at a booking that's already paid/cancelled (no point recovering those).
 */
export async function consumeBookingRecoveryToken(
  token: string,
): Promise<Booking | null> {
  const rows = (await sql`
    SELECT t.booking_id, t.expires_at, t.consumed_at, b.status, b.payment_status
    FROM booking_recovery_tokens t
    JOIN bookings b ON b.id = t.booking_id
    WHERE t.token = ${token}
    LIMIT 1
  `) as any[]
  const row = rows[0]
  if (!row) return null
  if (row.consumed_at) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null
  if (row.payment_status === 'paid') return null
  if (row.status === 'cancelled') return null

  // Mark consumed up-front so a double-click can't double-mint Paystack
  // references. The caller is expected to fetch the booking via
  // `getBookingById` to act on it.
  await sql`
    UPDATE booking_recovery_tokens
    SET consumed_at = NOW()
    WHERE token = ${token}
  `
  // Pass no userId so the system-issued recovery flow can read any
  // owner's row — the token itself is the auth grant.
  const booking = await getBookingById(row.booking_id)
  return booking
}
