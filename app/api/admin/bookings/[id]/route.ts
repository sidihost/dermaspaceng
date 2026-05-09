import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { notifyUser } from '@/lib/notifications'
import { invalidateAfterBookingChange } from '@/lib/stats-cache'

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

function formatLongDateForNotice(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

async function loadFullBooking(id: string) {
  // Accept either UUID or DS-XXXXXXX reference so the same URL can be
  // shared from a customer's email link.
  // We also LEFT JOIN the assigned staff (if any) so the detail page
  // can render a "currently assigned to" chip without a second
  // round-trip. The staff_booking_access table is a many-to-many
  // shortcut for "this staff was given explicit access" — but the
  // primary single-staff assignment lives on bookings.assigned_staff_id.
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
               COALESCE(u.total_spent_kobo, 0)::bigint AS user_total_spent_kobo,
               s.first_name  AS staff_first_name,
               s.last_name   AS staff_last_name,
               s.email       AS staff_email,
               s.avatar_url  AS staff_avatar_url
          FROM bookings b
          LEFT JOIN users u ON u.id = b.user_id
          LEFT JOIN users s ON s.id = b.assigned_staff_id
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
               COALESCE(u.total_spent_kobo, 0)::bigint AS user_total_spent_kobo,
               s.first_name  AS staff_first_name,
               s.last_name   AS staff_last_name,
               s.email       AS staff_email,
               s.avatar_url  AS staff_avatar_url
          FROM bookings b
          LEFT JOIN users u ON u.id = b.user_id
          LEFT JOIN users s ON s.id = b.assigned_staff_id
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
    // Single primary assignment + override price. The detail page
    // surfaces both: assigning a staff member also auto-grants them
    // access via the staff_booking_access shortcut table, and the
    // price override (if set) takes precedence over the per-service
    // sum when computing what the customer actually pays.
    assigned_staff_id: row.assigned_staff_id ?? null,
    assigned_staff: row.assigned_staff_id
      ? {
          id: row.assigned_staff_id,
          first_name: row.staff_first_name,
          last_name: row.staff_last_name,
          email: row.staff_email,
          avatar_url: row.staff_avatar_url,
        }
      : null,
    price_override_kobo:
      row.price_override_kobo === null || row.price_override_kobo === undefined
        ? null
        : Number(row.price_override_kobo),
    price_override_reason: row.price_override_reason ?? null,
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
    action?:
      | 'set_status'
      | 'set_notes'
      | 'set_payment_status'
      | 'assign_staff'
      | 'set_price_override'
      | 'grant_staff_access'
      | 'revoke_staff_access'
    status?: string
    payment_status?: string
    notes?: string
    reason?: string
    staff_id?: string | null
    price_kobo?: number | null
    can_edit?: boolean
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
  } else if (body.action === 'assign_staff') {
    // Assign (or unassign with null) a primary staff member to the
    // booking. Also mirrors the row into staff_booking_access so the
    // staff dashboard's "my bookings" query is a single index hit.
    const staffId = body.staff_id ? String(body.staff_id) : null
    if (staffId) {
      // Verify the user exists and is a staff/admin role to avoid
      // accidentally assigning a customer.
      const staffCheck = (await sql`
        SELECT id FROM users
         WHERE id = ${staffId} AND role IN ('staff', 'admin')
         LIMIT 1
      `) as any[]
      if (staffCheck.length === 0) {
        return NextResponse.json(
          { error: 'Selected user is not a staff member.' },
          { status: 400 },
        )
      }
    }
    await sql`
      UPDATE bookings
         SET assigned_staff_id = ${staffId},
             updated_at = NOW()
       WHERE id = ${existing.id}
    `
    // Mirror into the access table for instant staff-dashboard reads.
    if (staffId) {
      try {
        await sql`
          INSERT INTO staff_booking_access (booking_id, staff_id, granted_by, can_edit)
          VALUES (${existing.id}, ${staffId}, ${admin.id}, TRUE)
          ON CONFLICT (booking_id, staff_id)
          DO UPDATE SET can_edit = TRUE, granted_by = ${admin.id}
        `
      } catch {
        /* access mirror is best-effort */
      }
      // Tell the staff member they have a new booking.
      try {
        await notifyUser({
          userId: staffId,
          title: 'New booking assigned',
          message: `${existing.customer_name} · ${existing.location_name} · ${formatLongDateForNotice(
            existing.appointment_date,
          )} ${existing.appointment_time}`,
          type: 'status_update',
          referenceType: 'booking',
          referenceId: existing.id,
          actionUrl: `/staff/appointments/${existing.id}`,
          priority: 'high',
        })
      } catch {
        /* notify is best-effort */
      }
    }
  } else if (body.action === 'grant_staff_access') {
    // Secondary, fine-grained access — lets a non-primary staff
    // member view (or edit) the booking without becoming the
    // assigned operator. Used when a booking needs a second pair
    // of eyes (e.g. a senior approving a discount).
    const staffId = String(body.staff_id || '')
    if (!staffId) {
      return NextResponse.json({ error: 'staff_id required.' }, { status: 400 })
    }
    const staffCheck = (await sql`
      SELECT id FROM users
       WHERE id = ${staffId} AND role IN ('staff', 'admin')
       LIMIT 1
    `) as any[]
    if (staffCheck.length === 0) {
      return NextResponse.json(
        { error: 'Selected user is not a staff member.' },
        { status: 400 },
      )
    }
    await sql`
      INSERT INTO staff_booking_access (booking_id, staff_id, granted_by, can_edit)
      VALUES (${existing.id}, ${staffId}, ${admin.id}, ${body.can_edit ?? false})
      ON CONFLICT (booking_id, staff_id)
      DO UPDATE SET can_edit = EXCLUDED.can_edit, granted_by = ${admin.id}
    `
    try {
      await notifyUser({
        userId: staffId,
        title: 'Booking access granted',
        message: `You now have ${body.can_edit ? 'edit' : 'view'} access to ${existing.booking_reference}.`,
        type: 'status_update',
        referenceType: 'booking',
        referenceId: existing.id,
        actionUrl: `/staff/appointments/${existing.id}`,
      })
    } catch {
      /* notify best-effort */
    }
  } else if (body.action === 'revoke_staff_access') {
    const staffId = String(body.staff_id || '')
    if (!staffId) {
      return NextResponse.json({ error: 'staff_id required.' }, { status: 400 })
    }
    await sql`
      DELETE FROM staff_booking_access
       WHERE booking_id = ${existing.id} AND staff_id = ${staffId}
    `
  } else if (body.action === 'set_price_override') {
    // Allow admins to override the booking total — used for in-house
    // discounts, comp visits, or correcting a mis-priced add-on.
    // Stored as a positive kobo integer; null clears the override.
    const next = body.price_kobo
    if (next !== null && next !== undefined) {
      const n = Number(next)
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) {
        return NextResponse.json(
          { error: 'price_kobo must be a positive integer (in kobo).' },
          { status: 400 },
        )
      }
    }
    await sql`
      UPDATE bookings
         SET price_override_kobo = ${
           next === null || next === undefined ? null : Number(next)
         },
             price_override_reason = ${
               (body.reason ?? '').slice(0, 500) || null
             },
             updated_at = NOW()
       WHERE id = ${existing.id}
    `
    // Tell the customer the total changed (if there's a real account).
    if (existing.user_id) {
      try {
        await notifyUser({
          userId: existing.user_id,
          title: 'Booking total updated',
          message: `Your booking ${existing.booking_reference} total has been updated by our team.`,
          type: 'status_update',
          referenceType: 'booking',
          referenceId: existing.id,
          actionUrl: `/booking/${existing.booking_reference}`,
        })
      } catch {
        /* notify best-effort */
      }
    }
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }

  // Notify the customer when their booking status changes — covers
  // confirmed/completed/cancelled/no_show updates kicked off here.
  if (body.action === 'set_status' && existing.user_id) {
    try {
      const niceStatus =
        body.status === 'confirmed'
          ? 'confirmed'
          : body.status === 'completed'
            ? 'marked as completed'
            : body.status === 'cancelled'
              ? 'cancelled'
              : body.status === 'no_show'
                ? 'marked as a no-show'
                : (body.status ?? 'updated')
      await notifyUser({
        userId: existing.user_id,
        title: `Booking ${niceStatus}`,
        message: `Your booking ${existing.booking_reference} has been ${niceStatus}.`,
        type: 'status_update',
        referenceType: 'booking',
        referenceId: existing.id,
        actionUrl: `/booking/${existing.booking_reference}`,
        priority: body.status === 'cancelled' ? 'high' : 'normal',
      })
    } catch {
      /* notify best-effort */
    }
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

  // Fan-out cache invalidation. Every dashboard that counts bookings
  // (admin pending/upcoming, the home page treatments-done counter,
  // the assigned staff member's per-staff queue, the customer's
  // personal spend chart) reads from a Redis-backed aggregate; we
  // wipe each of those keys here so the next dashboard load
  // recomputes against fresh Postgres. Fire-and-forget — a Redis
  // hiccup must never break the admin's PATCH response.
  void invalidateAfterBookingChange({
    customerUserId: updated?.user_id ?? existing.user_id ?? null,
    staffUserId: updated?.assigned_staff_id ?? existing.assigned_staff_id ?? null,
  })

  return NextResponse.json({ booking: updated })
}
