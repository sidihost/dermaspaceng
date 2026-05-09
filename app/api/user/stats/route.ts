// ---------------------------------------------------------------------------
// GET /api/user/stats
// ---------------------------------------------------------------------------
// Per-user dashboard aggregates + chart data. Powers the bar charts
// on /dashboard. Cached per-user in Upstash for 30 seconds so the
// SWR poll on the client (refresh-on-focus + 30s interval) is cheap
// and the actual SQL fan-out runs at most once every 30s per user.
//
// Returns:
//   * totals.bookings           — lifetime confirmed/completed count
//   * totals.completed          — lifetime completed
//   * totals.spendKobo          — lifetime spend in kobo (paid only)
//   * totals.points             — current loyalty points
//   * totals.upcoming           — count of upcoming confirmed bookings
//   * charts.bookingsByMonth[]  — last 6 months: { month, count, spendKobo }
//   * charts.spendByMonth[]     — alias of above with spendKobo only
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { cached } from "@/lib/redis"
import { userStatsKey } from "@/lib/stats-cache"

const TTL_SECONDS = 30

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await cached(userStatsKey(user.id), TTL_SECONDS, async () => {
      // Lifetime totals — single row, all aggregates, all in one
      // round-trip so the dashboard's "stats hero" tiles render in
      // the same flush as the chart.
      let totals = { bookings: 0, completed: 0, spendKobo: 0, upcoming: 0 }
      try {
        const r = (await sql`
          SELECT
            COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed', 'pending'))::int AS bookings,
            COUNT(*) FILTER (WHERE status = 'completed')::int                            AS completed,
            COALESCE(SUM(
              CASE WHEN status = 'completed' AND payment_status = 'paid'
                   THEN COALESCE(price_override_kobo, total_price_kobo)
                   ELSE 0
              END
            ), 0)::bigint                                                                AS spend_kobo,
            COUNT(*) FILTER (
              WHERE status IN ('pending', 'confirmed')
                AND appointment_date >= CURRENT_DATE
            )::int                                                                        AS upcoming
          FROM bookings
          WHERE user_id = ${user.id}
        `) as Array<{
          bookings: number
          completed: number
          spend_kobo: string | number
          upcoming: number
        }>
        totals = {
          bookings: Number(r[0]?.bookings ?? 0),
          completed: Number(r[0]?.completed ?? 0),
          spendKobo: Number(r[0]?.spend_kobo ?? 0),
          upcoming: Number(r[0]?.upcoming ?? 0),
        }
      } catch (err) {
        console.warn("[v0] /api/user/stats totals failed:", err)
      }

      // Per-month breakdown for the bar chart. We bucket by the
      // first-of-month so two bookings in the same month collapse
      // to one bar, and we ALWAYS return the last 6 months even
      // if the user has zero in some of them — a sparse axis
      // looks broken on a chart.
      const months: Array<{ month: string; label: string }> = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
          month: d.toISOString().slice(0, 7), // "2025-04"
          label: d.toLocaleString("en-NG", { month: "short" }),
        })
      }

      let bookingsByMonth: Array<{
        month: string
        label: string
        count: number
        spendKobo: number
      }> = months.map((m) => ({ ...m, count: 0, spendKobo: 0 }))

      try {
        const r = (await sql`
          SELECT
            TO_CHAR(DATE_TRUNC('month', appointment_date), 'YYYY-MM') AS month,
            COUNT(*)::int AS count,
            COALESCE(SUM(
              CASE WHEN status = 'completed' AND payment_status = 'paid'
                   THEN COALESCE(price_override_kobo, total_price_kobo)
                   ELSE 0
              END
            ), 0)::bigint AS spend_kobo
          FROM bookings
          WHERE user_id = ${user.id}
            AND appointment_date >= (CURRENT_DATE - INTERVAL '6 months')
            AND status IN ('confirmed', 'completed', 'pending')
          GROUP BY 1
          ORDER BY 1 ASC
        `) as Array<{
          month: string
          count: number
          spend_kobo: string | number
        }>
        const map = new Map(r.map((row) => [row.month, row]))
        bookingsByMonth = months.map((m) => {
          const hit = map.get(m.month)
          return {
            ...m,
            count: Number(hit?.count ?? 0),
            spendKobo: Number(hit?.spend_kobo ?? 0),
          }
        })
      } catch (err) {
        console.warn("[v0] /api/user/stats trend failed:", err)
      }

      // Loyalty points — separate query because the table is
      // opt-in (only present once migration 350-loyalty-program.sql
      // has run). Wrap so a missing table doesn't 500 the dashboard.
      let points = 0
      try {
        const r = (await sql`
          SELECT COALESCE(points_balance, 0)::int AS points
            FROM loyalty_accounts
           WHERE user_id = ${user.id}
           LIMIT 1
        `) as Array<{ points: number }>
        points = Number(r[0]?.points ?? 0)
      } catch {
        /* loyalty table missing → 0 points */
      }

      return {
        totals: { ...totals, points },
        charts: {
          bookingsByMonth,
        },
      }
    })

    return NextResponse.json(data, {
      headers: {
        // Per-user, must NOT cache at the edge or one user's payload
        // would leak to another. The 30s Upstash inner cache is
        // already plenty.
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[v0] /api/user/stats failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    )
  }
}
