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

    // Feedback queue health — drives the new Feedback sidebar badge
    // so admins see at a glance when a customer has filed a survey
    // or review that hasn't been triaged yet. `new` is the row
    // count straight off the public submission flow; `unactioned`
    // is anything other than 'closed' so in_review and actioned
    // items still surface in the count until they're explicitly
    // closed. Wrapped in try/catch so an environment that hasn't
    // run script 200 (feedback_submissions) keeps loading the
    // dashboard for everything else.
    let feedbackNew = 0
    let feedbackUnactioned = 0
    try {
      const feedbackResult = await sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'new')::int                          AS new_count,
          COUNT(*) FILTER (WHERE status IN ('new', 'in_review'))::int          AS unactioned_count
        FROM feedback_submissions
      `
      feedbackNew = Number(feedbackResult[0].new_count) || 0
      feedbackUnactioned = Number(feedbackResult[0].unactioned_count) || 0
    } catch {
      /* table missing — keep zeroes */
    }

    // Tickets queue — split out from the combined "complaints" tally
    // above so the sidebar can drive a dedicated Tickets badge that
    // ONLY counts support_tickets rows (the unified inbox tally
    // remains under `complaints.open`). Mirrors the same defensive
    // try/catch pattern so a missing table doesn't take down stats.
    let ticketsOpen = 0
    try {
      const ticketsResult = await sql`
        SELECT COUNT(*) FILTER (
          WHERE status IN ('open', 'pending', 'in_progress')
        )::int AS open_count
        FROM support_tickets
      `
      ticketsOpen = Number(ticketsResult[0].open_count) || 0
    } catch {
      /* table missing — keep zero */
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

    // Newsletter subscribers — powers both the admin dashboard
    // Newsletter overview card / recent subscribers feed and the
    // sidebar badge when new visitors subscribe today.
    let newsletterTotal = 0
    let newsletterActive = 0
    let newsletterThisWeek = 0
    let newsletterTodayNew = 0
    let recentNewsletterSubscribers: Array<{
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      source: string
      status: string
      createdAt: string | null
    }> = []
    try {
      const nlCounts = await sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE COALESCE(status, 'active') = 'active')::int AS active,
          COUNT(*) FILTER (
            WHERE COALESCE(status, 'active') = 'active'
              AND created_at >= NOW() - INTERVAL '7 days'
          )::int AS this_week,
          COUNT(*) FILTER (
            WHERE COALESCE(status, 'active') = 'active'
              AND created_at >= DATE_TRUNC('day', NOW())
          )::int AS today_new
        FROM newsletter_subscribers
      `
      newsletterTotal = Number(nlCounts[0]?.total) || 0
      newsletterActive = Number(nlCounts[0]?.active) || 0
      newsletterThisWeek = Number(nlCounts[0]?.this_week) || 0
      newsletterTodayNew = Number(nlCounts[0]?.today_new) || 0

      const nlRecent = await sql`
        SELECT id, email, first_name, last_name, source, status, created_at
        FROM newsletter_subscribers
        WHERE COALESCE(status, 'active') = 'active'
        ORDER BY created_at DESC
        LIMIT 6
      `
      recentNewsletterSubscribers = nlRecent.map((r) => ({
        id: String(r.id),
        email: String(r.email),
        firstName: r.first_name ? String(r.first_name) : null,
        lastName: r.last_name ? String(r.last_name) : null,
        source: r.source ? String(r.source) : 'homepage',
        status: r.status ? String(r.status) : 'active',
        createdAt: r.created_at
          ? new Date(r.created_at as string).toISOString()
          : null,
      }))
    } catch {
      try {
        const nlFallback = await sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS this_week,
            COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('day', NOW()))::int AS today_new
          FROM newsletter_subscribers
        `
        newsletterTotal = Number(nlFallback[0]?.total) || 0
        newsletterActive = newsletterTotal
        newsletterThisWeek = Number(nlFallback[0]?.this_week) || 0
        newsletterTodayNew = Number(nlFallback[0]?.today_new) || 0

        const nlRecentFallback = await sql`
          SELECT id, email, created_at
          FROM newsletter_subscribers
          ORDER BY created_at DESC
          LIMIT 6
        `
        recentNewsletterSubscribers = nlRecentFallback.map((r) => ({
          id: String(r.id),
          email: String(r.email),
          firstName: null,
          lastName: null,
          source: 'homepage',
          status: 'active',
          createdAt: r.created_at
            ? new Date(r.created_at as string).toISOString()
            : null,
        }))
      } catch {
        /* table missing — keep zeroes */
      }
    }

    // ── Sales aggregate ─────────────────────────────────────────
    // Drives the new Sales chart on the admin dashboard. We bucket
    // by calendar month over the last 12 months and only count
    // bookings whose payment cleared. Gross is the raw price the
    // customer paid; net subtracts the standard VAT rate
    // (constants kept here so we don't depend on a finance module
    // shape that may not exist on every environment yet) so the
    // legend can show the same Gross / Tax / Net breakdown the
    // staff /reports page shows. Wrapped in try/catch because old
    // environments may not have the bookings table; on miss we
    // return an empty 12-month skeleton so the chart still renders.
    const VAT_RATE = 0.075 // 7.5% Nigerian VAT.
    let salesTrend: Array<{
      month: string
      gross: number
      tax: number
      net: number
    }> = []
    let salesSummary = {
      grossThisMonth: 0,
      grossLastMonth: 0,
      growth: 0,
    }
    try {
      const salesRows = await sql`
        WITH months AS (
          SELECT generate_series(
            DATE_TRUNC('month', NOW()) - INTERVAL '11 months',
            DATE_TRUNC('month', NOW()),
            INTERVAL '1 month'
          )::date AS month_start
        )
        SELECT
          TO_CHAR(m.month_start, 'YYYY-MM') AS month_key,
          TO_CHAR(m.month_start, 'Mon')      AS month_label,
          COALESCE(SUM(
            CASE
              WHEN b.payment_status = 'paid'
                THEN COALESCE(b.total_price_kobo, 0)
              ELSE 0
            END
          ), 0)::bigint AS gross_kobo
        FROM months m
        LEFT JOIN bookings b
          ON DATE_TRUNC('month', b.created_at) = m.month_start
        GROUP BY m.month_start
        ORDER BY m.month_start ASC
      `
      salesTrend = salesRows.map((r) => {
        // Convert kobo → naira at the API boundary so the client
        // never has to remember the unit.
        const gross = Number(r.gross_kobo ?? 0) / 100
        const net = gross / (1 + VAT_RATE)
        const tax = gross - net
        return {
          month: String(r.month_label ?? r.month_key ?? ''),
          gross: Math.round(gross),
          tax: Math.round(tax),
          net: Math.round(net),
        }
      })
      // Headline summary — current month vs last month gross.
      // Used by the chart card sub-line ("+18% vs last month").
      if (salesTrend.length >= 2) {
        const last = salesTrend[salesTrend.length - 1]
        const prev = salesTrend[salesTrend.length - 2]
        salesSummary.grossThisMonth = last.gross
        salesSummary.grossLastMonth = prev.gross
        salesSummary.growth = prev.gross > 0
          ? Math.round(((last.gross - prev.gross) / prev.gross) * 100)
          : last.gross > 0 ? 100 : 0
      }
    } catch {
      // Bookings table missing — leave salesTrend empty. The chart
      // renders an empty state in that case.
    }

    // Pending transactions awaiting verification / reconciliation / cancel
    let pendingTxCount = 0
    let pendingTxAmount = 0
    try {
      const pendingTxRows = await sql`
        SELECT
          COUNT(*)::int AS count,
          COALESCE(SUM(amount), 0)::bigint AS total_amount
        FROM transactions
        WHERE status = 'pending'
      `
      pendingTxCount = Number(pendingTxRows[0]?.count) || 0
      pendingTxAmount = Number(pendingTxRows[0]?.total_amount) || 0
    } catch {
      /* transactions table missing — keep zeroes */
    }

    // Active members celebrating their birthday today (Africa/Lagos)
    let birthdaysToday: Array<{
      id: string
      firstName: string
      lastName: string
      email: string
    }> = []
    try {
      const bdayRows = await sql`
        SELECT id, first_name, last_name, email
        FROM users
        WHERE date_of_birth IS NOT NULL
          AND COALESCE(is_active, true) = true
          AND (
            (
              EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Africa/Lagos'))
              AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Africa/Lagos'))
            )
            OR (
              EXTRACT(MONTH FROM date_of_birth) = 2
              AND EXTRACT(DAY FROM date_of_birth) = 29
              AND EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Africa/Lagos')) = 2
              AND EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Africa/Lagos')) = 28
              AND EXTRACT(MONTH FROM ((NOW() AT TIME ZONE 'Africa/Lagos') + INTERVAL '1 day')) = 3
            )
          )
        ORDER BY first_name ASC
        LIMIT 10
      `
      birthdaysToday = bdayRows.map((r) => ({
        id: String(r.id),
        firstName: String(r.first_name || ''),
        lastName: String(r.last_name || ''),
        email: String(r.email || ''),
      }))
    } catch {
      /* users.date_of_birth query error — leave empty */
    }

    // Today's appointments in Africa/Lagos
    let todayBookingsCount = 0
    let todayBookingsItems: Array<{
      id: string
      bookingReference: string
      appointmentTime: string
      locationName: string
      customerName: string
      status: string
    }> = []
    try {
      const todayCountRows = await sql`
        SELECT COUNT(*)::int AS total
        FROM bookings
        WHERE appointment_date = (NOW() AT TIME ZONE 'Africa/Lagos')::date
          AND status IN ('pending', 'confirmed')
      `
      todayBookingsCount = Number(todayCountRows[0]?.total) || 0

      const todayRows = await sql`
        SELECT id, booking_reference, appointment_time, location_name, customer_name, status
        FROM bookings
        WHERE appointment_date = (NOW() AT TIME ZONE 'Africa/Lagos')::date
          AND status IN ('pending', 'confirmed')
        ORDER BY appointment_time ASC
        LIMIT 5
      `
      todayBookingsItems = todayRows.map((r) => ({
        id: String(r.id),
        bookingReference: String(r.booking_reference || ''),
        appointmentTime: String(r.appointment_time || ''),
        locationName: String(r.location_name || ''),
        customerName: String(r.customer_name || ''),
        status: String(r.status || 'pending'),
      }))
    } catch {
      /* bookings table missing — keep empty */
    }

    // Latest staff actions from activity_log
    let recentStaffActivity: Array<{
      id: string
      staffId: string
      actorName: string
      actorRole: string
      actionType: string
      entityType: string
      description: string
      createdAt: string
    }> = []
    try {
      const actRows = await sql`
        SELECT
          al.id,
          al.staff_id,
          TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')) AS actor_name,
          COALESCE(s.role, 'staff') AS actor_role,
          COALESCE(al.action_type, al.action, 'action') AS action_type,
          COALESCE(al.entity_type, 'record') AS entity_type,
          COALESCE(al.description, al.details, '') AS description,
          al.created_at
        FROM activity_log al
        LEFT JOIN users s ON s.id = al.staff_id
        WHERE al.staff_id IS NOT NULL
        ORDER BY al.created_at DESC
        LIMIT 5
      `
      recentStaffActivity = actRows.map((r) => ({
        id: String(r.id),
        staffId: String(r.staff_id),
        actorName: String(r.actor_name || '').trim() || 'Team member',
        actorRole: String(r.actor_role || 'staff'),
        actionType: String(r.action_type || 'action'),
        entityType: String(r.entity_type || 'record'),
        description: String(r.description || ''),
        createdAt: r.created_at
          ? new Date(r.created_at as string).toISOString()
          : new Date().toISOString(),
      }))
    } catch {
      /* activity_log missing or variant — leave empty */
    }

    let appealsPending = 0
    try {
      const appealsRows = await sql`
        SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
        FROM account_appeals
      `
      appealsPending = Number(appealsRows[0]?.pending) || 0
    } catch {
      /* account_appeals table not yet initialized */
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
        },
        tickets: {
          open: ticketsOpen,
        },
        feedback: {
          new: feedbackNew,
          unactioned: feedbackUnactioned,
        },
        newsletter: {
          total: newsletterTotal,
          active: newsletterActive,
          thisWeek: newsletterThisWeek,
          todayNew: newsletterTodayNew,
          recentSubscribers: recentNewsletterSubscribers,
        },
        pendingTransactions: {
          count: pendingTxCount,
          totalAmount: pendingTxAmount,
        },
        birthdaysToday,
        todayBookings: {
          count: todayBookingsCount,
          items: todayBookingsItems,
        },
        recentStaffActivity,
        appeals: {
          pending: appealsPending,
        },
      },
      revenue: salesSummary,
      charts: {
        userTrend: userTrendResult.map(row => ({
          date: row.date,
          count: Number(row.count)
        })),
        salesTrend,
      }
    }
}
