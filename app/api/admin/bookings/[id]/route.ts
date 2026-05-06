import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// ---------------------------------------------------------------------------
// GET    /api/admin/bookings/[id]  → full booking detail (admin scope)
// PATCH  /api/admin/bookings/[id]  → update status / notes
// ---------------------------------------------------------------------------
// Admin-scope counterpart to /api/bookings/[id]. Skips the ownership
// check (admins see every booking) and joins the user row so the
// detail page can render the customer's profile alongside.
//
// Status transitions are validated against the same state-machine the
// public flow uses:
//   pending   → confirmed | cancelled | no_show
//   confirmed → completed | cancelled | no_show
//   completed → (terminal)
//   cancelled → (terminal)
//   no_show   → (terminal)
// ---------------------------------------------------------------------------

interface Params {
  params: Promise<{ id: string }>
}

const ALLOWED_NEXT: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
}

async function loadFullBooking(id: string) {
  // Accept either UUID or DS-XXXXXXX reference so the same URL can be
  // shared from a customer's email link.
  const rows = id.startsWith('DS-')
    ? ((await sql`
        SELECT b.*,
               u.role        AS user_role,
               u.first_name  AS user_first_name,
               u.last_name   AS user_last_name,
               u.email       AS user_email,
               u.phone       AS user_phone,
               u.avatar_url  AS user_avatar_url,
               u.created_at  AS user_created_at,
               COALESCE(u.bookings_count, 0)::int AS user_bookings_count,
               COALESCE(u.total_spent_kobo, 0)::bigint AS user_total_spent_kobo
          FROM bookings b
          LEFT JOIN users u ON u.id = b.user_id
         WHERE b.booking_reference = ${id}
         LIMIT 1
      `) as any[])
    : ((await sql`
        SELECT b.*,
               u.role        AS user_role,
               u.first_name  AS user_first_name,
               u.last_name   AS user_last_name,
               u.email       AS user_email,
               u.phone       AS user_phone,
               u.avatar_url  AS user_avatar_url,
               u.created_at  AS user_created_at,
               COALESCE(u.bookings_count, 0)::int AS user_bookings_count,
               COALESCE(u.total_spent_kobo, 0)::bigint AS user_total_spent_kobo
          FROM bookings b
          LEFT JOIN users u ON u.id = b.user_id
         WHERE b.id = ${id}
         LIMIT 1
      `) as any[])

  const row = rows[0]
  if (!row) return null

  const services = (await sql`
    SELECT * FROM booking_services
     WHERE booking_id = ${row.id}
     ORDER BY created_at ASC
  `) as any[]

  return {
    id: row.id,
    user_id: row.user_id,
    user: {
      role: row.user_role,
      first_name: row.user_first_name,
      last_name: row.user_last_name,
      email: row.user_email,
      phone: row.user_phone,
      avatar_url: row.user_avatar_url,
      created_at: row.user_created_at,
      bookings_count: Number(row.user_bookings_count || 0),
      total_spent_kobo: Number(row.user_total_spent_kobo || 0),
    },
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

export async function GET(_req: Request, { params }: Params) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  void admin

  const { id } = await params
  const booking = await loadFullBooking(id)
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }
  return NextResponse.json({ booking })
}

export async function PATCH(req: Request, { params }: Params) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  let body: {
    action?: 'set_status' | 'set_notes' | 'set_payment_status'
    status?: string
    payment_status?: string
    notes?: string
    reason?: string
  } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const existing = await loadFullBooking(id)
  if (!existing) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  if (body.action === 'set_status') {
    const next = String(body.status || '')
    const allowed = ALLOWED_NEXT[existing.status] ?? []
    if (!allowed.includes(next)) {
      return NextResponse.json(
        { error: `Cannot change status from ${existing.status} to ${next}.` },
        { status: 400 },
      )
    }
    if (next === 'cancelled') {
      await sql`
        UPDATE bookings
           SET status = 'cancelled',
               cancellation_reason = ${body.reason ?? null},
               cancelled_at = NOW(),
               updated_at = NOW()
         WHERE id = ${existing.id}
      `
    } else if (next === 'completed') {
      await sql`
        UPDATE bookings
           SET status = 'completed',
               completed_at = NOW(),
               updated_at = NOW()
         WHERE id = ${existing.id}
      `
      // Roll the spend into the user's lifetime totals so the loyalty
      // counters stay in sync with the public completion path
      // (lib/booking.markBookingCompleted does the same).
      if (existing.payment_status === 'paid' && existing.user_id) {
        try {
          await sql`
            UPDATE users
               SET total_spent_kobo = COALESCE(total_spent_kobo, 0) + ${existing.total_price_kobo},
                   bookings_count   = COALESCE(bookings_count, 0) + 1,
                   last_booking_at  = NOW()
             WHERE id = ${existing.user_id}
          `
        } catch {
          /* lifetime rollup is best-effort */
        }
      }
    } else {
      await sql`
        UPDATE bookings
           SET status = ${next},
               updated_at = NOW()
         WHERE id = ${existing.id}
      `
    }
  } else if (body.action === 'set_notes') {
    await sql`
      UPDATE bookings
         SET notes = ${(body.notes ?? '').slice(0, 4000)},
             updated_at = NOW()
       WHERE id = ${existing.id}
    `
  } else if (body.action === 'set_payment_status') {
    const next = String(body.payment_status || '')
    if (!['unpaid', 'paid', 'refunded', 'failed'].includes(next)) {
      return NextResponse.json(
        { error: 'Invalid payment status.' },
        { status: 400 },
      )
    }
    await sql`
      UPDATE bookings
         SET payment_status = ${next},
             updated_at = NOW()
       WHERE id = ${existing.id}
    `
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }

  // Activity log so the admin trail is auditable. Best-effort.
  try {
    await sql`
      INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
      VALUES (
        ${admin.id},
        ${`booking_${body.action}`},
        'booking',
        ${existing.id},
        ${'Admin updated booking ' + existing.booking_reference}
      )
    `
  } catch {
    /* activity log failure must not block the mutation */
  }

  const updated = await loadFullBooking(existing.id)
  return NextResponse.json({ booking: updated })
}
