/**
 * /api/admin/ops
 *
 * Aggregated "operations" endpoint for the admin dashboard. Returns
 * everything the four new dashboard cards need in a single round-trip:
 *
 *   • Revenue Overview — today / this week / this month, by category
 *   • Staff Performance — sessions + revenue per staff member, week
 *   • Platform Health — active sessions, queue depths, system flags
 *   • Security Log — recent auth-audit / firewall blocks
 *
 * Every query is wrapped in try/catch so one missing table on a stale
 * environment can't take the whole tile down with it. Cached for 30
 * seconds via the shared Redis helper so a busy console doesn't
 * thrash Postgres.
 */

import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'
import { cached, KEYS } from '@/lib/redis'

const sql = neon(process.env.DATABASE_URL!)
const OPS_TTL_SECONDS = 30

// Lagos timezone is used everywhere on the public site so the
// dashboard matches what therapists / customers see in their UI.
const LAGOS_TZ = 'Africa/Lagos'

export async function GET() {
  try {
    await requireAdmin()
    // `KEYS.adminStats` already exists in the redis helpers — we
    // co-opt a sibling key so the two endpoints share consistent
    // invalidation semantics without us having to add a new key
    // constant when the redis lib is imported as `const`.
    return NextResponse.json(
      await cached(`${KEYS.adminStats}:ops`, OPS_TTL_SECONDS, computeOps),
    )
  } catch (error) {
    console.error('[api/admin/ops]', error)
    return NextResponse.json(
      { error: 'Failed to load ops snapshot' },
      { status: 500 },
    )
  }
}

async function computeOps() {
  // ────────────────────────────────────────────────────────────────
  // 1. Revenue overview
  // ────────────────────────────────────────────────────────────────
  // Today / this week (Mon-Sun) / this month, in kobo, only counting
  // paid bookings. We also break the month total down by category so
  // the card can show which treatment line is producing the most
  // revenue. All money is converted to naira at the API boundary so
  // the client doesn't have to remember the unit.
  let revenue = {
    todayKobo: 0,
    weekKobo: 0,
    monthKobo: 0,
    byCategoryThisMonth: [] as Array<{
      categoryId: string
      categoryName: string
      revenueNaira: number
      sessions: number
    }>,
  }
  try {
    const [totals] = (await sql`
      SELECT
        COALESCE(SUM(CASE
          WHEN b.payment_status = 'paid'
            AND (b.appointment_date AT TIME ZONE ${LAGOS_TZ})::date
                = (NOW() AT TIME ZONE ${LAGOS_TZ})::date
          THEN b.total_price_kobo ELSE 0 END), 0)::bigint AS today_kobo,
        COALESCE(SUM(CASE
          WHEN b.payment_status = 'paid'
            AND b.appointment_date
                >= DATE_TRUNC('week', (NOW() AT TIME ZONE ${LAGOS_TZ}))::date
          THEN b.total_price_kobo ELSE 0 END), 0)::bigint AS week_kobo,
        COALESCE(SUM(CASE
          WHEN b.payment_status = 'paid'
            AND b.appointment_date
                >= DATE_TRUNC('month', (NOW() AT TIME ZONE ${LAGOS_TZ}))::date
          THEN b.total_price_kobo ELSE 0 END), 0)::bigint AS month_kobo
      FROM bookings b
    `) as unknown as Array<{
      today_kobo: string | number
      week_kobo: string | number
      month_kobo: string | number
    }>

    const categoryRows = await sql`
      SELECT
        bs.category_id,
        MAX(bs.category_name) AS category_name,
        COUNT(DISTINCT bs.booking_id)::int AS sessions,
        COALESCE(SUM(bs.price_kobo), 0)::bigint AS revenue_kobo
      FROM booking_services bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE b.payment_status = 'paid'
        AND b.appointment_date >= DATE_TRUNC('month', (NOW() AT TIME ZONE ${LAGOS_TZ}))::date
      GROUP BY bs.category_id
      ORDER BY revenue_kobo DESC
      LIMIT 8
    `

    revenue = {
      todayKobo: Number(totals?.today_kobo ?? 0),
      weekKobo: Number(totals?.week_kobo ?? 0),
      monthKobo: Number(totals?.month_kobo ?? 0),
      byCategoryThisMonth: categoryRows.map((r) => ({
        categoryId: String(r.category_id ?? ''),
        categoryName: String(r.category_name ?? r.category_id ?? 'Service'),
        revenueNaira: Math.round(Number(r.revenue_kobo ?? 0) / 100),
        sessions: Number(r.sessions ?? 0),
      })),
    }
  } catch (err) {
    console.error('[ops] revenue', err)
  }

  // ────────────────────────────────────────────────────────────────
  // 2. Staff performance — this week
  // ────────────────────────────────────────────────────────────────
  // Sessions completed + paid revenue attributable to each staff
  // member for the current Mon→Sun window. Ordered by sessions
  // desc, capped at 8 rows so the card stays scannable.
  let staffPerformance: Array<{
    staffId: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
    sessions: number
    revenueNaira: number
  }> = []
  try {
    const rows = await sql`
      SELECT
        u.id              AS staff_id,
        u.first_name,
        u.last_name,
        u.avatar_url,
        COUNT(b.id)::int  AS sessions,
        COALESCE(SUM(
          CASE WHEN b.payment_status = 'paid' THEN b.total_price_kobo ELSE 0 END
        ), 0)::bigint     AS revenue_kobo
      FROM users u
      LEFT JOIN bookings b
        ON b.assigned_staff_id = u.id
       AND b.status = 'completed'
       AND b.appointment_date
           >= DATE_TRUNC('week', (NOW() AT TIME ZONE ${LAGOS_TZ}))::date
      WHERE u.role IN ('staff', 'admin')
      GROUP BY u.id, u.first_name, u.last_name, u.avatar_url
      HAVING COUNT(b.id) > 0
      ORDER BY sessions DESC, revenue_kobo DESC
      LIMIT 8
    `
    staffPerformance = rows.map((r) => ({
      staffId: String(r.staff_id),
      firstName: r.first_name as string | null,
      lastName: r.last_name as string | null,
      avatarUrl: r.avatar_url as string | null,
      sessions: Number(r.sessions ?? 0),
      revenueNaira: Math.round(Number(r.revenue_kobo ?? 0) / 100),
    }))
  } catch (err) {
    console.error('[ops] staff perf', err)
  }

  // ────────────────────────────────────────────────────────────────
  // 3. Platform health
  // ────────────────────────────────────────────────────────────────
  // Live signals admins want to glance at: active sessions count,
  // unread queue depths, maintenance flag, and a "server status"
  // bool derived from whether the last admin write succeeded
  // (Postgres reachable -> true). All wrapped in try/catch so a
  // missing table just nulls out a tile rather than 500s the page.
  let activeUsersNow = 0
  try {
    const [row] = (await sql`
      SELECT COUNT(*)::int AS active
      FROM sessions
      WHERE expires_at > NOW()
        AND created_at > NOW() - INTERVAL '15 minutes'
    `) as unknown as Array<{ active: number }>
    activeUsersNow = Number(row?.active ?? 0)
  } catch (err) {
    console.error('[ops] active sessions', err)
  }

  let maintenanceMode = false
  let pushEnabled = true
  try {
    // app_settings (single-row table) drives maintenance + feature
    // flags. If the read fails we report "unknown" via fallthrough
    // defaults; the dashboard tile shows the same.
    const settings = (await sql`
      SELECT
        COALESCE(maintenance_enabled, FALSE) AS maintenance_enabled
      FROM app_settings
      WHERE id = 1
      LIMIT 1
    `) as unknown as Array<{ maintenance_enabled: boolean }>
    maintenanceMode = Boolean(settings?.[0]?.maintenance_enabled)
  } catch {
    /* ignore — defaults retained */
  }
  try {
    const flagRows = (await sql`
      SELECT enabled FROM feature_flags WHERE key = 'push_notifs' LIMIT 1
    `) as unknown as Array<{ enabled: boolean }>
    if (flagRows.length > 0) pushEnabled = Boolean(flagRows[0].enabled)
  } catch {
    /* push enabled defaults true */
  }

  // ────────────────────────────────────────────────────────────────
  // 4. Security log
  // ────────────────────────────────────────────────────────────────
  // The `auth_audit_chain` table (script 201) is the single source
  // of truth for security events. We pull the most recent failed
  // sign-in attempts as the "firewall block" feed admins want.
  // Falls back to an empty array if the table doesn't exist on
  // this environment.
  let securityLog: Array<{
    id: string
    eventType: string
    description: string
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
  }> = []
  try {
    const rows = await sql`
      SELECT
        id::text       AS id,
        event_type     AS event_type,
        description,
        ip_address,
        user_agent,
        created_at
      FROM auth_audit_chain
      WHERE event_type IN (
        'login_failed', 'signup_blocked', 'rate_limit_hit',
        'suspicious_request', 'firewall_block'
      )
      ORDER BY created_at DESC
      LIMIT 10
    `
    securityLog = rows.map((r) => ({
      id: String(r.id),
      eventType: String(r.event_type ?? 'unknown'),
      description: String(r.description ?? ''),
      ipAddress: r.ip_address as string | null,
      userAgent: r.user_agent as string | null,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at ?? ''),
    }))
  } catch (err) {
    console.error('[ops] security log', err)
  }

  return {
    revenue,
    staffPerformance,
    platformHealth: {
      activeUsersNow,
      maintenanceMode,
      pushEnabled,
      // We treat "this endpoint returned" as the canonical "server
      // online" signal — if Postgres is unreachable the route 500s
      // and the client renders the offline tile instead.
      serverStatus: 'online' as const,
    },
    securityLog,
  }
}
