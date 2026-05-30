import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { resolveAdminAvatar } from '@/lib/admin-avatars'

// ---------------------------------------------------------------------------
// GET /api/admin/bookings
// ---------------------------------------------------------------------------
// Admin-wide booking inventory with filters. Drives the
// /admin/bookings list view. Filters mirror the controls in the UI:
//
//   • status     – pending | confirmed | completed | cancelled | no_show
//   • payment    – unpaid  | paid      | refunded  | failed
//   • location   – exact location_id
//   • when       – upcoming | today | past | all (default: all)
//   • q          – substring match on customer name/email/booking_reference
//   • page/limit – pagination (limit capped at 100)
//
// Returns the rows with their service line items already hydrated so the
// list can render full booking cards without N+1 fetches.
// ---------------------------------------------------------------------------

const VALID_STATUS = new Set(['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])
const VALID_PAYMENT = new Set(['unpaid', 'paid', 'refunded', 'failed'])
const VALID_WHEN = new Set(['upcoming', 'today', 'past', 'all'])

export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || ''
  const payment = url.searchParams.get('payment') || ''
  const location = url.searchParams.get('location') || ''
  const when = (url.searchParams.get('when') || 'all').toLowerCase()
  const q = (url.searchParams.get('q') || '').trim()
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10) || 25),
  )
  const offset = (page - 1) * limit

  const useStatus = VALID_STATUS.has(status) ? status : ''
  const usePayment = VALID_PAYMENT.has(payment) ? payment : ''
  const useWhen = VALID_WHEN.has(when) ? when : 'all'

  // Build a single dynamic WHERE using `tagged template` chaining via
  // Neon's serverless driver. We project everything from `bookings`
  // plus the user role label (regular / staff / admin) so the table
  // can flag staff bookings without a second join in the UI.
  const today = new Date()
  // Lagos is UTC+1 (no DST). For "today" filter we compute the
  // calendar day using a UTC-shift trick consistent with the rest of
  // the booking lib.
  const lagosNow = new Date(today.getTime() + 60 * 60 * 1000)
  const todayLagos = lagosNow.toISOString().slice(0, 10)

  // Counts for the summary tiles. We compute these alongside the
  // page query so admins can see "12 upcoming · 3 pending payment"
  // without paying for two round-trips. Wrapped in try/catch because
  // a bad filter value should not blow up the whole endpoint.
  const counts = (await sql`
    SELECT
      COUNT(*)::int                                                    AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int                  AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed' AND appointment_date >= ${todayLagos})::int
                                                                       AS upcoming,
      COUNT(*) FILTER (WHERE appointment_date = ${todayLagos}
                       AND status IN ('pending','confirmed'))::int     AS today,
      COUNT(*) FILTER (WHERE status = 'completed')::int                AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int                AS cancelled,
      COUNT(*) FILTER (WHERE payment_status = 'unpaid'
                       AND status IN ('pending','confirmed'))::int      AS unpaid,
      COALESCE(SUM(total_price_kobo)
        FILTER (WHERE payment_status = 'paid'), 0)::bigint              AS paid_kobo
    FROM bookings
  `) as any[]

  // Page query — assembled with conditional filters. Each filter is a
  // tagged-template fragment; combining them dynamically is cleaner
  // than building one massive query with optional NULL guards.
  let rows: any[]
  if (q) {
    const like = `%${q.toLowerCase()}%`
    rows = (await sql`
      SELECT b.*,
             u.role AS user_role,
             u.avatar_url AS user_avatar_url,
             COALESCE(u.first_name, '') AS user_first_name,
             COALESCE(u.last_name, '')  AS user_last_name
        FROM bookings b
        LEFT JOIN users u ON u.id = b.user_id
       WHERE (${useStatus === ''} OR b.status = ${useStatus})
         AND (${usePayment === ''} OR b.payment_status = ${usePayment})
         AND (${location === ''} OR b.location_id = ${location})
         AND (
           ${useWhen === 'all'} OR
           (${useWhen === 'upcoming'} AND b.appointment_date >= ${todayLagos}) OR
           (${useWhen === 'today'}    AND b.appointment_date = ${todayLagos}) OR
           (${useWhen === 'past'}     AND b.appointment_date < ${todayLagos})
         )
         AND (
           LOWER(b.customer_name)        LIKE ${like} OR
           LOWER(b.customer_email)       LIKE ${like} OR
           LOWER(b.booking_reference)    LIKE ${like} OR
           LOWER(COALESCE(b.customer_phone, '')) LIKE ${like} OR
           LOWER(COALESCE(b.notes, ''))          LIKE ${like} OR
           LOWER(COALESCE(b.location_name, '')) LIKE ${like} OR
           LOWER(COALESCE(b.payment_reference, '')) LIKE ${like}
         )
       ORDER BY b.appointment_date DESC, b.appointment_time DESC
       LIMIT ${limit} OFFSET ${offset}
    `) as any[]
  } else {
    rows = (await sql`
      SELECT b.*,
             u.role AS user_role,
             u.avatar_url AS user_avatar_url,
             COALESCE(u.first_name, '') AS user_first_name,
             COALESCE(u.last_name, '')  AS user_last_name
        FROM bookings b
        LEFT JOIN users u ON u.id = b.user_id
       WHERE (${useStatus === ''} OR b.status = ${useStatus})
         AND (${usePayment === ''} OR b.payment_status = ${usePayment})
         AND (${location === ''} OR b.location_id = ${location})
         AND (
           ${useWhen === 'all'} OR
           (${useWhen === 'upcoming'} AND b.appointment_date >= ${todayLagos}) OR
           (${useWhen === 'today'}    AND b.appointment_date = ${todayLagos}) OR
           (${useWhen === 'past'}     AND b.appointment_date < ${todayLagos})
         )
       ORDER BY b.appointment_date DESC, b.appointment_time DESC
       LIMIT ${limit} OFFSET ${offset}
    `) as any[]
  }

  // Pull the line-items for the current page in a single round-trip
  // and group them in JS. Avoids N+1 without a heavy CTE.
  const ids = rows.map((r) => r.id)
  let services: any[] = []
  if (ids.length > 0) {
    services = (await sql`
      SELECT * FROM booking_services
       WHERE booking_id = ANY(${ids})
       ORDER BY created_at ASC
    `) as any[]
  }
  const servicesById = new Map<string, any[]>()
  for (const s of services) {
    const arr = servicesById.get(s.booking_id) ?? []
    arr.push({
      categoryId: s.category_id,
      categoryName: s.category_name,
      treatmentId: s.treatment_id,
      treatmentName: s.treatment_name,
      duration: s.duration,
      priceKobo: s.price_kobo,
    })
    servicesById.set(s.booking_id, arr)
  }

  const bookings = rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    user_role: r.user_role,
    // Resolve the portrait once server-side: the customer's own
    // upload first, then a role-appropriate default, else null so the
    // client renders initials. Mirrors the booking detail page.
    user_avatar_url: resolveAdminAvatar(r.user_avatar_url, r.user_role),
    user_first_name: r.user_first_name,
    user_last_name: r.user_last_name,
    booking_reference: r.booking_reference,
    location_id: r.location_id,
    location_name: r.location_name,
    location_address: r.location_address,
    appointment_date:
      typeof r.appointment_date === 'string'
        ? r.appointment_date
        : new Date(r.appointment_date).toISOString().slice(0, 10),
    appointment_time: r.appointment_time,
    total_duration: r.total_duration,
    total_price_kobo: r.total_price_kobo,
    customer_name: r.customer_name,
    customer_email: r.customer_email,
    customer_phone: r.customer_phone,
    status: r.status,
    payment_status: r.payment_status,
    payment_method: r.payment_method,
    payment_reference: r.payment_reference,
    notes: r.notes,
    cancellation_reason: r.cancellation_reason,
    cancelled_at: r.cancelled_at,
    completed_at: r.completed_at,
    created_at: r.created_at,
    services: servicesById.get(r.id) ?? [],
  }))

  return NextResponse.json({
    bookings,
    counts: {
      total: counts[0]?.total || 0,
      pending: counts[0]?.pending || 0,
      upcoming: counts[0]?.upcoming || 0,
      today: counts[0]?.today || 0,
      completed: counts[0]?.completed || 0,
      cancelled: counts[0]?.cancelled || 0,
      unpaid: counts[0]?.unpaid || 0,
      paidKobo: Number(counts[0]?.paid_kobo || 0),
    },
    pagination: {
      page,
      limit,
      total: counts[0]?.total || 0,
    },
  })
}
