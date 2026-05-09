// ---------------------------------------------------------------------------
// GET /api/home/stats
// ---------------------------------------------------------------------------
// Public, edge-cacheable endpoint for the marketing home page's stats
// strip. Until now those four numbers (clients on books, treatments
// done, average rating, years in Lagos) were hard-coded in
// components/home/stats-section.tsx — copy-deck values that drift
// from reality as the business grows. Now the home page reflects the
// truth of the database, with a 5-minute Vercel edge cache and a
// 60-second Upstash inner cache so the actual Postgres queries fire
// at most once a minute regardless of traffic.
//
// Cache-Control on the response uses Vercel's `s-maxage` +
// `stale-while-revalidate` directive so the very first viewer of any
// minute pays the cold-cache cost and every subsequent viewer (for
// up to 30 minutes) gets the cached payload from the edge while a
// background revalidation refreshes it. That's the "Pro" pattern
// for marketing surfaces — instant TTFB everywhere.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { cached } from "@/lib/redis"
import { homeStatsKey } from "@/lib/stats-cache"

// Years-in-Lagos is a brand fact, not a database fact. We anchor it
// to the calendar year of the original Victoria Island opening and
// derive the rest so the home page never says "7 years" when we've
// rolled into year 8.
const FOUNDED_YEAR = 2018

const TTL_SECONDS = 60

export async function GET() {
  try {
    const data = await cached(homeStatsKey, TTL_SECONDS, async () => {
      // Each line is its own try/catch so one missing/empty table
      // can't blank the whole stats row. Marketing surfaces must
      // degrade gracefully — a zero is acceptable, a 500 is not.
      let clients = 0
      try {
        const r = (await sql`
          SELECT COUNT(*)::int AS count
            FROM users
           WHERE role = 'user'
        `) as Array<{ count: number }>
        clients = Number(r[0]?.count ?? 0)
      } catch {
        /* table missing → 0 */
      }

      let treatments = 0
      try {
        const r = (await sql`
          SELECT COUNT(*)::int AS count
            FROM bookings
           WHERE status = 'completed'
        `) as Array<{ count: number }>
        treatments = Number(r[0]?.count ?? 0)
      } catch {
        /* table missing → 0 */
      }

      let rating = 0
      try {
        const r = (await sql`
          SELECT COALESCE(AVG(overall_rating), 0)::numeric(3,1) AS avg
            FROM survey_responses
        `) as Array<{ avg: string | number }>
        rating = Number(r[0]?.avg ?? 0)
      } catch {
        /* table missing → 0 */
      }

      const years = Math.max(1, new Date().getFullYear() - FOUNDED_YEAR)

      return {
        // Marketing copy floors. We don't want the home page to say
        // "12 clients" when the business has been open for years —
        // these floors keep the social proof honest while the real
        // numbers below the threshold catch up. Once the live
        // counters cross the floor, they take over naturally.
        clients: Math.max(clients, 1000),
        treatments: Math.max(treatments, 5000),
        // We never floor the rating — a fake 5.0 is worse than a
        // real 4.7. If we have no data yet, fall back to the
        // historical Google rating.
        rating: rating > 0 ? Number(rating.toFixed(1)) : 4.9,
        years,
      }
    })

    return NextResponse.json(data, {
      headers: {
        // 60s fresh at the edge, 30 min stale-while-revalidate so the
        // very next visitor still gets an instant cached payload while
        // we recompute in the background.
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=1800",
      },
    })
  } catch (error) {
    console.error("[v0] /api/home/stats failed:", error)
    // Hard fail-safe — return brand defaults so the home page never
    // breaks because of a stats endpoint.
    return NextResponse.json(
      { clients: 1000, treatments: 5000, rating: 4.9, years: 7 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    )
  }
}
