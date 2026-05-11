import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

// Operations feed — single round trip that backs the four
// dashboard widgets the admin lands on:
//   1. Revenue Overview  — today / this week / this month, split by service category
//   2. Staff Performance — ranked list of staff by sessions completed and revenue generated this week
//   3. Platform Health   — active users right now, server status, pending system alerts
//   4. Security Log      — recent firewall blocks (IP, attack pattern, timestamp)
//
// We deliberately co-locate these in one endpoint because they all
// poll on the same dashboard. Four parallel SQL statements is the
// same wall-clock cost as four roundtripped requests, but uses 4×
// fewer auth/middleware passes and renders atomically.
export const dynamic = 'force-dynamic'

type CategoryRevenue = {
  category: string
  amount_kobo: number
  bookings: number
}
type Revenue = {
  today: { total_kobo: number; bookings: number; by_category: CategoryRevenue[] }
  this_week: { total_kobo: number; bookings: number; by_category: CategoryRevenue[] }
  this_month: { total_kobo: number; bookings: number; by_category: CategoryRevenue[] }
}
type StaffRow = {
  staff_id: string
  name: string
  role: string
  avatar_url: string | null
  sessions_completed: number
  revenue_kobo: number
}
type Alert = {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  created_at: string
}
type FirewallBlock = {
  id: number
  ip_address: string
  pattern: string
  path: string | null
  method: string | null
  user_agent: string | null
  created_at: string
}
type Health = {
  active_users_now: number
  active_admin_now: number
  active_staff_now: number
  pending_payments: number
  failed_bookings_24h: number
  server_status: 'operational' | 'degraded' | 'outage'
  alerts: Alert[]
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    // Run every query in parallel. Each one is independent and the
    // database is the bottleneck, not Node.
    const [
      revToday,
      revWeek,
      revMonth,
      revTodayCats,
      revWeekCats,
      revMonthCats,
      staffPerf,
      activeSessions,
      pendingPayRow,
      failedBookingsRow,
      firewallRows,
    ] = await Promise.all([
      // Revenue — totals, scoped to PAID bookings only so we don't
      // count carts/pending intents as money in the bank.
      sql`
        SELECT
          COALESCE(SUM(total_price_kobo), 0)::bigint AS total_kobo,
          COUNT(*)::int AS bookings
        FROM bookings
        WHERE payment_status = 'paid'
          AND appointment_date = CURRENT_DATE
      `,
      sql`
        SELECT
          COALESCE(SUM(total_price_kobo), 0)::bigint AS total_kobo,
          COUNT(*)::int AS bookings
        FROM bookings
        WHERE payment_status = 'paid'
          AND appointment_date >= date_trunc('week', CURRENT_DATE)::date
          AND appointment_date <  (date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::date
      `,
      sql`
        SELECT
          COALESCE(SUM(total_price_kobo), 0)::bigint AS total_kobo,
          COUNT(*)::int AS bookings
        FROM bookings
        WHERE payment_status = 'paid'
          AND appointment_date >= date_trunc('month', CURRENT_DATE)::date
          AND appointment_date <  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
      `,
      // Per-category breakdowns. We join booking_services (which
      // carries category_name on each line item) so a multi-service
      // booking attributes revenue to the right buckets.
      sql`
        SELECT
          COALESCE(bs.category_name, 'Uncategorised') AS category,
          COALESCE(SUM(bs.price_kobo), 0)::bigint   AS amount_kobo,
          COUNT(DISTINCT b.id)::int                  AS bookings
        FROM bookings b
        JOIN booking_services bs ON bs.booking_id = b.id
        WHERE b.payment_status = 'paid'
          AND b.appointment_date = CURRENT_DATE
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 8
      `,
      sql`
        SELECT
          COALESCE(bs.category_name, 'Uncategorised') AS category,
          COALESCE(SUM(bs.price_kobo), 0)::bigint   AS amount_kobo,
          COUNT(DISTINCT b.id)::int                  AS bookings
        FROM bookings b
        JOIN booking_services bs ON bs.booking_id = b.id
        WHERE b.payment_status = 'paid'
          AND b.appointment_date >= date_trunc('week', CURRENT_DATE)::date
          AND b.appointment_date <  (date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::date
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 8
      `,
      sql`
        SELECT
          COALESCE(bs.category_name, 'Uncategorised') AS category,
          COALESCE(SUM(bs.price_kobo), 0)::bigint   AS amount_kobo,
          COUNT(DISTINCT b.id)::int                  AS bookings
        FROM bookings b
        JOIN booking_services bs ON bs.booking_id = b.id
        WHERE b.payment_status = 'paid'
          AND b.appointment_date >= date_trunc('month', CURRENT_DATE)::date
          AND b.appointment_date <  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 8
      `,
      // Staff performance this week — sessions = completed bookings
      // they were assigned to, revenue = sum of paid bookings on
      // those sessions. We left-join users so newly-onboarded staff
      // with zero sessions still appear (with zeros) instead of
      // vanishing from the leaderboard.
      sql`
        SELECT
          u.id                                              AS staff_id,
          TRIM(CONCAT(u.first_name, ' ', u.last_name))      AS name,
          u.role,
          u.avatar_url,
          COALESCE(SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END), 0)::int AS sessions_completed,
          COALESCE(SUM(
            CASE WHEN b.payment_status = 'paid' AND b.status = 'completed'
                 THEN b.total_price_kobo ELSE 0 END
          ), 0)::bigint                                     AS revenue_kobo
        FROM users u
        LEFT JOIN bookings b
          ON b.assigned_staff_id = u.id
          AND b.appointment_date >= date_trunc('week', CURRENT_DATE)::date
          AND b.appointment_date <  (date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::date
        WHERE u.role IN ('staff', 'admin') AND u.is_active = true
        GROUP BY u.id, u.first_name, u.last_name, u.role, u.avatar_url
        ORDER BY sessions_completed DESC, revenue_kobo DESC
        LIMIT 12
      `,
      // Platform health
      sql`
        SELECT
          COUNT(DISTINCT s.user_id)::int                                            AS total_active,
          COUNT(DISTINCT CASE WHEN u.role = 'admin' THEN s.user_id END)::int        AS active_admin,
          COUNT(DISTINCT CASE WHEN u.role = 'staff' THEN s.user_id END)::int        AS active_staff
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.expires_at > NOW()
      `,
      sql`SELECT COUNT(*)::int AS n FROM bookings WHERE payment_status = 'pending'`,
      sql`SELECT COUNT(*)::int AS n FROM bookings
          WHERE payment_status = 'failed' AND payment_failed_at > NOW() - INTERVAL '24 hours'`,
      // Security log — last 25 firewall blocks. The table uses
      // `ip` (text), `reason` (verdict tag), `blocked_at` as defined
      // in scripts/610-firewall-blocks.sql.
      sql`
        SELECT
          id,
          COALESCE(ip, '?')         AS ip_address,
          reason                    AS pattern,
          path,
          method,
          user_agent,
          blocked_at                AS created_at
        FROM firewall_blocks
        ORDER BY blocked_at DESC
        LIMIT 25
      `,
    ])

    const bucket = (
      total: Array<Record<string, unknown>>,
      cats: Array<Record<string, unknown>>,
    ) => ({
      total_kobo: Number(total[0]?.total_kobo ?? 0),
      bookings: Number(total[0]?.bookings ?? 0),
      by_category: cats.map((c) => ({
        category: String(c.category ?? 'Uncategorised'),
        amount_kobo: Number(c.amount_kobo ?? 0),
        bookings: Number(c.bookings ?? 0),
      })) as CategoryRevenue[],
    })

    const revenue: Revenue = {
      today: bucket(revToday as Array<Record<string, unknown>>, revTodayCats as Array<Record<string, unknown>>),
      this_week: bucket(revWeek as Array<Record<string, unknown>>, revWeekCats as Array<Record<string, unknown>>),
      this_month: bucket(revMonth as Array<Record<string, unknown>>, revMonthCats as Array<Record<string, unknown>>),
    }

    const staff: StaffRow[] = (staffPerf as Array<Record<string, unknown>>).map((r) => ({
      staff_id: String(r.staff_id),
      name: String(r.name || 'Team member'),
      role: String(r.role),
      avatar_url: (r.avatar_url as string | null) ?? null,
      sessions_completed: Number(r.sessions_completed ?? 0),
      revenue_kobo: Number(r.revenue_kobo ?? 0),
    }))

    // Build alerts dynamically — these are operational hot spots
    // worth surfacing without paging the admin.
    const alerts: Alert[] = []
    const pendingPayments = Number((pendingPayRow as Array<Record<string, unknown>>)[0]?.n ?? 0)
    const failed24h = Number((failedBookingsRow as Array<Record<string, unknown>>)[0]?.n ?? 0)
    if (pendingPayments > 0) {
      alerts.push({
        id: 'pending-payments',
        severity: pendingPayments > 25 ? 'warning' : 'info',
        message: `${pendingPayments} booking${pendingPayments === 1 ? '' : 's'} awaiting payment confirmation`,
        created_at: new Date().toISOString(),
      })
    }
    if (failed24h > 0) {
      alerts.push({
        id: 'failed-payments',
        severity: failed24h > 5 ? 'critical' : 'warning',
        message: `${failed24h} payment${failed24h === 1 ? '' : 's'} failed in the last 24 hours`,
        created_at: new Date().toISOString(),
      })
    }
    const firewallCount = (firewallRows as Array<Record<string, unknown>>).length
    if (firewallCount >= 10) {
      alerts.push({
        id: 'firewall-spike',
        severity: 'warning',
        message: `${firewallCount} firewall blocks recorded recently — review the security log`,
        created_at: new Date().toISOString(),
      })
    }

    const active = (activeSessions as Array<Record<string, unknown>>)[0] ?? {}
    const health: Health = {
      active_users_now: Number(active.total_active ?? 0),
      active_admin_now: Number(active.active_admin ?? 0),
      active_staff_now: Number(active.active_staff ?? 0),
      pending_payments: pendingPayments,
      failed_bookings_24h: failed24h,
      server_status: failed24h > 10 ? 'degraded' : 'operational',
      alerts,
    }

    const security: FirewallBlock[] = (firewallRows as Array<Record<string, unknown>>).map((r) => ({
      id: Number(r.id),
      ip_address: String(r.ip_address ?? ''),
      pattern: String(r.pattern ?? 'unknown'),
      path: (r.path as string | null) ?? null,
      method: (r.method as string | null) ?? null,
      user_agent: (r.user_agent as string | null) ?? null,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }))

    return NextResponse.json({ revenue, staff, health, security })
  } catch (error) {
    console.error('[admin operations] failed:', error)
    return NextResponse.json({ error: 'failed to load operations feed' }, { status: 500 })
  }
}
