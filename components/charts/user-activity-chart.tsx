'use client'

/**
 * User activity analytics card.
 *
 * Renders a 12-month bar chart of a single client's activity, with
 * three switchable metrics:
 *   • Bookings   — # of appointments created in each calendar month
 *   • Spend      — paid lifetime spend in NGN, by month
 *   • AI chats   — # of Derma AI conversations per month
 *
 * Designed to feel native to the rest of the Dermaspace admin/staff
 * console: hairline border, generous padding, brand purple, no drop
 * shadows, and an Apple-style segmented control to switch metrics.
 *
 * Used from:
 *   - /admin/users/[userId]            (admin user detail)
 *   - /staff/clients (drawer)          (staff client detail)
 *
 * The component is fully self-contained and accepts a pre-computed
 * `monthlyActivity` array so the API can shape the buckets server-side.
 */

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, BarChart3, Calendar, Wallet } from 'lucide-react'

export interface MonthlyActivityPoint {
  /** "YYYY-MM" — sorted oldest-to-newest by the API. */
  month: string
  bookings: number
  /** Naira (whole units, not kobo). */
  spend: number
  aiChats: number
}

type Metric = 'bookings' | 'spend' | 'aiChats'

const METRICS: {
  key: Metric
  label: string
  short: string
  unit: string
  format: (v: number) => string
}[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    short: 'Bookings',
    unit: 'visits',
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'spend',
    label: 'Spend',
    short: 'Spend',
    unit: 'NGN',
    format: (v) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(v),
  },
  {
    key: 'aiChats',
    label: 'AI chats',
    short: 'AI chats',
    unit: 'sessions',
    format: (v) => v.toLocaleString(),
  },
]

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function shortMonth(monthIso: string): string {
  // monthIso = "YYYY-MM"
  const m = /^(\d{4})-(\d{2})$/.exec(monthIso)
  if (!m) return monthIso
  return MONTH_LABELS[Math.max(0, Math.min(11, Number(m[2]) - 1))]
}

function fullMonth(monthIso: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthIso)
  if (!m) return monthIso
  const monthIdx = Math.max(0, Math.min(11, Number(m[2]) - 1))
  return `${[
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][monthIdx]} ${m[1]}`
}

const naira = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n)

export interface UserActivityChartProps {
  data: MonthlyActivityPoint[]
  /** Compact mode is used inside narrow drawers (staff). Defaults to false. */
  compact?: boolean
  /** Optional title override. */
  title?: string
  /** Optional subtitle override. */
  subtitle?: string
}

export function UserActivityChart({
  data,
  compact = false,
  title = 'Activity',
  subtitle = 'Last 12 months',
}: UserActivityChartProps) {
  const [metric, setMetric] = useState<Metric>('bookings')

  // Defensive: API may return < 12 months in environments that just
  // started recording activity. Pad up to 12 entries from the right so
  // the chart x-axis is always a full year.
  const padded = useMemo<MonthlyActivityPoint[]>(() => {
    if (!data || data.length === 0) {
      // Synthesize an empty 12-month frame so the chart still renders
      // an axis instead of a blank box.
      const out: MonthlyActivityPoint[] = []
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        out.push({
          month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          bookings: 0,
          spend: 0,
          aiChats: 0,
        })
      }
      return out
    }
    return data
  }, [data])

  // Top-line totals + best month for the selected metric.
  const summary = useMemo(() => {
    let total = 0
    let bestMonth: MonthlyActivityPoint | null = null
    for (const p of padded) {
      const v = p[metric]
      total += v
      if (!bestMonth || v > bestMonth[metric]) bestMonth = p
    }
    return { total, bestMonth }
  }, [padded, metric])

  const activeMeta = METRICS.find((m) => m.key === metric)!

  const chartData = padded.map((p) => ({
    month: shortMonth(p.month),
    fullMonth: fullMonth(p.month),
    value: p[metric],
  }))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 sm:px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
            <BarChart3 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
          </div>
        </div>

        {/* Apple-style segmented control */}
        <div
          role="tablist"
          aria-label="Select metric"
          className="inline-flex w-full sm:w-auto items-center rounded-xl bg-gray-100/70 p-1"
        >
          {METRICS.map((m) => {
            const active = m.key === metric
            return (
              <button
                key={m.key}
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(m.key)}
                className={[
                  'flex-1 sm:flex-initial px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all',
                  active
                    ? 'bg-white text-[#7B2D8E] shadow-sm shadow-black/[0.04]'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {m.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <Stat
          icon={metric === 'spend' ? Wallet : metric === 'aiChats' ? Activity : Calendar}
          label={`Total ${activeMeta.label.toLowerCase()}`}
          value={activeMeta.format(summary.total)}
        />
        <Stat
          icon={Calendar}
          label="Best month"
          value={
            summary.bestMonth && summary.bestMonth[metric] > 0
              ? `${shortMonth(summary.bestMonth.month)} · ${activeMeta.format(summary.bestMonth[metric])}`
              : '—'
          }
        />
        <Stat
          className="hidden sm:flex"
          icon={Activity}
          label="Avg / month"
          value={activeMeta.format(Math.round(summary.total / padded.length))}
        />
      </div>

      {/* Chart */}
      <div className={compact ? 'px-2 py-3' : 'px-2 sm:px-4 py-4'}>
        <div style={{ width: '100%', height: compact ? 160 : 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="bar-fill-purple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7B2D8E" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#7B2D8E" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#F3F4F6"
                strokeDasharray="0"
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                width={40}
                tickFormatter={(v: number) => {
                  if (metric === 'spend') {
                    if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}m`
                    if (v >= 1_000) return `${Math.round(v / 1_000)}k`
                    return `${v}`
                  }
                  return v.toLocaleString()
                }}
              />
              <Tooltip
                cursor={{ fill: '#7B2D8E', fillOpacity: 0.06 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const p = payload[0].payload as { fullMonth: string; value: number }
                  return (
                    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg shadow-black/[0.06]">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
                        {p.fullMonth}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
                        {metric === 'spend' ? naira(p.value) : p.value.toLocaleString()}
                        <span className="ml-1 text-[10px] text-gray-400 font-normal">
                          {metric === 'spend' ? '' : activeMeta.unit}
                        </span>
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="value"
                fill="url(#bar-fill-purple)"
                radius={[6, 6, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  className = '',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 ${className}`}>
      <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-500">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 truncate">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-900 tabular-nums truncate">{value}</p>
      </div>
    </div>
  )
}
