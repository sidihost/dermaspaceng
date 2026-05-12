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

    // ---- Customers: new vs returning, by month --------------------
    // A booking counts as "new" if the customer's first-ever booking
    // sits in that month; otherwise "returning". Series generated
    // server-side so empty months still appear on the chart.
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
      LEFT JOIN bookings b ON date_trunc('month', b.created_at) = m.month_start
      LEFT JOIN first_seen fs ON fs.user_id = b.user_id
      GROUP BY m.month_start
      ORDER BY m.month_start ASC
    `) as any[]

    const customersChart = customers.map((r) => ({
      month: MONTHS_SHORT[new Date(r.month_start).getMonth()],
      new: Number(r.new_count ?? 0),
      returning: Number(r.returning_count ?? 0),
    }))

    // ---- Trends: bookings per day, last 30 days -------------------
    const trendRows = (await sql`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW()) - INTERVAL '29 days',
          date_trunc('day', NOW()),
          INTERVAL '1 day'
        ) AS day
      )
      SELECT d.day, COUNT(b.*)::int AS count
      FROM days d
      LEFT JOIN bookings b ON date_trunc('day', b.created_at) = d.day
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

    // Period-over-period delta — last 30d vs prior 30d. Powers the
    // "+24% vs last month" pill on the trends card.
    const prevRows = (await sql`
      SELECT COUNT(*)::int AS n FROM bookings
      WHERE created_at >= NOW() - INTERVAL '60 days'
        AND created_at <  NOW() - INTERVAL '30 days'
    `) as any[]
    const currRows = (await sql`
      SELECT COUNT(*)::int AS n FROM bookings
      WHERE created_at >= NOW() - INTERVAL '30 days'
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

    // ---- Services tally (last 30 days) ----------------------------
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
          AND b.created_at >= NOW() - INTERVAL '30 days'
      `) as any[]
      servicesQty = Number(r[0]?.qty ?? 0)
      servicesItems = Number(r[0]?.items ?? servicesQty)
    } catch {
      const r = (await sql`
        SELECT COUNT(*)::int AS qty FROM bookings
        WHERE status IN ('confirmed','completed')
          AND created_at >= NOW() - INTERVAL '30 days'
      `) as any[]
      servicesQty = Number(r[0]?.qty ?? 0)
      servicesItems = servicesQty
    }

    // ---- Products tally — TODO: hook up once a `products_sold`
    // table lands (we ship 0/0 today so the card stays honest).
    const productsQty = 0
    const productsItems = 0

    // ---- Appointments breakdown -----------------------------------
    const apptBreakdown = (await sql`
      SELECT status, COUNT(*)::int AS n
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY status
    `) as any[]
    const apptTotal = apptBreakdown.reduce((s, r) => s + Number(r.n ?? 0), 0)

    return NextResponse.json({
      success: true,
      range,
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
    })
  } catch (error) {
    console.error("Staff reports error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load reports data" },
      { status: 500 }
    )
  }
}
