import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/dashboard
 *
 * The front-desk's situational-awareness endpoint. Surfaces:
 *
 *   • Triage counts        — gift cards / complaints / consultations
 *                            pending action.
 *   • Recent activity feed — last 10 customer-driven events.
 *   • Recent payments      — last 10 successful customer transactions
 *                            with name / amount / method so the front
 *                            desk can confirm "yes, this client did
 *                            just pay" when a customer walks in.
 *   • Recent complaints    — last 5 complaints with the customer's
 *                            name and message snippet.
 *   • Per-staff numbers    — assigned bookings + upcoming appointments
 *                            for the operator currently signed in.
 *
 * Every sub-query is wrapped in its own try/catch so a single missing
 * column / table (older preview DB) only zeroes that tile — the rest
 * of the dashboard still renders.
 */

export async function GET() {
  try {
    const me = await requireAdminOrStaff()

    // Per-staff (assigned bookings) — outside the shared work below
    // because it's user-specific.
    let myAssignedBookings = 0
    let myUpcomingBookings: Array<{
      id: string
      booking_reference: string
      appointment_date: string
      appointment_time: string
      customer_name: string
      location_name: string
      status: string
    }> = []
    try {
      const r = (await sql`
        SELECT COUNT(*)::int AS count FROM bookings
         WHERE assigned_staff_id = ${me.id}
           AND status IN ('pending', 'confirmed')
           AND appointment_date >= CURRENT_DATE
      `) as any[]
      myAssignedBookings = Number(r[0]?.count ?? 0)
      myUpcomingBookings = (await sql`
        SELECT id::text,
               booking_reference,
               TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
               appointment_time,
               customer_name,
               location_name,
               status
          FROM bookings
         WHERE assigned_staff_id = ${me.id}
           AND status IN ('pending', 'confirmed')
           AND appointment_date >= CURRENT_DATE
         ORDER BY appointment_date ASC, appointment_time ASC
         LIMIT 5
      `) as any[]
    } catch {
      /* assigned_staff_id column missing on older DBs — ignore */
    }

    // Triage counters
    const safeCount = async (q: Promise<unknown>) => {
      try {
        const rows = (await q) as Array<{ count?: string | number }>
        return Number(rows?.[0]?.count ?? 0) || 0
      } catch (err) {
        console.warn("[v0] Staff dashboard counter query failed:", err)
        return 0
      }
    }

    const [
      pendingGiftCards,
      pendingComplaints,
      pendingConsultations,
      recentSurveys,
    ] = await Promise.all([
      safeCount(sql`
        SELECT COUNT(*) as count FROM gift_card_requests
         WHERE status = 'pending'
      `),
      safeCount(sql`
        SELECT COUNT(*) as count FROM contact_messages
         WHERE category = 'complaint' AND status IN ('pending', 'open', 'in_progress')
      `),
      safeCount(sql`
        SELECT COUNT(*) as count FROM consultations
         WHERE status = 'pending'
      `),
      safeCount(sql`
        SELECT COUNT(*) as count FROM survey_responses
         WHERE created_at >= NOW() - INTERVAL '7 days'
      `),
    ])

    // Recent activity feed (gift cards / complaints / consultations)
    type RecentItem = {
      id: string
      type: string
      title: string
      status: string
      created_at: string
    }
    const collected: RecentItem[] = []

    try {
      const rows = (await sql`
        SELECT id::text,
               'Gift Card' as type,
               CONCAT('Gift card request - ₦', amount) as title,
               status,
               created_at
          FROM gift_card_requests
         WHERE status = 'pending'
         ORDER BY created_at DESC
         LIMIT 3
      `) as RecentItem[]
      collected.push(...rows)
    } catch (err) {
      console.warn("[v0] Staff dashboard gift card feed failed:", err)
    }

    try {
      const rows = (await sql`
        SELECT id::text,
               'Complaint' as type,
               COALESCE(subject, 'Customer complaint') as title,
               status,
               created_at
          FROM contact_messages
         WHERE category = 'complaint' AND status IN ('pending', 'open')
         ORDER BY created_at DESC
         LIMIT 3
      `) as RecentItem[]
      collected.push(...rows)
    } catch (err) {
      console.warn("[v0] Staff dashboard complaints feed failed:", err)
    }

    try {
      const rows = (await sql`
        SELECT id::text,
               'Consultation' as type,
               CONCAT('Consultation - ', concern_type) as title,
               status,
               created_at
          FROM consultations
         WHERE status = 'pending'
         ORDER BY created_at DESC
         LIMIT 3
      `) as RecentItem[]
      collected.push(...rows)
    } catch (err) {
      console.warn("[v0] Staff dashboard consultations feed failed:", err)
    }

    const recentItems = collected
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 10)

    // Recent payments — so the front desk can answer "did this client
    // just pay?". We only show successful customer transactions, and
    // we attach the customer's name + service description when present
    // so the staff member sees who paid and for what at a glance.
    type RecentPayment = {
      id: string
      reference: string | null
      amount: number
      method: string | null
      description: string
      customerName: string
      customerEmail: string | null
      createdAt: string
    }
    let recentPayments: RecentPayment[] = []
    try {
      const rows = (await sql`
        SELECT t.id::text                                 AS id,
               t.reference                                AS reference,
               t.amount::float                            AS amount,
               t.payment_method                           AS method,
               t.description                              AS description,
               COALESCE(
                 NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
                 u.email,
                 'Walk-in customer'
               )                                          AS customer_name,
               u.email                                    AS customer_email,
               t.created_at                               AS created_at
          FROM transactions t
          LEFT JOIN users u ON u.id = t.user_id
         WHERE t.status = 'completed'
           AND t.type = 'credit'
         ORDER BY t.created_at DESC
         LIMIT 10
      `) as any[]
      recentPayments = rows.map((r) => ({
        id: String(r.id),
        reference: r.reference ?? null,
        amount: Number(r.amount ?? 0),
        method: r.method ?? null,
        description: r.description ?? "Customer payment",
        customerName: r.customer_name ?? "Walk-in customer",
        customerEmail: r.customer_email ?? null,
        createdAt: r.created_at,
      }))
    } catch (err) {
      console.warn("[v0] Staff dashboard recent payments query failed:", err)
    }

    // Recent complaints — last 5 with customer context so the front
    // desk can recognise the client when they walk in.
    type RecentComplaint = {
      id: string
      subject: string
      message: string
      status: string
      priority: string
      customerName: string
      customerEmail: string
      createdAt: string
    }
    let recentComplaints: RecentComplaint[] = []
    try {
      const rows = (await sql`
        SELECT cm.id::text                                AS id,
               COALESCE(cm.subject, 'Customer complaint') AS subject,
               COALESCE(cm.message, '')                   AS message,
               COALESCE(cm.status, 'open')                AS status,
               COALESCE(cm.priority, 'normal')            AS priority,
               COALESCE(cm.name, u.first_name || ' ' || u.last_name, cm.email, 'Anonymous') AS customer_name,
               COALESCE(cm.email, u.email, '')            AS customer_email,
               cm.created_at                              AS created_at
          FROM contact_messages cm
          LEFT JOIN users u ON u.email = cm.email
         WHERE COALESCE(cm.category, '') IN ('complaint', '')
           AND COALESCE(cm.status, 'open') IN ('pending', 'open', 'in_progress')
         ORDER BY cm.created_at DESC
         LIMIT 5
      `) as any[]
      recentComplaints = rows.map((r) => ({
        id: String(r.id),
        subject: r.subject,
        message: r.message,
        status: r.status,
        priority: r.priority,
        customerName: r.customer_name ?? "Anonymous",
        customerEmail: r.customer_email ?? "",
        createdAt: r.created_at,
      }))
    } catch (err) {
      console.warn("[v0] Staff dashboard recent complaints query failed:", err)
    }

    // Today's revenue — small headline number for the welcome hero.
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
      stats: {
        pendingGiftCards,
        pendingComplaints,
        pendingConsultations,
        recentSurveys,
      },
      recentItems,
      recentPayments,
      recentComplaints,
      todayRevenue,
      me: {
        myAssignedBookings,
        myUpcomingBookings,
      },
    })
  } catch (error) {
    console.error("Staff dashboard error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 },
    )
  }
}
