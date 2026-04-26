// ---------------------------------------------------------------------------
// /api/internal/reminders/dispatch
//
// Single inbound endpoint for every per-event reminder QStash sends us
// (booking 24h-before, consultation 1h-before, voucher expiry-eve).
//
// Why one endpoint, not three?
//   * The auth + signature dance is identical across kinds — keeping it
//     in one file means there's exactly one place that calls
//     verifyQStash, exactly one place that interprets the body shape,
//     exactly one place to debug.
//   * The work itself is just "load row, validate row is still
//     reminder-worthy, send email, mark sent" — also identical.
//
// Idempotency
//   * Each kind sets reminder_sent_at (or expiry_reminder_sent_at) to
//     NOW() before it returns. If QStash redelivers (e.g. our edge
//     network hiccupped during the response), the second invocation
//     short-circuits on the SELECT.
//   * If the underlying row has been cancelled / redeemed / deleted
//     since we scheduled, we no-op silently — that's the whole point
//     of cancellation hooks calling cancelMessage(), but races and
//     missing cancel hooks shouldn't cause spurious emails.
//
// Failure mode
//   * On unexpected error we return 500 so QStash retries with backoff.
//     Up to 3 retries (set on the publishJSON call), then it gives up.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { verifyQStash } from '@/lib/qstash'
import {
  sendBookingReminder,
  sendConsultationReminder,
  sendVoucherExpiryReminder,
} from '@/lib/email'

export const dynamic = 'force-dynamic'

const PayloadSchema = z.object({
  kind: z.enum(['booking-24h', 'consultation-1h', 'voucher-expiry-eve']),
  id: z.string().min(1),
})

export async function POST(request: NextRequest) {
  // Read the raw body BEFORE parsing JSON — the QStash signature is
  // computed against the exact bytes we received.
  const rawBody = await request.text()
  const ok = await verifyQStash(request, rawBody)
  if (!ok) {
    return NextResponse.json(
      { error: 'Invalid QStash signature' },
      { status: 401 },
    )
  }

  let payload: z.infer<typeof PayloadSchema>
  try {
    payload = PayloadSchema.parse(JSON.parse(rawBody))
  } catch (err) {
    // Bad payload is a permanent failure — return 200 so QStash stops
    // retrying. Logging it loudly because this should never happen in
    // practice (only we publish to this URL).
    console.error('[reminders/dispatch] malformed payload:', err, rawBody)
    return NextResponse.json({ ok: true, ignored: 'malformed' })
  }

  try {
    switch (payload.kind) {
      case 'booking-24h':
        await dispatchBookingReminder(payload.id)
        break
      case 'consultation-1h':
        await dispatchConsultationReminder(payload.id)
        break
      case 'voucher-expiry-eve':
        await dispatchVoucherExpiry(payload.id)
        break
    }
    return NextResponse.json({ ok: true, kind: payload.kind })
  } catch (err) {
    console.error('[reminders/dispatch]', payload.kind, payload.id, err)
    return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Booking — 24h before appointment
// ---------------------------------------------------------------------------

async function dispatchBookingReminder(bookingId: string): Promise<void> {
  // Pull everything we need in a single round-trip. We aggregate the
  // service names off booking_services the same way the rest of the
  // app does ("Hydra Facial, Brazilian Wax").
  const rows = (await sql`
    SELECT
      b.id, b.booking_reference, b.location_name, b.appointment_date,
      b.appointment_time, b.status, b.reminder_sent_at,
      u.email, u.first_name,
      COALESCE(
        (SELECT string_agg(bs.treatment_name, ', ' ORDER BY bs.created_at)
         FROM booking_services bs WHERE bs.booking_id = b.id),
        'Treatment'
      ) AS service
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.id = ${bookingId}
    LIMIT 1
  `) as any[]

  const row = rows[0]
  if (!row) return // Booking was deleted — nothing to do.
  if (row.reminder_sent_at) return // Already sent — QStash retry.
  if (row.status === 'cancelled' || row.status === 'no_show') return
  // Belt-and-braces: refuse to send a "tomorrow" reminder for an
  // appointment that has already happened.
  const apptDate = new Date(row.appointment_date)
  if (apptDate.getTime() + 24 * 60 * 60 * 1000 < Date.now()) return

  const formattedDate = new Date(row.appointment_date).toLocaleDateString(
    'en-NG',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )

  await sendBookingReminder({
    email: row.email,
    firstName: row.first_name || 'there',
    service: row.service,
    location: row.location_name,
    date: formattedDate,
    time: row.appointment_time,
    bookingReference: row.booking_reference,
  })

  // Mark sent + null the qstash id so the cancel hooks know there's
  // nothing left to cancel.
  await sql`
    UPDATE bookings
    SET reminder_sent_at = NOW(), reminder_qstash_id = NULL
    WHERE id = ${bookingId}
  `
}

// ---------------------------------------------------------------------------
// Consultation — 1h before appointment
// ---------------------------------------------------------------------------

async function dispatchConsultationReminder(
  consultationId: string,
): Promise<void> {
  // Consultations table is anonymous-friendly: email + first_name live
  // directly on the row, no users join required.
  const rows = (await sql`
    SELECT
      id, first_name, email, location, appointment_date, appointment_time,
      status, reminder_sent_at
    FROM consultations
    WHERE id = ${consultationId}
    LIMIT 1
  `) as any[]

  const row = rows[0]
  if (!row) return
  if (row.reminder_sent_at) return
  // 'cancelled' is the only consultations status we treat as "skip".
  // 'pending' is fine: even if admin hasn't formally confirmed, the
  // user proposed this slot themselves and is expecting it.
  if (row.status === 'cancelled') return

  // Map slug → display name the same way /api/consultation does.
  const locationNames: Record<string, string> = {
    vi: 'Victoria Island - 237b Muri Okunola St',
    ikoyi: 'Ikoyi - 44A, Awolowo Road',
  }
  const formattedDate = new Date(row.appointment_date).toLocaleDateString(
    'en-NG',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )

  await sendConsultationReminder({
    email: row.email,
    firstName: row.first_name || 'there',
    location: locationNames[row.location] || row.location,
    date: formattedDate,
    time: row.appointment_time,
  })

  await sql`
    UPDATE consultations
    SET reminder_sent_at = NOW(), reminder_qstash_id = NULL
    WHERE id = ${consultationId}
  `
}

// ---------------------------------------------------------------------------
// Voucher — 24h before expires_at
// ---------------------------------------------------------------------------

async function dispatchVoucherExpiry(voucherId: string): Promise<void> {
  // Voucher reminders are a bit different from booking/consultation:
  // a voucher isn't tied to a single user, it's a code anyone might
  // redeem. We send the reminder to every user who has redeemed THIS
  // voucher type but never claimed the discount yet — wait, that's
  // a different thing. For now we treat the reminder as informational
  // and email the voucher's creator (admin) so they can announce it,
  // OR — better — to anyone who has the voucher pinned to their
  // account via voucher_redemptions. We keep it simple: send a single
  // courtesy email to the voucher's creator (an admin) so they can
  // decide whether to broadcast. If you want per-user expiry nudges,
  // wire that into the user-facing voucher save flow later.
  const rows = (await sql`
    SELECT
      v.id, v.code, v.label, v.description, v.expires_at, v.is_active,
      v.used_count, v.max_uses, v.expiry_reminder_sent_at, v.created_by,
      u.email AS creator_email, u.first_name AS creator_first_name
    FROM vouchers v
    LEFT JOIN users u ON u.id = v.created_by
    WHERE v.id = ${voucherId}
    LIMIT 1
  `) as any[]

  const row = rows[0]
  if (!row) return
  if (row.expiry_reminder_sent_at) return
  if (!row.is_active) return
  if (!row.expires_at) return
  // Don't bother nudging about a voucher that's already been used up.
  if (row.max_uses != null && row.used_count >= row.max_uses) return
  if (!row.creator_email) return // Admin was deleted — drop silently.

  const expiresAtFormatted = new Date(row.expires_at).toLocaleDateString(
    'en-NG',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )

  await sendVoucherExpiryReminder({
    email: row.creator_email,
    firstName: row.creator_first_name || 'there',
    code: row.code,
    label: row.label,
    description: row.description,
    expiresAtFormatted,
  })

  await sql`
    UPDATE vouchers
    SET expiry_reminder_sent_at = NOW(), expiry_qstash_id = NULL
    WHERE id = ${voucherId}
  `
}
