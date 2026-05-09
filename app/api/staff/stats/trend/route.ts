// ---------------------------------------------------------------------------
// GET /api/staff/stats/trend
// ---------------------------------------------------------------------------
// Per-staff bookings-per-week trend for the staff dashboard's bar
// chart. Returns the last 8 weeks (including the current one) of
// bookings the staff member was assigned to, broken out by status so
// the chart can stack "completed" vs "upcoming/pending" bars.
//
// Cached per-staff in Upstash for 60s. Invalidated whenever a
// booking is assigned, status-changed, or completed via
// `lib/stats-cache.invalidateStaffTrend(staffUserId)`.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"
import { cached } from "@/lib/redis"
import { staffTrendKey } from "@/lib/stats-cache"

const TTL_SECONDS = 60
const WEEKS = 8

export async function GET() {
  try {
    const me = await requireAdminOrStaff()

    const data = await cached(staffTrendKey(me.id), TTL_SECONDS, async () => {
      // Build the last 8 weeks (Mon-anchored) up front so empty
      // weeks still render a zero bar instead of a gap on the axis.
      const buckets: Array<{ week: string; label: string }> = []
      const now = new Date()
      // Start of this week (UTC, Mon).
      const day = now.getUTCDay() || 7
      const monday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1),
      )
      for (let i = WEEKS - 1; i >= 0; i--) {
        const d = new Date(monday)
        d.setUTCDate(d.getUTCDate() - i * 7)
        buckets.push({
          week: d.toISOString().slice(0, 10),
          label: d.toLocaleString("en-NG", { month: "short", day: "numeric" }),
        })
      }

      let weekly: Array<{
        week: string
        label: string
        completed: number
        upcoming: number
      }> = buckets.map((b) => ({ ...b, completed: 0, upcoming: 0 }))

      try {
        const r = (await sql`
          SELECT
            TO_CHAR(DATE_TRUNC('week', appointment_date), 'YYYY-MM-DD') AS week,
            COUNT(*) FILTER (WHERE status = 'completed')::int             AS completed,
            COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed'))::int AS upcoming
          FROM bookings
          WHERE assigned_staff_id = ${me.id}
            AND appointment_date >= (CURRENT_DATE - INTERVAL '8 weeks')
          GROUP BY 1
          ORDER BY 1 ASC
        `) as Array<{
          week: string
          completed: number
          upcoming: number
        }>
        const map = new Map(r.map((row) => [row.week, row]))
        weekly = buckets.map((b) => {
          const hit = map.get(b.week)
          return {
            ...b,
            completed: Number(hit?.completed ?? 0),
            upcoming: Number(hit?.upcoming ?? 0),
          }
        })
      } catch (err) {
        console.warn("[v0] /api/staff/stats/trend query failed:", err)
      }

      // Lifetime totals for the staff hero tiles.
      let totals = { completed: 0, upcoming: 0, thisWeek: 0 }
      try {
        const r = (await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'completed')::int                                  AS completed,
            COUNT(*) FILTER (
              WHERE status IN ('pending','confirmed') AND appointment_date >= CURRENT_DATE
            )::int                                                                              AS upcoming,
            COUNT(*) FILTER (
              WHERE appointment_date >= DATE_TRUNC('week', CURRENT_DATE)
            )::int                                                                              AS this_week
          FROM bookings
          WHERE assigned_staff_id = ${me.id}
        `) as Array<{
          completed: number
          upcoming: number
          this_week: number
        }>
        totals = {
          completed: Number(r[0]?.completed ?? 0),
          upcoming: Number(r[0]?.upcoming ?? 0),
          thisWeek: Number(r[0]?.this_week ?? 0),
        }
      } catch {
        /* per-staff trend isn't critical, leave zeros */
      }

      return { totals, charts: { weekly } }
    })

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    console.error("[v0] /api/staff/stats/trend failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch trend" },
      { status: 500 },
    )
  }
}
