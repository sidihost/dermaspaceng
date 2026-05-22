import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/front-desk
 *
 * Powers the operational front-desk dashboard at /staff. Everything an
 * operator needs at-a-glance, in one round trip:
 *
 *   • upcomingSoon       — next bookings starting within 30 minutes
 *                          (across the whole branch, not just the
 *                          signed-in operator's assignments).
 *   • todaySchedule      — every booking dated today, ordered by
 *                          time. Each entry carries the assigned
 *                          therapist, service summary, and status so
 *                          the timeline can render without extra
 *                          fetches.
 *   • pendingPayments    — completed bookings where payment_status is
 *                          unpaid / failed. Drives the "client owes"
 *                          card.
 *   • rooms              — derived room slots: each unique
 *                          `location_name` + service category that
 *                          has activity today, with the current
 *                          occupant if any.
 *   • therapists         — every staff member, with the booking they
 *                          are currently inside (if any), or
 *                          "available" otherwise.
 *   • notifications      — recent operational events (arrivals,
 *                          starting-soon flags, no-shows, new
 *                          bookings) over the last 24h.
 *   • todayStats         — counters for the page header (today
 *                          revenue, today bookings, etc.).
 *
 * Every sub-query is independently try/caught so one missing column
 * on an older preview DB doesn't blank the whole page — broken tiles
 * fall back to empty arrays / zeros and the rest still renders.
 */

interface BookingRow {
  id: string
  booking_reference: string
  appointment_date: string
  appointment_time: string
  total_duration: number
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  location_name: string
  status: string
  payment_status: string
  total_price_kobo: number
  assigned_staff_id: string | null
  assigned_staff_name: string | null
  user_id: string | null
  services_summary: string | null
  primary_category: string | null
  created_at: string
}

const TIMEZONE_OFFSET_MIN = 60 // WAT — fixed offset, no DST in Nigeria.

/**
 * Convert "HH:MM" in the salon's local timezone to a JS Date for
 * today's date, returning the difference in minutes from now. Used
 * to flag "starting within 30 minutes".
 *
 * We avoid Intl.DateTimeFormat acrobatics because Postgres has
 * already given us a date-only column and a HH:MM string — combining
 * them is a pure clock-arithmetic exercise.
 */
function minutesUntilFromNow(date: string, time: string): number {
  // date = "YYYY-MM-DD", time = "HH:MM"
  const [yyyy, mm, dd] = date.split("-").map((n) => Number(n))
  const [hh, mi] = time.split(":").map((n) => Number(n))
  // Construct the appointment as a UTC instant by subtracting the
  // WAT offset (UTC+1). The browser's clock is whatever it is — we
  // diff against Date.now() which is also a UTC instant.
  const apptUTC = Date.UTC(yyyy, mm - 1, dd, hh, mi) - TIMEZONE_OFFSET_MIN * 60_000
  return Math.round((apptUTC - Date.now()) / 60_000)
}

export async function GET() {
  let me
  try {
    me = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ---- Today's bookings -----------------------------------------------------
  // The big query that feeds the dashboard timeline. We pull every
  // booking for today (regardless of who it's assigned to — the front
  // desk needs the whole branch view) plus the assigned therapist's
  // name and a comma-joined services summary.
  let todayBookings: BookingRow[] = []
  try {
    const rows = (await sql`
      SELECT
        b.id::text                                                    AS id,
        b.booking_reference                                           AS booking_reference,
        TO_CHAR(b.appointment_date, 'YYYY-MM-DD')                     AS appointment_date,
        b.appointment_time                                            AS appointment_time,
        b.total_duration                                              AS total_duration,
        b.customer_name                                               AS customer_name,
        b.customer_phone                                              AS customer_phone,
        b.customer_email                                              AS customer_email,
        b.location_name                                               AS location_name,
        b.status                                                      AS status,
        b.payment_status                                              AS payment_status,
        COALESCE(b.price_override_kobo, b.total_price_kobo)::bigint   AS total_price_kobo,
        b.assigned_staff_id::text                                     AS assigned_staff_id,
        NULLIF(TRIM(CONCAT(s.first_name, ' ', s.last_name)), '')      AS assigned_staff_name,
        b.user_id::text                                               AS user_id,
        cu.avatar_url                                                 AS customer_avatar_url,
        b.created_at                                                  AS created_at,
        (
          SELECT STRING_AGG(bs.treatment_name, ', ' ORDER BY bs.id ASC)
            FROM booking_services bs
           WHERE bs.booking_id = b.id
        )                                                             AS services_summary,
        (
          SELECT bs.category_name
            FROM booking_services bs
           WHERE bs.booking_id = b.id
           ORDER BY bs.id ASC
           LIMIT 1
        )                                                             AS primary_category
        FROM bookings b
   LEFT JOIN users s ON s.id = b.assigned_staff_id
   LEFT JOIN users cu ON cu.id = b.user_id
       WHERE b.appointment_date = CURRENT_DATE
       ORDER BY b.appointment_time ASC
    `) as any[]
    todayBookings = rows.map((r) => ({
      id: String(r.id),
      booking_reference: String(r.booking_reference || ""),
      appointment_date: String(r.appointment_date),
      appointment_time: String(r.appointment_time),
      total_duration: Number(r.total_duration ?? 0),
      customer_name: String(r.customer_name ?? "Walk-in"),
      customer_phone: r.customer_phone ?? null,
      customer_email: r.customer_email ?? null,
      location_name: String(r.location_name ?? ""),
      status: String(r.status ?? "pending"),
      payment_status: String(r.payment_status ?? "unpaid"),
      total_price_kobo: Number(r.total_price_kobo ?? 0),
      assigned_staff_id: r.assigned_staff_id ?? null,
      assigned_staff_name: r.assigned_staff_name ?? null,
      user_id: r.user_id ?? null,
      customer_avatar_url: r.customer_avatar_url ?? null,
      services_summary: r.services_summary ?? null,
      primary_category: r.primary_category ?? null,
      created_at: String(r.created_at),
    }))
  } catch (err) {
    console.error("[front-desk] today bookings query failed:", err)
  }

  // ---- Upcoming in 30 minutes -----------------------------------------------
  // Filter the today set down to bookings whose start is within the
  // next 30 minutes, not yet started (status confirmed/pending) and
  // not already checked-in / in-progress.
  const upcomingSoon = todayBookings
    .map((b) => ({
      ...b,
      minutesUntil: minutesUntilFromNow(b.appointment_date, b.appointment_time),
    }))
    .filter(
      (b) =>
        b.minutesUntil >= -5 &&
        b.minutesUntil <= 30 &&
        ["pending", "confirmed", "checked_in"].includes(b.status),
    )
    .sort((a, b) => a.minutesUntil - b.minutesUntil)
    .slice(0, 3)

  // ---- Pending payments -----------------------------------------------------
  // Sessions that have wrapped (or are wrapping) but the customer
  // hasn't paid for. We surface confirmed/completed bookings with a
  // non-paid payment_status; the operator can tap "Pay now" to
  // collect.
  const pendingPayments = todayBookings
    .filter(
      (b) =>
        (b.status === "completed" || b.status === "in_progress" || b.status === "checked_in") &&
        b.payment_status !== "paid" &&
        b.payment_status !== "refunded",
    )
    .slice(0, 10)

  // ---- Therapist roster -----------------------------------------------------
  // Every active staff member, joined with the booking they're
  // currently inside (status = in_progress) if any.
  let therapists: Array<{
    id: string
    name: string
    avatar_url: string | null
    current_booking_id: string | null
    current_customer: string | null
    current_service: string | null
    next_booking_time: string | null
    next_booking_customer: string | null
  }> = []
  try {
    const rows = (await sql`
      SELECT
        u.id::text                                                     AS id,
        NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '')       AS name,
        u.avatar_url                                                   AS avatar_url,
        active_b.id::text                                              AS current_booking_id,
        active_b.customer_name                                         AS current_customer,
        (
          SELECT bs.treatment_name
            FROM booking_services bs
           WHERE bs.booking_id = active_b.id
           ORDER BY bs.id ASC
           LIMIT 1
        )                                                              AS current_service,
        next_b.appointment_time                                        AS next_booking_time,
        next_b.customer_name                                           AS next_booking_customer
        FROM users u
   LEFT JOIN LATERAL (
              SELECT b.id, b.customer_name
                FROM bookings b
               WHERE b.assigned_staff_id = u.id
                 AND b.status = 'in_progress'
                 AND b.appointment_date = CURRENT_DATE
               ORDER BY b.appointment_time ASC
               LIMIT 1
            ) active_b ON TRUE
   LEFT JOIN LATERAL (
              SELECT b.appointment_time, b.customer_name
                FROM bookings b
               WHERE b.assigned_staff_id = u.id
                 AND b.appointment_date = CURRENT_DATE
                 AND b.status IN ('confirmed', 'pending', 'checked_in')
               ORDER BY b.appointment_time ASC
               LIMIT 1
            ) next_b ON TRUE
       WHERE u.role IN ('staff', 'admin')
         AND COALESCE(u.is_active, TRUE) = TRUE
       ORDER BY u.first_name ASC NULLS LAST, u.last_name ASC NULLS LAST
       LIMIT 30
    `) as any[]
    therapists = rows
      .filter((r) => r.name) // skip rows with no name (placeholder seeds)
      .map((r) => ({
        id: String(r.id),
        name: String(r.name),
        avatar_url: r.avatar_url ?? null,
        current_booking_id: r.current_booking_id ?? null,
        current_customer: r.current_customer ?? null,
        current_service: r.current_service ?? null,
        next_booking_time: r.next_booking_time ?? null,
        next_booking_customer: r.next_booking_customer ?? null,
      }))
  } catch (err) {
    console.error("[front-desk] therapist roster query failed:", err)
  }

  // ---- Rooms ----------------------------------------------------------------
  // No dedicated rooms table exists, so we derive room state from the
  // schedule. Each unique (location, primary category) bucket that
  // has activity today becomes a "room". If a booking is currently
  // in_progress in that bucket, the room is occupied; otherwise free.
  type RoomTile = {
    id: string
    label: string
    location: string
    occupied: boolean
    occupied_until: string | null
    current_customer: string | null
    current_therapist: string | null
  }
  const roomMap = new Map<string, RoomTile>()
  for (const b of todayBookings) {
    const cat = b.primary_category || "Treatment"
    const key = `${b.location_name}::${cat}`
    if (!roomMap.has(key)) {
      roomMap.set(key, {
        id: key,
        label: cat,
        location: b.location_name,
        occupied: false,
        occupied_until: null,
        current_customer: null,
        current_therapist: null,
      })
    }
    if (b.status === "in_progress" || b.status === "checked_in") {
      const tile = roomMap.get(key)!
      tile.occupied = true
      tile.current_customer = b.customer_name
      tile.current_therapist = b.assigned_staff_name
      // Calculate end time = appointment_time + total_duration min.
      const [hh, mm] = b.appointment_time.split(":").map(Number)
      const endMin = (hh * 60 + mm + (b.total_duration || 60)) % (24 * 60)
      tile.occupied_until = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`
    }
  }
  const rooms = Array.from(roomMap.values()).sort((a, b) => {
    if (a.location !== b.location) return a.location.localeCompare(b.location)
    return a.label.localeCompare(b.label)
  })

  // ---- Notifications -------------------------------------------------------
  // Recent operational events. We synthesise these from the activity
  // log and booking changes over the last 24h so the panel feels
  // alive without a dedicated events table.
  type Notif = {
    id: string
    kind: "arrival" | "soon" | "new_booking" | "no_show" | "cancelled"
    title: string
    body: string
    created_at: string
  }
  const notifications: Notif[] = []

  // Starting-soon flags from upcomingSoon.
  for (const b of upcomingSoon) {
    notifications.push({
      id: `soon-${b.id}`,
      kind: "soon",
      title: `Starts in ${Math.max(0, b.minutesUntil)} min`,
      body: `${b.customer_name} — ${b.services_summary || "Service"}`,
      created_at: new Date().toISOString(),
    })
  }

  // Recent status changes from the activity log (last 24h, booking-related).
  try {
    const rows = (await sql`
      SELECT id::text                  AS id,
             action_type               AS action_type,
             description               AS description,
             created_at                AS created_at
        FROM activity_log
       WHERE entity_type = 'booking'
         AND created_at >= NOW() - INTERVAL '12 hours'
       ORDER BY created_at DESC
       LIMIT 8
    `) as any[]
    for (const r of rows) {
      const action = String(r.action_type || "")
      const kind: Notif["kind"] = action.includes("cancel")
        ? "cancelled"
        : action.includes("no_show")
          ? "no_show"
          : "new_booking"
      notifications.push({
        id: `log-${r.id}`,
        kind,
        title:
          kind === "cancelled"
            ? "Booking cancelled"
            : kind === "no_show"
              ? "Marked no-show"
              : "Booking update",
        body: String(r.description || ""),
        created_at: String(r.created_at),
      })
    }
  } catch {
    /* activity log may be empty / missing */
  }

  // Brand-new bookings created in the last hour.
  try {
    const rows = (await sql`
      SELECT id::text                                          AS id,
             booking_reference                                 AS booking_reference,
             customer_name                                     AS customer_name,
             TO_CHAR(appointment_date, 'YYYY-MM-DD')           AS appointment_date,
             appointment_time                                  AS appointment_time,
             created_at                                        AS created_at
        FROM bookings
       WHERE created_at >= NOW() - INTERVAL '2 hours'
       ORDER BY created_at DESC
       LIMIT 5
    `) as any[]
    for (const r of rows) {
      notifications.push({
        id: `new-${r.id}`,
        kind: "new_booking",
        title: "New booking",
        body: `${r.customer_name} — ${r.appointment_date} at ${r.appointment_time}`,
        created_at: String(r.created_at),
      })
    }
  } catch {
    /* ignore */
  }

  // Sort newest first, cap at 12.
  notifications.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const notificationsTrimmed = notifications.slice(0, 12)

  // ---- Today stats ---------------------------------------------------------
  const stats = {
    todayBookings: todayBookings.length,
    todayCompleted: todayBookings.filter((b) => b.status === "completed").length,
    todayCheckedIn: todayBookings.filter((b) =>
      ["checked_in", "in_progress"].includes(b.status),
    ).length,
    todayNoShow: todayBookings.filter((b) => b.status === "no_show").length,
    pendingPaymentCount: pendingPayments.length,
    therapistsBusy: therapists.filter((t) => t.current_booking_id).length,
    therapistsAvailable: therapists.filter((t) => !t.current_booking_id).length,
    roomsOccupied: rooms.filter((r) => r.occupied).length,
    roomsTotal: rooms.length,
  }

  let todayRevenue = 0
  try {
    const r = (await sql`
      SELECT COALESCE(SUM(amount), 0)::float AS total
        FROM transactions
       WHERE status = 'completed'
         AND type = 'credit'
         AND created_at >= CURRENT_DATE
    `) as any[]
    todayRevenue = Number(r[0]?.total ?? 0)
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    success: true,
    me: {
      id: me.id,
      firstName: me.first_name,
      lastName: me.last_name,
      role: me.role,
    },
    upcomingSoon,
    todaySchedule: todayBookings,
    pendingPayments,
    rooms,
    therapists,
    notifications: notificationsTrimmed,
    stats,
    todayRevenue,
    generatedAt: new Date().toISOString(),
  })
}

/**
 * PATCH /api/staff/front-desk
 *
 * Inline status updates from the dashboard timeline. The operator
 * taps a status pill and we transition the booking; we keep the
 * surface narrow (only status + simple actions) so the dashboard
 * never becomes an alternative to the full appointment editor.
 *
 * Body: { bookingId: string, status: 'confirmed'|'checked_in'|'in_progress'|'completed'|'no_show'|'cancelled', payment_status?: string }
 */
export async function PATCH(req: Request) {
  let me
  try {
    me = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    bookingId?: string
    status?: string
    payment_status?: string
  } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const { bookingId, status, payment_status } = body
  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 })
  }

  const validStatus = [
    "pending",
    "confirmed",
    "checked_in",
    "in_progress",
    "completed",
    "no_show",
    "cancelled",
  ]
  const validPayment = ["unpaid", "paid", "refunded", "failed"]

  try {
    if (status) {
      if (!validStatus.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 })
      }
      if (status === "completed") {
        await sql`
          UPDATE bookings
             SET status = ${status},
                 completed_at = NOW(),
                 updated_at = NOW()
           WHERE id = ${bookingId}
        `
      } else if (status === "cancelled") {
        await sql`
          UPDATE bookings
             SET status = ${status},
                 cancelled_at = NOW(),
                 updated_at = NOW()
           WHERE id = ${bookingId}
        `
      } else {
        await sql`
          UPDATE bookings
             SET status = ${status},
                 updated_at = NOW()
           WHERE id = ${bookingId}
        `
      }
    }

    if (payment_status) {
      if (!validPayment.includes(payment_status)) {
        return NextResponse.json({ error: "Invalid payment status" }, { status: 400 })
      }
      await sql`
        UPDATE bookings
           SET payment_status = ${payment_status},
               updated_at = NOW()
         WHERE id = ${bookingId}
      `
    }

    // Audit log — best effort.
    try {
      await sql`
        INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
        VALUES (
          ${me.id},
          ${status ? `booking_status_${status}` : `booking_payment_${payment_status}`},
          'booking',
          ${bookingId},
          ${'Front-desk inline update'}
        )
      `
    } catch {
      /* ignore */
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[front-desk] PATCH failed:", err)
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 },
    )
  }
}
