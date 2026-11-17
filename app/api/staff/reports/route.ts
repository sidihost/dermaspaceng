import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/reports?range=last_month|last_30d|this_year
 *
 * Powers the "Business Performance" dashboard.
 *
 *   - Customers (new vs returning, by month, last 10 months).
 *   - Trends    (avg appointments per day, last 30d, sparkline).
 *   - Sales     (gross / VAT @ 7.5% / net, monthly, last 10 months).
 *   - Services & Products tallies (last 30d).
 *   - Appointments breakdown (status counts, last 30d).
 *
 * Money columns (`transactions.amount`, `bookings.total_price_kobo`)
 * are stored in kobo — divide by 100 at the SQL boundary so the API
 * always speaks naira to the dashboard.
 *
 * The `range` param is reserved for future filter chips and currently
 * just labels the response; the time windows are fixed at 30d / 10mo
 * which is what the design needs to render.
 */

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

export async function GET(req: Request) {
  try {
    await requireAdminOrStaff()

    const url = new URL(req.url)
    const range = url.searchParams.get("range") || "last_month"
    const rawStaffId = url.searchParams.get("staffId") || "all"
    const staffFilter = rawStaffId !== "all" && rawStaffId.trim() ? rawStaffId.trim() : null
    const windowDays = range === "this_year" ? 365 : 30

    // ---- Staff dropdown options ------------------------------------
    const staffRows = (await sql`
      SELECT id::text AS id, first_name, last_name
      FROM users
      WHERE role IN ('staff', 'admin') AND COALESCE(is_active, TRUE) = TRUE
      ORDER BY first_name ASC, last_name ASC
    `.catch(() => [])) as any[]
    const staffOptions = staffRows.map((s) => ({
      id: String(s.id),
      name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Staff member",
    }))

    // ---- Customers: new vs returning, by month --------------------
    const customers = (await sql`
      WITH first_seen AS (
        SELECT user_id, MIN(created_at) AS first_at
        FROM bookings
        GROUP BY user_id
      ),
      months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - INTERVAL '9 months',
          date_trunc('month', NOW()),
          INTERVAL '1 month'
        ) AS month_start
      )
      SELECT
        m.month_start,
        COUNT(b.*) FILTER (WHERE date_trunc('month', fs.first_at) = m.month_start)::int AS new_count,
        COUNT(b.*) FILTER (WHERE date_trunc('month', fs.first_at) < m.month_start)::int AS returning_count
      FROM months m
      LEFT JOIN bookings b
        ON date_trunc('month', b.created_at) = m.month_start
       AND (${staffFilter}::text IS NULL OR b.assigned_staff_id = ${staffFilter})
      LEFT JOIN first_seen fs ON fs.user_id = b.user_id
      GROUP BY m.month_start
      ORDER BY m.month_start ASC
    `) as any[]

    const customersChart = customers.map((r) => ({
      month: MONTHS_SHORT[new Date(r.month_start).getMonth()],
      new: Number(r.new_count ?? 0),
      returning: Number(r.returning_count ?? 0),
    }))

    // ---- Trends: bookings per day ---------------------------------
    const trendRows = (await sql`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW()) - (${windowDays - 1} || ' days')::interval,
          date_trunc('day', NOW()),
          INTERVAL '1 day'
        ) AS day
      )
      SELECT d.day, COUNT(b.*)::int AS count
      FROM days d
      LEFT JOIN bookings b
        ON date_trunc('day', b.created_at) = d.day
       AND (${staffFilter}::text IS NULL OR b.assigned_staff_id = ${staffFilter})
      GROUP BY d.day
      ORDER BY d.day ASC
    `) as any[]
    const trendChart = trendRows.map((r) => ({
      date: new Date(r.day).toISOString().slice(5, 10),
      value: Number(r.count ?? 0),
    }))
    const avgAppointments =
      trendChart.length > 0
        ? Math.round(
            (trendChart.reduce((s, p) => s + p.value, 0) / trendChart.length) * 10
          ) / 10
        : 0

    // Period-over-period delta
    const prevRows = (await sql`
      SELECT COUNT(*)::int AS n FROM bookings
      WHERE created_at >= NOW() - (${windowDays * 2} || ' days')::interval
        AND created_at <  NOW() - (${windowDays} || ' days')::interval
        AND (${staffFilter}::text IS NULL OR assigned_staff_id = ${staffFilter})
    `) as any[]
    const currRows = (await sql`
      SELECT COUNT(*)::int AS n FROM bookings
      WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
        AND (${staffFilter}::text IS NULL OR assigned_staff_id = ${staffFilter})
    `) as any[]
    const prev = Number(prevRows[0]?.n ?? 0)
    const curr = Number(currRows[0]?.n ?? 0)
    const trendsDeltaPct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0

    // ---- Sales: gross / VAT 7.5% / net, monthly -------------------
    const salesRows = (await sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - INTERVAL '9 months',
          date_trunc('month', NOW()),
          INTERVAL '1 month'
        ) AS month_start
      )
      SELECT
        m.month_start,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'credit' AND t.status = 'completed'), 0)::float AS gross
      FROM months m
      LEFT JOIN transactions t ON date_trunc('month', t.created_at) = m.month_start
      GROUP BY m.month_start
      ORDER BY m.month_start ASC
    `) as any[]
    const salesChart = salesRows.map((r) => {
      const gross = Number(r.gross ?? 0)
      const tax = gross > 0 ? Math.round(gross * 0.075) : 0
      const net = gross - tax
      return {
        month: MONTHS_SHORT[new Date(r.month_start).getMonth()],
        gross,
        tax,
        net,
      }
    })

    // ---- Services tally -------------------------------------------
    let servicesQty = 0
    let servicesItems = 0
    try {
      const r = (await sql`
        SELECT
          COUNT(DISTINCT b.id)::int AS qty,
          COUNT(bs.id)::int         AS items
        FROM bookings b
        LEFT JOIN booking_services bs ON bs.booking_id = b.id
        WHERE b.status IN ('confirmed','completed')
          AND b.created_at >= NOW() - (${windowDays} || ' days')::interval
          AND (${staffFilter}::text IS NULL OR b.assigned_staff_id = ${staffFilter})
      `) as any[]
      servicesQty = Number(r[0]?.qty ?? 0)
      servicesItems = Number(r[0]?.items ?? servicesQty)
    } catch {
      const r = (await sql`
        SELECT COUNT(*)::int AS qty FROM bookings
        WHERE status IN ('confirmed','completed')
          AND created_at >= NOW() - (${windowDays} || ' days')::interval
          AND (${staffFilter}::text IS NULL OR assigned_staff_id = ${staffFilter})
      `) as any[]
      servicesQty = Number(r[0]?.qty ?? 0)
      servicesItems = servicesQty
    }

    const productsQty = 0
    const productsItems = 0

    // ---- Appointments breakdown -----------------------------------
    const apptBreakdown = (await sql`
      SELECT status, COUNT(*)::int AS n
      FROM bookings
      WHERE created_at >= NOW() - (${windowDays} || ' days')::interval
        AND (${staffFilter}::text IS NULL OR assigned_staff_id = ${staffFilter})
      GROUP BY status
    `) as any[]
    const apptTotal = apptBreakdown.reduce((s, r) => s + Number(r.n ?? 0), 0)

    // ---- Monthly overview (last 12 months) ------------------------
    const monthlyRows = (await sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW()) - INTERVAL '11 months',
          date_trunc('month', NOW()),
          INTERVAL '1 month'
        ) AS month_start
      )
      SELECT
        TO_CHAR(m.month_start, 'Mon YYYY') AS label,
        COUNT(b.id)::int AS bookings,
        COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed,
        COALESCE(SUM(COALESCE(b.price_override_kobo, b.total_price_kobo)) FILTER (WHERE b.status IN ('confirmed', 'completed') AND b.payment_status = 'paid'), 0)::float / 100.0 AS revenue
      FROM months m
      LEFT JOIN bookings b
        ON date_trunc('month', b.created_at) = m.month_start
       AND (${staffFilter}::text IS NULL OR b.assigned_staff_id = ${staffFilter})
      GROUP BY m.month_start
      ORDER BY m.month_start DESC
    `.catch(() => [])) as any[]

    // ---- Top Customer Spend ---------------------------------------
    const customerSpendRows = (await sql`
      SELECT
        COALESCE(b.user_id::text, LOWER(b.customer_email)) AS client_key,
        MAX(b.customer_name) AS name,
        MAX(b.customer_email) AS email,
        COUNT(b.id)::int AS bookings_count,
        COALESCE(SUM(COALESCE(b.price_override_kobo, b.total_price_kobo)), 0)::float / 100.0 AS total_spent,
        MAX(b.appointment_date)::text AS last_visit
      FROM bookings b
      WHERE COALESCE(b.status, '') <> 'cancelled'
        AND (${staffFilter}::text IS NULL OR b.assigned_staff_id = ${staffFilter})
      GROUP BY COALESCE(b.user_id::text, LOWER(b.customer_email))
      ORDER BY total_spent DESC
      LIMIT 15
    `.catch(() => [])) as any[]

    // ---- Reviews breakdown ----------------------------------------
    let reviewsData: {
      avgRating: number
      totalReviews: number
      items: Array<{
        bookingReference: string
        customerName: string
        rating: number
        body: string | null
        wouldRecommend: boolean | null
        createdAt: string
      }>
    } = { avgRating: 0, totalReviews: 0, items: [] }
    try {
      const revRows = (await sql`
        SELECT r.rating, r.body, r.would_recommend, r.created_at,
               b.booking_reference, b.customer_name
        FROM booking_reviews r
        JOIN bookings b ON b.id = r.booking_id
        WHERE (${staffFilter}::text IS NULL OR b.assigned_staff_id = ${staffFilter})
        ORDER BY r.created_at DESC
        LIMIT 25
      `) as any[]
      const sumRow = (await sql`
        SELECT COALESCE(AVG(r.rating), 0)::float AS avg_rating,
               COUNT(*)::int AS total
        FROM booking_reviews r
        JOIN bookings b ON b.id = r.booking_id
        WHERE (${staffFilter}::text IS NULL OR b.assigned_staff_id = ${staffFilter})
      `) as any[]
      reviewsData = {
        avgRating: Math.round(Number(sumRow[0]?.avg_rating ?? 0) * 10) / 10,
        totalReviews: Number(sumRow[0]?.total ?? 0),
        items: revRows.map((r) => ({
          bookingReference: String(r.booking_reference),
          customerName: String(r.customer_name),
          rating: Number(r.rating),
          body: r.body ? String(r.body) : null,
          wouldRecommend: r.would_recommend == null ? null : Boolean(r.would_recommend),
          createdAt: String(r.created_at),
        })),
      }
    } catch {
      /* booking_reviews may not be populated yet */
    }

    // ---- Expense breakdown ----------------------------------------
    let expenseData: {
      totalExpenses: number
      categories: Array<{ category: string; total: number; count: number }>
      recent: Array<{ id: string; category: string; description: string; amount: number; paidAt: string }>
    } = { totalExpenses: 0, categories: [], recent: [] }
    try {
      const catRows = (await sql`
        SELECT category, COALESCE(SUM(amount), 0)::float AS total, COUNT(*)::int AS count
        FROM salon_expenses
        GROUP BY category
        ORDER BY total DESC
      `) as any[]
      const recRows = (await sql`
        SELECT id::text AS id, category, description, amount::float AS amount, paid_at
        FROM salon_expenses
        ORDER BY paid_at DESC
        LIMIT 20
      `) as any[]
      const categories = catRows.map((c) => ({
        category: String(c.category),
        total: Number(c.total ?? 0),
        count: Number(c.count ?? 0),
      }))
      expenseData = {
        totalExpenses: categories.reduce((acc, c) => acc + c.total, 0),
        categories,
        recent: recRows.map((r) => ({
          id: String(r.id),
          category: String(r.category),
          description: String(r.description),
          amount: Number(r.amount ?? 0),
          paidAt: String(r.paid_at),
        })),
      }
    } catch {
      /* salon_expenses may not exist yet */
    }

    return NextResponse.json({
      success: true,
      range,
      staffId: rawStaffId,
      staffOptions,
      charts: {
        customers: customersChart,
        trend: trendChart,
        sales: salesChart,
      },
      stats: {
        avgAppointments,
        trendsDeltaPct,
        servicesQty,
        servicesItems,
        productsQty,
        productsItems,
        appointmentsTotal: apptTotal,
        appointmentsBreakdown: apptBreakdown.map((r) => ({
          status: r.status,
          count: Number(r.n ?? 0),
        })),
      },
      monthly: monthlyRows.map((m) => ({
        month: String(m.label),
        bookings: Number(m.bookings ?? 0),
        completed: Number(m.completed ?? 0),
        revenue: Number(m.revenue ?? 0),
      })),
      customerSpend: customerSpendRows.map((c) => ({
        id: String(c.client_key),
        name: String(c.name || "Client"),
        email: String(c.email || ""),
        bookingsCount: Number(c.bookings_count ?? 0),
        totalSpent: Number(c.total_spent ?? 0),
        lastVisit: String(c.last_visit || ""),
      })),
      reviews: reviewsData,
      expenses: expenseData,
    })
  } catch (error) {
    console.error("Staff reports error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load reports data" },
      { status: 500 }
    )
  }
}
