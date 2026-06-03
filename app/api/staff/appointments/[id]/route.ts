/**
 * Staff › Appointment detail API.
 *
 * GET    /api/staff/appointments/[id]
 *   Returns the booking for any signed-in staff or admin. Staff
 *   members get a `can_edit` flag that's only true if they are the
 *   primary `assigned_staff_id`, have a `staff_booking_access` row
 *   with `can_edit = true`, or are admin. We deliberately keep the
 *   read surface broad — operators routinely need to look up a
 *   colleague's booking when a customer walks in — but writes are
 *   still gated.
 *
 * PATCH  /api/staff/appointments/[id]
 *   Allows status / notes / payment updates only when `can_edit`
 *   is true. Mirrors the admin booking PATCH.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import { notifyUser } from '@/lib/notifications'
import { sendBookingCompletedEmail } from '@/lib/email'

interface AccessRow {
  is_admin: boolean
  is_assigned: boolean
  has_grant: boolean
  can_edit: boolean
}

async function loadBookingForStaff(bookingId: string, staffId: string) {
  const rows = (await sql`
    SELECT b.id::text                                AS id,
           b.user_id::text                           AS user_id,
           b.booking_reference                       AS booking_reference,
           TO_CHAR(b.appointment_date, 'YYYY-MM-DD') AS appointment_date,
           b.appointment_time                        AS appointment_time,
           b.customer_name                           AS customer_name,
           b.customer_email                          AS customer_email,
           b.customer_phone                          AS customer_phone,
           cu.avatar_url                             AS customer_avatar_url,
           b.location_name                           AS location_name,
           b.status                                  AS status,
           b.payment_status                          AS payment_status,
           COALESCE(b.price_override_kobo, b.total_price_kobo)::bigint
                                                     AS total_price_kobo,
           b.notes                                   AS notes,
           b.assigned_staff_id                       AS assigned_staff_id,
           sba.id                                    AS sba_grant_id,
           u.role                                    AS me_role
      FROM bookings b
 LEFT JOIN staff_booking_access sba
        ON sba.booking_id = b.id AND sba.staff_id = ${staffId}
 LEFT JOIN users u
        ON u.id = ${staffId}
 LEFT JOIN users cu
        ON cu.id = b.user_id
     WHERE b.id = ${bookingId}
     LIMIT 1
  `) as any[]

  if (rows.length === 0) return null
  const row = rows[0]

  const isAdmin = row.me_role === 'admin'
  const isAssigned = row.assigned_staff_id === staffId
  // A `staff_booking_access` row is itself the grant — it is created by an
  // admin (`granted_by`) to give a staff member edit access to a booking
  // they aren't the primary assignee of. There is no per-row flag, so the
  // presence of the row means edit access.
  const hasGrant = row.sba_grant_id != null
  const canEdit = Boolean(isAdmin || isAssigned || hasGrant)
  const access: AccessRow = {
    is_admin: isAdmin,
    is_assigned: isAssigned,
    has_grant: hasGrant,
    can_edit: canEdit,
  }

  if (!isAdmin && !isAssigned && !hasGrant) {
    // No explicit access — we still let the staff *read* the
    // booking, but `can_edit` stays false so the UI shows a
    // read-only badge. This matches how the front desk works in
    // practice: any operator can look up any booking, but only
    // assignees can change its state.
  }

  // Pull line items separately so the SELECT stays narrow. The
  // category/treatment names are denormalised onto booking_services
  // already (see schema), so we don't need to join the catalog
  // tables — that also keeps the query stable when a service is
  // later renamed or retired.
  const services = (await sql`
    SELECT bs.duration       AS duration,
           bs.price_kobo     AS price_kobo,
           bs.category_name  AS category_name,
           bs.treatment_name AS treatment_name
      FROM booking_services bs
     WHERE bs.booking_id = ${bookingId}
     ORDER BY bs.id ASC
  `) as any[]

  // Customer review (only present when the customer has actually
  // left feedback — the review API enforces "completed only" on the
  // write path so staff will only see this on closed visits).
  const reviewRows = (await sql`
    SELECT rating              AS rating,
           cleanliness_rating  AS cleanliness_rating,
           staff_rating        AS staff_rating,
           value_rating        AS value_rating,
           body                AS body,
           would_recommend     AS would_recommend,
           created_at          AS created_at,
           updated_at          AS updated_at
      FROM booking_reviews
     WHERE booking_id = ${bookingId}
     LIMIT 1
  `) as any[]
  const review = reviewRows[0]
    ? {
        rating: Number(reviewRows[0].rating),
        cleanlinessRating:
          reviewRows[0].cleanliness_rating == null
            ? null
            : Number(reviewRows[0].cleanliness_rating),
        staffRating:
          reviewRows[0].staff_rating == null
            ? null
            : Number(reviewRows[0].staff_rating),
        valueRating:
          reviewRows[0].value_rating == null
            ? null
            : Number(reviewRows[0].value_rating),
        body: reviewRows[0].body as string | null,
        wouldRecommend:
          reviewRows[0].would_recommend == null
            ? null
            : Boolean(reviewRows[0].would_recommend),
        createdAt: reviewRows[0].created_at as string,
        updatedAt: reviewRows[0].updated_at as string,
      }
    : null

  return {
    id: row.id,
    user_id: row.user_id,
    booking_reference: row.booking_reference,
    appointment_date: row.appointment_date,
    appointment_time: row.appointment_time,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    customer_avatar_url: row.customer_avatar_url ?? null,
    location_name: row.location_name,
    status: row.status,
    payment_status: row.payment_status,
    total_price_kobo: Number(row.total_price_kobo),
    notes: row.notes,
    can_edit: access.can_edit,
    access_role: isAssigned ? ('assigned' as const) : ('granted' as const),
    services: services.map((s) => ({
      categoryName: s.category_name,
      treatmentName: s.treatment_name,
      duration: Number(s.duration ?? 0),
      priceKobo: Number(s.price_kobo ?? 0),
    })),
    review,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let me
  try {
    me = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const booking = await loadBookingForStaff(id, me.id)
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ booking })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let me
  try {
    me = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const booking = await loadBookingForStaff(id, me.id)
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!booking.can_edit) {
    return NextResponse.json(
      { error: 'You only have view access to this booking.' },
      { status: 403 },
    )
  }

  if (body.action === 'set_status') {
    const next = String(body.status || '')
    if (!['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(next)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }
    const reason = (body.reason ?? '').slice(0, 500)
    if (next === 'cancelled') {
      await sql`
        UPDATE bookings
           SET status = ${next},
               cancellation_reason = ${reason || null},
               cancelled_at = NOW(),
               updated_at = NOW()
         WHERE id = ${booking.id}
      `
    } else if (next === 'completed') {
      await sql`
        UPDATE bookings
           SET status = ${next},
               completed_at = NOW(),
               updated_at = NOW()
         WHERE id = ${booking.id}
      `
    } else {
      await sql`
        UPDATE bookings
           SET status = ${next},
               updated_at = NOW()
         WHERE id = ${booking.id}
      `
    }

    if (booking.user_id) {
      const niceStatus =
        next === 'confirmed'
          ? 'confirmed'
          : next === 'completed'
            ? 'marked as completed'
            : next === 'cancelled'
              ? 'cancelled'
              : next === 'no_show'
                ? 'marked as a no-show'
                : next
      try {
        await notifyUser({
          userId: booking.user_id,
          title: `Booking ${niceStatus}`,
          message: `Your booking ${booking.booking_reference} has been ${niceStatus}.`,
          type: 'status_update',
          referenceType: 'booking',
          referenceId: booking.id,
          actionUrl: `/booking/${booking.booking_reference}`,
          priority: next === 'cancelled' ? 'high' : 'normal',
        })
      } catch {
        /* notify best-effort */
      }
    }

    // When the visit is finished we also drop the customer a
    // proper "thank you" email — separate from the in-app bell.
    // It doubles as a soft prompt to leave a review. Sending is
    // best-effort: a transient SMTP hiccup must not block the
    // status update itself.
    if (next === 'completed' && booking.customer_email) {
      try {
        const longDate = new Date(
          `${booking.appointment_date}T00:00:00`,
        ).toLocaleDateString('en-NG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        await sendBookingCompletedEmail({
          email: booking.customer_email,
          customerName: booking.customer_name || 'there',
          bookingReference: booking.booking_reference,
          appointmentDate: longDate,
          appointmentTime: booking.appointment_time,
          locationName: booking.location_name || '',
        })
      } catch (err) {
        console.error('[v0] sendBookingCompletedEmail failed', err)
      }
    }
  } else if (body.action === 'set_notes') {
    const notes = String(body.notes ?? '').slice(0, 5000)
    await sql`
      UPDATE bookings
         SET notes = ${notes},
             updated_at = NOW()
       WHERE id = ${booking.id}
    `
  } else if (body.action === 'set_payment_status') {
    const next = String(body.payment_status || '')
    if (!['unpaid', 'paid', 'refunded', 'failed'].includes(next)) {
      return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 })
    }
    await sql`
      UPDATE bookings
         SET payment_status = ${next},
             updated_at = NOW()
       WHERE id = ${booking.id}
    `
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }

  // Audit log — best-effort.
  try {
    await sql`
      INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
      VALUES (
        ${me.id},
        ${`booking_${body.action}`},
        'booking',
        ${booking.id},
        ${'Staff updated booking ' + booking.booking_reference}
      )
    `
  } catch {
    /* logging never blocks */
  }

  const updated = await loadBookingForStaff(booking.id, me.id)
  return NextResponse.json({ booking: updated })
}
