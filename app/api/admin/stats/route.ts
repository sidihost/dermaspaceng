import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'
import { cached, KEYS } from '@/lib/redis'

const sql = neon(process.env.DATABASE_URL!)

// 60-second cache window. Admins reload the dashboard frequently while
// triaging — a minute-old aggregate is plenty fresh, and the 8 SUM/COUNT
// queries underneath this endpoint cost real Postgres seconds when there
// are tens of thousands of rows. The cache is shared across every
// serverless instance via Upstash Redis so a single warm request makes
// every subsequent admin's load instantaneous.
const STATS_TTL_SECONDS = 60

export async function GET() {
  try {
    await requireAdmin()

    return NextResponse.json(
      await cached(KEYS.adminStats, STATS_TTL_SECONDS, computeAdminStats),
    )
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}

async function computeAdminStats() {
    // Get total users count, recent (7d), this/last month for growth %,
    // and "today" — the latter drives the green "new today" badge on
    // the Users sidebar item, so admins see at a glance whether anyone
    // signed up since they last looked. We compare against a calendar
    // day in UTC, not "last 24 hours", so the count resets at midnight
    // and matches what the Users page itself reports.
    const usersResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as last_month,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('day', NOW())) as today_new
      FROM users WHERE role = 'user'
    `

    // Get consultations stats
    const consultationsResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week
      FROM consultations
    `

    // Complaints + support tickets share the admin inbox, so the dashboard
    // counter has to include both sources. Using a UNION ALL sub-select so
    // the outer aggregate is a single row.
    const complaintsResult = await sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('open', 'pending', 'in_progress')) AS open,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
      FROM (
        SELECT COALESCE(status, 'open') AS status FROM contact_messages
        UNION ALL
        SELECT COALESCE(status, 'open') AS status FROM support_tickets
      ) combined
    `

    // Get gift card requests stats
    const giftCardsResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_value
      FROM gift_card_requests
    `

    // Get survey responses stats
    const surveysResult = await sql`
      SELECT 
        COUNT(*) as total,
        AVG(overall_rating) as avg_rating,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week
      FROM survey_responses
    `

    // Get recent user registrations for chart (last 30 days)
    const userTrendResult = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Bookings-per-week trend, last 8 weeks, broken out by status so
    // the admin bar chart can stack completed vs upcoming/pending vs
    // cancelled. We bucket by Monday-anchored week so the labels
    // match what the staff trend chart shows. Defensive try/catch:
    // pre-300 environments don't have the bookings table.
    let bookingsTrend: Array<{
      week: string
      completed: number
      upcoming: number
      cancelled: number
    }> = []
    try {
      const r = (await sql`
        SELECT
          TO_CHAR(DATE_TRUNC('week', appointment_date), 'YYYY-MM-DD') AS week,
          COUNT(*) FILTER (WHERE status = 'completed')::int            AS completed,
          COUNT(*) FILTER (WHERE status IN ('pending','confirmed'))::int AS upcoming,
          COUNT(*) FILTER (WHERE status IN ('cancelled','no_show'))::int AS cancelled
        FROM bookings
        WHERE appointment_date >= (CURRENT_DATE - INTERVAL '8 weeks')
        GROUP BY 1
        ORDER BY 1 ASC
      `) as any[]
      bookingsTrend = r.map((row) => ({
        week: row.week,
        completed: Number(row.completed) || 0,
        upcoming: Number(row.upcoming) || 0,
        cancelled: Number(row.cancelled) || 0,
      }))
    } catch {
      /* bookings table missing on legacy envs — leave empty */
    }

    // Get staff count
    const staffResult = await sql`
      SELECT COUNT(*) as total FROM users WHERE role IN ('staff', 'admin')
    `

    // Live chat queue health. `waiting` is the number of customers
    // currently waiting to be picked up by a representative — the
    // urgent count that drives the Live Chat sidebar badge. `active`
    // is included so the dashboard tile can show "X waiting · Y in
    // progress" once we surface it there too. Wrapped in a defensive
    // try/catch because the live_chat_sessions table may not exist on
    // very old environments that haven't run migration 310 yet, and
    // we don't want a missing table to take down the whole stats
    // endpoint.
    let liveChatWaiting = 0
    let liveChatActive = 0
    try {
      const liveChatResult = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'waiting')::int AS waiting,
          COUNT(*) FILTER (WHERE status = 'active')::int  AS active
        FROM live_chat_sessions
      `
      liveChatWaiting = Number(liveChatResult[0].waiting) || 0
      liveChatActive  = Number(liveChatResult[0].active) || 0
    } catch {
      // Table missing or query error — leave counts at 0.
    }

    // Bookings queue health. `pending` drives the Bookings sidebar
    // badge — pending = paid but unconfirmed, the rows admins need
    // to triage right now. `upcoming` is the count of confirmed
    // bookings landing today or later, surfaced for the
    // /admin/bookings summary tile. Wrapped in try/catch so an
    // environment that hasn't run migration 300 yet still gets
    // stats for everything else.
    let bookingsPending = 0
    let bookingsUpcoming = 0
    try {
      const bookingsResult = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (
            WHERE status = 'confirmed'
              AND appointment_date >= (NOW() AT TIME ZONE 'Africa/Lagos')::date
          )::int                                          AS upcoming
        FROM bookings
      `
      bookingsPending = Number(bookingsResult[0].pending) || 0
      bookingsUpcoming = Number(bookingsResult[0].upcoming) || 0
    } catch {
      /* table missing — keep zeroes */
    }

    // Calculate user growth percentage
    const users = usersResult[0]
    const userGrowth = users.last_month > 0 
      ? Math.round(((Number(users.this_month) - Number(users.last_month)) / Number(users.last_month)) * 100)
      : 100

    return {
      stats: {
        users: {
          total: Number(users.total),
          recent: Number(users.recent),
          todayNew: Number(users.today_new) || 0,
          growth: userGrowth
        },
        consultations: {
          total: Number(consultationsResult[0].total),
          pending: Number(consultationsResult[0].pending),
          thisWeek: Number(consultationsResult[0].this_week)
        },
        complaints: {
          total: Number(complaintsResult[0].total),
          open: Number(complaintsResult[0].open),
          resolved: Number(complaintsResult[0].resolved)
        },
        giftCards: {
          total: Number(giftCardsResult[0].total),
          pending: Number(giftCardsResult[0].pending),
          totalValue: Number(giftCardsResult[0].total_value) || 0
        },
        surveys: {
          total: Number(surveysResult[0].total),
          avgRating: Number(surveysResult[0].avg_rating) || 0,
          thisWeek: Number(surveysResult[0].this_week)
        },
        staff: {
          total: Number(staffResult[0].total)
        },
        liveChat: {
          waiting: liveChatWaiting,
          active: liveChatActive,
        },
        bookings: {
          pending: bookingsPending,
          upcoming: bookingsUpcoming,
        }
      },
      charts: {
        userTrend: userTrendResult.map(row => ({
          date: row.date,
          count: Number(row.count)
        })),
        bookingsTrend,
      }
    }
}
