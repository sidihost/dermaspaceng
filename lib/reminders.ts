// ---------------------------------------------------------------------------
// lib/reminders.ts
//
// Per-event QStash reminders for bookings, consultations, and vouchers.
//
// Why per-event, not a sweep cron?
// --------------------------------
// We already run a sweep cron for broadcasts and abandoned-payments —
// both naturally batch-shaped. Booking / consultation / voucher
// reminders are different:
//   * They fire at a row-specific instant ("24h before THIS booking")
//   * They MUST be cancellable when the underlying row changes
//     (booking cancelled, consultation rescheduled, voucher redeemed)
// Sweep crons make both points awkward — you'd need a per-minute scan
// just to catch reminders that became due in the last 60s, and a
// "was this already sent?" flag on every row. QStash one-off messages
// give us exact-time delivery + a stable messageId we can cancel.
//
// All three event types share the same single inbound dispatch
// endpoint (/api/internal/reminders/dispatch), routed by `kind`. Each
// row stores its outstanding messageId in a dedicated column added by
// scripts/213-per-event-reminders.sql.
//
// Fail-soft contract
// ------------------
// Every helper here is wrapped in try/catch. A QStash outage or a
// missing column (migration not yet applied) MUST NOT break the
// underlying user action — saving a consultation must still succeed
// even if we couldn't enqueue its reminder. We log a warning and
// move on; the user just won't get the nudge for this one row.
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'
import { getQStash, cancelMessage } from '@/lib/qstash'

// We re-derive the public base URL here instead of importing the
// (private) `publicBaseUrl()` from lib/qstash.ts. Keeps this file's
// surface contained without changing the qstash.ts module's public API.
function publicBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://www.dermaspaceng.com'
}

export type ReminderKind =
  | 'booking-24h'
  | 'consultation-1h'
  | 'voucher-expiry-eve'

type SchedulePayload = {
  kind: ReminderKind
  id: string
}

const DISPATCH_PATH = '/api/internal/reminders/dispatch'

// ---------------------------------------------------------------------------
// Internal: enqueue + persist
// ---------------------------------------------------------------------------

async function enqueue({
  kind,
  id,
  fireAt,
}: SchedulePayload & { fireAt: Date }): Promise<string | null> {
  // Refuse to schedule into the past — QStash would reject it anyway,
  // and this saves a network call when somebody books for "today, 30
  // minutes from now" (the booking 24h reminder is already moot).
  if (fireAt.getTime() <= Date.now()) return null

  try {
    const qstash = getQStash()
    const res = await qstash.publishJSON({
      url: `${publicBaseUrl()}${DISPATCH_PATH}`,
      body: { kind, id } satisfies SchedulePayload,
      notBefore: Math.floor(fireAt.getTime() / 1000),
      // The dispatch handler is idempotent (checks reminder_sent_at),
      // so a few extra retries on transient 5xx is fine.
      retries: 3,
    })
    return res.messageId
  } catch (err) {
    console.warn(`[reminders] enqueue ${kind}/${id} failed:`, err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Bookings — 24 hours before appointment
// ---------------------------------------------------------------------------

/**
 * Combine a `DATE` column and a `VARCHAR(20)` time column ("10:30 AM" /
 * "14:00") into a real Date in Africa/Lagos (UTC+1, no DST). We do this
 * by parsing locally and subtracting 1h to get UTC. Returns null if the
 * time string can't be parsed — the caller will then skip enqueueing.
 */
export function combineLagosDateTime(
  date: string | Date,
  time: string,
): Date | null {
  const dateStr =
    typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10)
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return null
  let hour = parseInt(m[1], 10)
  const minute = parseInt(m[2], 10)
  const meridiem = m[3]?.toUpperCase()
  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null
  // Lagos is UTC+1 year-round. A "10:30 AM Lagos" appointment is
  // 09:30 UTC.
  const iso = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
  const lagosUtc = new Date(iso)
  return new Date(lagosUtc.getTime() - 60 * 60 * 1000)
}

export async function scheduleBookingReminder(
  bookingId: string,
  appointmentDate: string | Date,
  appointmentTime: string,
): Promise<void> {
  const at = combineLagosDateTime(appointmentDate, appointmentTime)
  if (!at) return
  const fireAt = new Date(at.getTime() - 24 * 60 * 60 * 1000)
  const messageId = await enqueue({
    kind: 'booking-24h',
    id: bookingId,
    fireAt,
  })
  if (!messageId) return
  try {
    await sql`
      UPDATE bookings SET reminder_qstash_id = ${messageId}
      WHERE id = ${bookingId}
    `
  } catch (err) {
    // Most likely the migration in scripts/213 hasn't been applied yet.
    // We log so it's visible in production logs but never throw.
    console.warn('[reminders] persist booking reminder id failed:', err)
  }
}

export async function cancelBookingReminder(bookingId: string): Promise<void> {
  try {
    const rows = (await sql`
      SELECT reminder_qstash_id FROM bookings WHERE id = ${bookingId}
    `) as { reminder_qstash_id: string | null }[]
    const id = rows[0]?.reminder_qstash_id
    if (!id) return
    await cancelMessage(id)
    await sql`
      UPDATE bookings SET reminder_qstash_id = NULL WHERE id = ${bookingId}
    `
  } catch (err) {
    console.warn('[reminders] cancel booking reminder failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Consultations — 1 hour before appointment
// ---------------------------------------------------------------------------

export async function scheduleConsultationReminder(
  consultationId: string,
  appointmentDate: string | Date,
  appointmentTime: string,
): Promise<void> {
  const at = combineLagosDateTime(appointmentDate, appointmentTime)
  if (!at) return
  const fireAt = new Date(at.getTime() - 60 * 60 * 1000)
  const messageId = await enqueue({
    kind: 'consultation-1h',
    id: consultationId,
    fireAt,
  })
  if (!messageId) return
  try {
    await sql`
      UPDATE consultations SET reminder_qstash_id = ${messageId}
      WHERE id = ${consultationId}
    `
  } catch (err) {
    console.warn('[reminders] persist consultation reminder id failed:', err)
  }
}

export async function cancelConsultationReminder(
  consultationId: string,
): Promise<void> {
  try {
    const rows = (await sql`
      SELECT reminder_qstash_id FROM consultations WHERE id = ${consultationId}
    `) as { reminder_qstash_id: string | null }[]
    const id = rows[0]?.reminder_qstash_id
    if (!id) return
    await cancelMessage(id)
    await sql`
      UPDATE consultations SET reminder_qstash_id = NULL WHERE id = ${consultationId}
    `
  } catch (err) {
    console.warn('[reminders] cancel consultation reminder failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Vouchers — 24 hours before expiry
// ---------------------------------------------------------------------------

export async function scheduleVoucherExpiry(
  voucherId: string,
  expiresAt: string | Date | null | undefined,
): Promise<void> {
  if (!expiresAt) return
  const exp = new Date(expiresAt)
  if (Number.isNaN(exp.getTime())) return
  // Fire 24h before expiry. Skipping vouchers that already expire in
  // less than 24h is intentional — sending an "expires tomorrow" nudge
  // for something that expires in 3 hours is the wrong message.
  const fireAt = new Date(exp.getTime() - 24 * 60 * 60 * 1000)
  const messageId = await enqueue({
    kind: 'voucher-expiry-eve',
    id: voucherId,
    fireAt,
  })
  if (!messageId) return
  try {
    await sql`
      UPDATE vouchers SET expiry_qstash_id = ${messageId}
      WHERE id = ${voucherId}
    `
  } catch (err) {
    console.warn('[reminders] persist voucher expiry id failed:', err)
  }
}

export async function cancelVoucherExpiry(voucherId: string): Promise<void> {
  try {
    const rows = (await sql`
      SELECT expiry_qstash_id FROM vouchers WHERE id = ${voucherId}
    `) as { expiry_qstash_id: string | null }[]
    const id = rows[0]?.expiry_qstash_id
    if (!id) return
    await cancelMessage(id)
    await sql`
      UPDATE vouchers SET expiry_qstash_id = NULL WHERE id = ${voucherId}
    `
  } catch (err) {
    console.warn('[reminders] cancel voucher expiry failed:', err)
  }
}

/**
 * Reschedule the expiry reminder for a voucher whose expires_at just
 * changed. Cancels any existing message first to avoid duplicates.
 */
export async function rescheduleVoucherExpiry(
  voucherId: string,
  expiresAt: string | Date | null | undefined,
): Promise<void> {
  await cancelVoucherExpiry(voucherId)
  if (expiresAt) await scheduleVoucherExpiry(voucherId, expiresAt)
}
