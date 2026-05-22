/**
 * Staff › Appointments listing.
 *
 * Returns the bookings the signed-in staff member can see. We
 * historically scoped this to "assigned to me OR shared via
 * staff_booking_access" but the operations team needs visibility
 * into every booking that lands in the salon (front-desk handover,
 * walk-in lookup, covering for a colleague). So now:
 *
 *   • Admins  → see everything (unchanged).
 *   • Staff   → see every booking. The detail page still gates
 *               the *edit* surface to assignees / grants / admins,
 *               so a staff member can read the booking they need
 *               but can't accidentally change another therapist's
 *               session state.
 *
 * The `filter` query string accepts:
 *   • upcoming (default) — pending/confirmed and date >= today
 *   • past — completed/cancelled or date < today
 *   • all — everything
 *
 * Designed to be called by SWR with a 30s polling interval, so the
 * query stays index-friendly: a single straight scan over the
 * `bookings (appointment_date, appointment_time)` clustering
 * (plus the `assigned_staff_id` projection for the access badge).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'

export async function GET(req: NextRequest) {
  let me
  try {
    me = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filter = req.nextUrl.searchParams.get('filter') ?? 'upcoming'

  // Branch the WHERE clause on the filter — Postgres can't easily
  // template a "date >= today AND status in (...)" condition, so we
  // duplicate the three filter shapes here. Each branch shares the
  // same column projection so the client doesn't have to special-
  // case the response shape.
  let rows: any[] = []
  try {
    if (filter === 'past') {
      rows = (await sql`
        SELECT b.id::text,
               b.booking_reference,
               TO_CHAR(b.appointment_date, 'YYYY-MM-DD') AS appointment_date,
               b.appointment_time,
               b.customer_name,
               b.customer_phone,
               b.customer_email,
               b.location_name,
               b.status,
               b.payment_status,
               b.total_price_kobo,
               cu.avatar_url AS customer_avatar_url,
               CASE
                 WHEN b.assigned_staff_id = ${me.id} THEN 'assigned'
                 WHEN EXISTS (
                   SELECT 1 FROM staff_booking_access sba
                    WHERE sba.booking_id = b.id AND sba.staff_id = ${me.id}
                 ) THEN 'granted'
                 ELSE 'shared'
               END AS access_role
          FROM bookings b
     LEFT JOIN users cu ON cu.id = b.user_id
         WHERE b.status IN ('completed', 'cancelled', 'no_show')
            OR b.appointment_date < CURRENT_DATE
         ORDER BY b.appointment_date DESC, b.appointment_time DESC
         LIMIT 100
      `) as any[]
    } else if (filter === 'all') {
      rows = (await sql`
        SELECT b.id::text,
               b.booking_reference,
               TO_CHAR(b.appointment_date, 'YYYY-MM-DD') AS appointment_date,
               b.appointment_time,
               b.customer_name,
               b.customer_phone,
               b.customer_email,
               b.location_name,
               b.status,
               b.payment_status,
               b.total_price_kobo,
               cu.avatar_url AS customer_avatar_url,
               CASE
                 WHEN b.assigned_staff_id = ${me.id} THEN 'assigned'
                 WHEN EXISTS (
                   SELECT 1 FROM staff_booking_access sba
                    WHERE sba.booking_id = b.id AND sba.staff_id = ${me.id}
                 ) THEN 'granted'
                 ELSE 'shared'
               END AS access_role
          FROM bookings b
     LEFT JOIN users cu ON cu.id = b.user_id
         ORDER BY b.appointment_date DESC, b.appointment_time DESC
         LIMIT 200
      `) as any[]
    } else {
      // upcoming (default)
      rows = (await sql`
        SELECT b.id::text,
               b.booking_reference,
               TO_CHAR(b.appointment_date, 'YYYY-MM-DD') AS appointment_date,
               b.appointment_time,
               b.customer_name,
               b.customer_phone,
               b.customer_email,
               b.location_name,
               b.status,
               b.payment_status,
               b.total_price_kobo,
               cu.avatar_url AS customer_avatar_url,
               CASE
                 WHEN b.assigned_staff_id = ${me.id} THEN 'assigned'
                 WHEN EXISTS (
                   SELECT 1 FROM staff_booking_access sba
                    WHERE sba.booking_id = b.id AND sba.staff_id = ${me.id}
                 ) THEN 'granted'
                 ELSE 'shared'
               END AS access_role
          FROM bookings b
     LEFT JOIN users cu ON cu.id = b.user_id
         WHERE b.status IN ('pending', 'confirmed')
           AND b.appointment_date >= CURRENT_DATE
         ORDER BY b.appointment_date ASC, b.appointment_time ASC
         LIMIT 100
      `) as any[]
    }
  } catch (err) {
    console.error('Staff appointments query failed:', err)
    return NextResponse.json({ appointments: [] })
  }

  return NextResponse.json({
    appointments: rows.map((r) => ({
      ...r,
      total_price_kobo: Number(r.total_price_kobo ?? 0),
    })),
  })
}
