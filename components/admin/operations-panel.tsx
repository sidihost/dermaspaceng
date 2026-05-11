'use client'

import useSWR from 'swr'
import {
  Activity,
  AlertTriangle,
  CircleCheck,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react'

// Four-up operations feed mounted on the admin dashboard. Reads
// /api/admin/operations once every 30s — that single endpoint is
// the source of truth for:
//   - Revenue Overview     (today / this week / this month, by category)
//   - Staff Performance    (sessions completed + revenue this week)
//   - Platform Health      (active users now, server status, alerts)
//   - Security Log         (recent firewall blocks)
//
// All four widgets follow the same visual language as the rest of
// the admin dashboard: white card on neutral background, single
// thin border, no shadows, no gradients, no decorative icons. Brand
// purple (#7B2D8E) is reserved for primary numbers and accents.

type CategoryRevenue = {
  category: string
  amount_kobo: number
  bookings: number
}
type RevenueBucket = {
  total_kobo: number
  bookings: number
  by_category: CategoryRevenue[]
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
type OperationsResponse = {
  revenue: { today: RevenueBucket; this_week: RevenueBucket; this_month: RevenueBucket }
  staff: StaffRow[]
  health: {
    active_users_now: number
    active_admin_now: number
    active_staff_now: number
    pending_payments: number
    failed_bookings_24h: number
    server_status: 'operational' | 'degraded' | 'outage'
    alerts: Alert[]
  }
  security: FirewallBlock[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Naira formatter — bookings store kobo, we render naira. We
// deliberately drop fractional kobo because the admin dashboard
// shows tidy whole-naira amounts and individual booking detail is
// elsewhere.
function naira(kobo: number) {
  const naira = Math.round(kobo / 100)
  return `₦${naira.toLocaleString()}`
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`
  if (diffSec < 86_400) return `${Math.round(diffSec / 3600)}h ago`
  return `${Math.round(diffSec / 86_400)}d ago`
}

export function OperationsPanel() {
  const { data, isLoading } = useSWR<OperationsResponse>(
    '/api/admin/operations',
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RevenueOverview data={data?.revenue} loading={isLoading} />
      <StaffPerformance rows={data?.staff} loading={isLoading} />
      <PlatformHealth health={data?.health} loading={isLoading} />
      <SecurityLog rows={data?.security} loading={isLoading} />
    </div>
  )
}

/* -------------------------------------------------------------- */
/*  Revenue Overview                                              */
/* -------------------------------------------------------------- */

function RevenueOverview({
  data,
  loading,
}: {
  data: OperationsResponse['revenue'] | undefined
  loading: boolean
}) {
  const today = data?.today ?? { total_kobo: 0, bookings: 0, by_category: [] }
  const week = data?.this_week ?? { total_kobo: 0, bookings: 0, by_category: [] }
  const month = data?.this_month ?? { total_kobo: 0, bookings: 0, by_category: [] }

  return (
    <section
      aria-label="Revenue overview"
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Revenue overview</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Earnings from paid bookings, broken down by service category.
          </p>
        </div>
        <TrendingUp className="w-4 h-4 text-gray-400" aria-hidden="true" />
      </header>

      {/* Top-line totals */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Today', value: today.total_kobo, count: today.bookings },
          { label: 'This week', value: week.total_kobo, count: week.bookings },
          { label: 'This month', value: month.total_kobo, count: month.bookings },
        ].map((b) => (
          <div key={b.label} className="rounded-xl bg-gray-50 px-3 py-3 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 leading-tight">
              {b.label}
            </p>
            <p className="mt-1 text-base sm:text-lg font-semibold text-gray-900 tabular-nums">
              {loading ? '—' : naira(b.value)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {b.count} booking{b.count === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>

      {/* Category breakdown for this month — the dominant bucket
          the operator cares about. Bar widths are normalised to
          the largest category so the rank ordering is obvious at
          a glance. */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          This month by category
        </p>
        {month.by_category.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">
            {loading ? 'Loading…' : 'No paid bookings this month yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {month.by_category.map((c) => {
              const max = Math.max(...month.by_category.map((x) => x.amount_kobo), 1)
              const pct = Math.max(2, Math.round((c.amount_kobo / max) * 100))
              return (
                <li key={c.category}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-gray-700 truncate">{c.category}</span>
                    <span className="text-gray-900 font-medium tabular-nums">
                      {naira(c.amount_kobo)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-[#7B2D8E] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- */
/*  Staff Performance                                             */
/* -------------------------------------------------------------- */

function StaffPerformance({
  rows,
  loading,
}: {
  rows: StaffRow[] | undefined
  loading: boolean
}) {
  const list = rows ?? []

  return (
    <section
      aria-label="Staff performance"
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Staff performance</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ranked by sessions completed this week.
          </p>
        </div>
        <Users className="w-4 h-4 text-gray-400" aria-hidden="true" />
      </header>

      {list.length === 0 ? (
        <p className="text-xs text-gray-500 py-4">
          {loading ? 'Loading…' : 'No active team members yet.'}
        </p>
      ) : (
        <ol className="space-y-2">
          {list.slice(0, 8).map((s, i) => (
            <li
              key={s.staff_id}
              className="flex items-center gap-3 py-1.5 min-w-0"
            >
              <span
                className="w-5 h-5 flex items-center justify-center text-[11px] font-semibold text-gray-500 tabular-nums flex-shrink-0"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {s.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.avatar_url}
                    alt={s.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] font-semibold text-[#7B2D8E]">
                    {s.name
                      .split(' ')
                      .map((p) => p.charAt(0))
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900 truncate">{s.name}</p>
                <p className="text-[11px] text-gray-500 capitalize">
                  {s.role}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900 tabular-nums">
                  {s.sessions_completed}
                </p>
                <p className="text-[11px] text-gray-500 tabular-nums">
                  {naira(s.revenue_kobo)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* -------------------------------------------------------------- */
/*  Platform Health                                               */
/* -------------------------------------------------------------- */

function PlatformHealth({
  health,
  loading,
}: {
  health: OperationsResponse['health'] | undefined
  loading: boolean
}) {
  const h = health
  const statusLabel =
    h?.server_status === 'operational'
      ? 'All systems operational'
      : h?.server_status === 'degraded'
      ? 'Degraded performance'
      : 'Outage'

  return (
    <section
      aria-label="Platform health"
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Platform health</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Live activity and pending system alerts.
          </p>
        </div>
        <Activity className="w-4 h-4 text-gray-400" aria-hidden="true" />
      </header>

      {/* Server status pill */}
      <div className="flex items-center gap-2 mb-4 text-xs">
        <span
          className={
            'inline-block w-2 h-2 rounded-full ' +
            (h?.server_status === 'operational'
              ? 'bg-emerald-500'
              : h?.server_status === 'degraded'
              ? 'bg-amber-500'
              : 'bg-red-500')
          }
          aria-hidden="true"
        />
        <span className="text-gray-700">{loading ? 'Checking…' : statusLabel}</span>
      </div>

      {/* Active users grid */}
      <dl className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-gray-50 px-3 py-2.5">
          <dt className="text-[11px] uppercase tracking-wide text-gray-500 leading-tight">
            Online now
          </dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
            {loading ? '—' : h?.active_users_now ?? 0}
          </dd>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2.5">
          <dt className="text-[11px] uppercase tracking-wide text-gray-500 leading-tight">
            Staff online
          </dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
            {loading ? '—' : h?.active_staff_now ?? 0}
          </dd>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2.5">
          <dt className="text-[11px] uppercase tracking-wide text-gray-500 leading-tight">
            Admins online
          </dt>
          <dd className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
            {loading ? '—' : h?.active_admin_now ?? 0}
          </dd>
        </div>
      </dl>

      {/* Alerts list */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-2">
          Pending alerts
        </p>
        {!h?.alerts.length ? (
          <p className="flex items-center gap-2 text-xs text-gray-600 py-1">
            <CircleCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
            No active alerts.
          </p>
        ) : (
          <ul className="space-y-2">
            {h.alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-xs">
                <AlertTriangle
                  className={
                    'w-3.5 h-3.5 mt-0.5 flex-shrink-0 ' +
                    (a.severity === 'critical'
                      ? 'text-red-500'
                      : a.severity === 'warning'
                      ? 'text-amber-500'
                      : 'text-gray-400')
                  }
                  aria-hidden="true"
                />
                <p className="text-gray-700 leading-snug">{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- */
/*  Security Log                                                  */
/* -------------------------------------------------------------- */

function SecurityLog({
  rows,
  loading,
}: {
  rows: FirewallBlock[] | undefined
  loading: boolean
}) {
  const list = rows ?? []

  return (
    <section
      aria-label="Security log"
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <header className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Security log</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Recent firewall blocks — IP, attack pattern, and timestamp.
          </p>
        </div>
        <ShieldAlert className="w-4 h-4 text-gray-400" aria-hidden="true" />
      </header>

      {list.length === 0 ? (
        <p className="text-xs text-gray-600 py-4 flex items-center gap-2">
          <CircleCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
          {loading ? 'Loading…' : 'No recent firewall blocks.'}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                <th className="font-medium pb-2 pr-3">IP</th>
                <th className="font-medium pb-2 pr-3">Pattern</th>
                <th className="font-medium pb-2 pr-3">Path</th>
                <th className="font-medium pb-2 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.slice(0, 10).map((b) => (
                <tr key={b.id} className="align-top">
                  <td className="py-2 pr-3 font-mono text-gray-900 tabular-nums whitespace-nowrap">
                    {b.ip_address}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{b.pattern}</td>
                  <td className="py-2 pr-3 text-gray-500 truncate max-w-[180px]">
                    {b.path ? <span title={b.path}>{b.path}</span> : '—'}
                  </td>
                  <td className="py-2 text-gray-500 text-right whitespace-nowrap">
                    {relativeTime(b.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
