'use client'

/**
 * Admin "Operations Overview" — four self-contained dashboard
 * sections rendered side-by-side on the admin home:
 *
 *   • Revenue Overview   — today / this week / this month, plus a
 *                          short by-category breakdown.
 *   • Staff Performance  — ranked list of staff by sessions
 *                          completed and revenue this week.
 *   • Platform Health    — active users now, server status,
 *                          maintenance flag, push channel flag.
 *   • Security Log       — recent firewall / failed-login events.
 *
 * One SWR call, 30s refresh, no skeleton-hang — we render the layout
 * shell immediately with subtle placeholders so the dashboard never
 * stalls behind a spinner. Brand-purple + neutrals only, flat
 * borders, Lucide icons only. No sparkles / lightning / zap chrome.
 */

import useSWR from 'swr'
import {
  Wallet,
  Trophy,
  Activity,
  Shield,
  Wifi,
  Power,
  ArrowUpRight,
  TrendingUp,
  Users,
} from 'lucide-react'

type Ops = {
  revenue: {
    todayKobo: number
    weekKobo: number
    monthKobo: number
    byCategoryThisMonth: Array<{
      categoryId: string
      categoryName: string
      revenueNaira: number
      sessions: number
    }>
  }
  staffPerformance: Array<{
    staffId: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
    sessions: number
    revenueNaira: number
  }>
  platformHealth: {
    activeUsersNow: number
    maintenanceMode: boolean
    pushEnabled: boolean
    serverStatus: 'online' | 'degraded' | 'offline'
  }
  securityLog: Array<{
    id: string
    eventType: string
    description: string
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
  }>
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error('ops failed')
    return r.json() as Promise<Ops>
  })

// Naira number formatter — same shape used elsewhere on the admin
// dashboard so the new tiles match the Sales chart and Revenue
// headline in look.
function naira(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`
  return `₦${Math.round(n).toLocaleString('en-NG')}`
}

// Friendly "how long ago" for the security log timestamps. Keeps the
// table snappy on the eye — full ISO is in `title` for power users.
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export function AdminOpsOverview() {
  const { data, isLoading } = useSWR<Ops>('/api/admin/ops', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
    shouldRetryOnError: false,
  })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RevenueCard data={data?.revenue} loading={isLoading && !data} />
      <StaffPerformanceCard
        rows={data?.staffPerformance ?? []}
        loading={isLoading && !data}
      />
      <PlatformHealthCard
        health={data?.platformHealth}
        loading={isLoading && !data}
      />
      <SecurityLogCard rows={data?.securityLog ?? []} loading={isLoading && !data} />
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Revenue
// ───────────────────────────────────────────────────────────────────
function RevenueCard({
  data,
  loading,
}: {
  data: Ops['revenue'] | undefined
  loading: boolean
}) {
  // Convert from kobo to naira at the render boundary so the math
  // matches what the bookkeeper sees on the invoice exports.
  const today = (data?.todayKobo ?? 0) / 100
  const week = (data?.weekKobo ?? 0) / 100
  const month = (data?.monthKobo ?? 0) / 100
  const byCategory = data?.byCategoryThisMonth ?? []

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            Revenue overview
          </h2>
        </div>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
          Paid bookings only
        </span>
      </header>

      <div className="grid grid-cols-3 gap-2 p-3 sm:p-4">
        <RevenueTile label="Today" value={naira(today)} loading={loading} />
        <RevenueTile label="This week" value={naira(week)} loading={loading} />
        <RevenueTile label="This month" value={naira(month)} loading={loading} />
      </div>

      <div className="px-4 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
          By service category — this month
        </p>
        {loading && byCategory.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-7 rounded bg-gray-50 border border-gray-100"
              />
            ))}
          </div>
        ) : byCategory.length === 0 ? (
          <p className="text-xs text-gray-500">
            No paid bookings recorded this month yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {byCategory.map((c) => {
              // Bar width is proportional to the category's share of
              // the top earner's revenue, so the visual scale always
              // fits inside the row without an extra "max" pass on
              // the server.
              const top = byCategory[0]?.revenueNaira || 1
              const pct = Math.max(4, Math.round((c.revenueNaira / top) * 100))
              return (
                <li
                  key={c.categoryId}
                  className="grid grid-cols-[1fr_auto] gap-2 items-center text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-800 font-medium truncate">
                        {c.categoryName}
                      </span>
                      <span className="text-gray-500 tabular-nums whitespace-nowrap">
                        {c.sessions} session{c.sessions === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-[#7B2D8E]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 tabular-nums whitespace-nowrap text-[12.5px]">
                    {naira(c.revenueNaira)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function RevenueTile({
  label,
  value,
  loading,
}: {
  label: string
  value: string
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-2.5 py-2 min-w-0">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 truncate">
        {label}
      </p>
      <p className="mt-0.5 text-base sm:text-lg font-bold text-gray-900 tabular-nums truncate">
        {loading ? '—' : value}
      </p>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Staff Performance
// ───────────────────────────────────────────────────────────────────
function StaffPerformanceCard({
  rows,
  loading,
}: {
  rows: Ops['staffPerformance']
  loading: boolean
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            Staff performance — this week
          </h2>
        </div>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
          Completed sessions
        </span>
      </header>

      <div className="px-2 sm:px-3 py-2">
        {loading && rows.length === 0 ? (
          <div className="space-y-1.5 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded bg-gray-50 border border-gray-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-gray-500 p-3">
            No completed sessions logged yet this week.
          </p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {rows.map((s, idx) => {
              const fullName =
                `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() ||
                'Team member'
              const initial = (s.firstName?.[0] ?? '?').toUpperCase()
              return (
                <li
                  key={s.staffId}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-2 py-2"
                >
                  <span className="w-5 text-center text-[11px] font-bold text-gray-400 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-8 w-8 rounded-full bg-[#F8F2FB] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {s.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.avatarUrl}
                          alt={fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[11px] font-bold text-[#7B2D8E]">
                          {initial}
                        </span>
                      )}
                    </span>
                    <p className="text-[13px] font-medium text-gray-900 truncate">
                      {fullName}
                    </p>
                  </div>
                  <span className="text-[12px] text-gray-500 tabular-nums whitespace-nowrap">
                    {s.sessions}{' '}
                    <span className="text-[10.5px] uppercase tracking-wider">
                      sess
                    </span>
                  </span>
                  <span className="text-[12.5px] font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {naira(s.revenueNaira)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

// ───────────────────────────────────────────────────────────────────
// Platform Health
// ───────────────────────────────────────────────────────────────────
function PlatformHealthCard({
  health,
  loading,
}: {
  health: Ops['platformHealth'] | undefined
  loading: boolean
}) {
  const status = health?.serverStatus ?? 'online'
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            Platform health
          </h2>
        </div>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
          Live
        </span>
      </header>

      <div className="grid grid-cols-2 gap-2 p-3 sm:p-4">
        <HealthTile
          icon={<Users className="w-3.5 h-3.5 text-[#7B2D8E]" />}
          label="Active users"
          value={loading ? '—' : String(health?.activeUsersNow ?? 0)}
          sublabel="Last 15 min"
        />
        <HealthTile
          icon={<Wifi className="w-3.5 h-3.5 text-[#7B2D8E]" />}
          label="Server status"
          value={status === 'online' ? 'Online' : status === 'degraded' ? 'Degraded' : 'Offline'}
          sublabel="Postgres + API"
        />
        <HealthTile
          icon={<Power className="w-3.5 h-3.5 text-[#7B2D8E]" />}
          label="Push channel"
          value={loading ? '—' : health?.pushEnabled ? 'Enabled' : 'Disabled'}
          sublabel="Feature flag"
        />
        <HealthTile
          icon={<TrendingUp className="w-3.5 h-3.5 text-[#7B2D8E]" />}
          label="Maintenance mode"
          value={loading ? '—' : health?.maintenanceMode ? 'On' : 'Off'}
          sublabel="Public site"
        />
      </div>
    </section>
  )
}

function HealthTile({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2.5 min-w-0">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-sm sm:text-base font-bold text-gray-900 truncate">
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-[11px] text-gray-500 truncate">{sublabel}</p>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Security Log
// ───────────────────────────────────────────────────────────────────
function SecurityLogCard({
  rows,
  loading,
}: {
  rows: Ops['securityLog']
  loading: boolean
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            Security log
          </h2>
        </div>
        <a
          href="/admin/activity"
          className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-[#7B2D8E] hover:underline"
        >
          View all
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </header>

      <div className="px-2 sm:px-3 py-2">
        {loading && rows.length === 0 ? (
          <div className="space-y-1.5 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded bg-gray-50 border border-gray-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-gray-500 p-3">
            No suspicious activity in the audit chain.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[1fr_auto] gap-3 items-start px-2 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-gray-900 truncate">
                    {humanise(r.eventType)}
                  </p>
                  <p className="text-[11.5px] text-gray-500 truncate">
                    {r.description || '—'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {r.ipAddress || 'IP unknown'}
                  </p>
                </div>
                <span
                  className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap"
                  title={new Date(r.createdAt).toLocaleString()}
                >
                  {timeAgo(r.createdAt)} ago
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function humanise(eventType: string): string {
  switch (eventType) {
    case 'login_failed':
      return 'Failed sign-in attempt'
    case 'signup_blocked':
      return 'Sign-up blocked'
    case 'rate_limit_hit':
      return 'Rate limit triggered'
    case 'suspicious_request':
      return 'Suspicious request'
    case 'firewall_block':
      return 'Firewall block'
    default:
      return eventType
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
  }
}
