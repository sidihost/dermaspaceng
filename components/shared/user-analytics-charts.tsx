"use client"

/**
 * <UserAnalyticsCharts />
 *
 * One-stop "how does this customer behave" panel used on both the
 * admin user-detail page (`/admin/users/[userId]`) and the staff
 * client drawer (`/staff/clients` slide-over). The two surfaces
 * historically rendered different stat strips that each told the
 * story badly — the admin saw a flat KPI grid, the staff saw three
 * stat pills — and neither showed *trends*. This component is the
 * shared canonical view.
 *
 * Inputs are deliberately raw arrays so the parent doesn't need to
 * pre-aggregate anything; we bucket bookings and page-views inside
 * the component. That keeps the API contract for both pages thin
 * and means the charts always agree with the lists rendered next
 * to them.
 *
 * Visuals stay strictly inside the brand:
 *   - Single brand purple `#7B2D8E` for primary fills/strokes.
 *   - Hairline borders, rounded-xl, no drop shadows.
 *   - Empty state per chart so the grid never looks broken when the
 *     customer is brand-new and has no history yet.
 */

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import {
  CalendarRange,
  Wallet,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react"

const BRAND = "#7B2D8E"
const BRAND_SOFT = "#C9A4D6"
const BRAND_TINT = "#E5D6EB"
const NEUTRAL = "#9CA3AF"

/** Booking shape we accept. Shape kept loose because admin and staff
 *  pages already have slightly different booking objects — we only
 *  read `created_at`, `status` and `total_price_kobo`. */
export interface AnalyticsBooking {
  created_at: string
  status: string
  total_price_kobo?: number | null
  payment_status?: string | null
}

export interface AnalyticsPageView {
  created_at: string
}

interface Props {
  bookings: AnalyticsBooking[]
  pageViews: AnalyticsPageView[]
  /** Compact mode shrinks padding so the panel fits inside the staff
   *  detail drawer (max-w-md). Defaults to false (full admin grid). */
  compact?: boolean
}

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n))

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-NG", { month: "short" })

// ── Aggregations ────────────────────────────────────────────────────
// These run on every render; the input arrays are tiny (≤200 rows on
// the busiest customer) so memoization isn't needed.

function buildBookingsByWeek(bookings: AnalyticsBooking[]) {
  // Last 12 ISO weeks, oldest → newest. We use Sundays as bucket
  // boundaries so labels are predictable across timezones.
  const buckets: { label: string; date: string; count: number }[] = []
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay() - 7 * 11) // 12 weeks back
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < 12; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i * 7)
    buckets.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      date: d.toISOString(),
      count: 0,
    })
  }

  for (const b of bookings) {
    const t = new Date(b.created_at).getTime()
    if (Number.isNaN(t)) continue
    const idx = Math.floor((t - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    if (idx >= 0 && idx < 12) buckets[idx].count += 1
  }
  return buckets
}

function buildSpendByMonth(bookings: AnalyticsBooking[]) {
  // Last 12 calendar months. We only count paid bookings — pending
  // payments shouldn't inflate lifetime spend.
  const now = new Date()
  const months: { key: string; label: string; spend: number; cumulative: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: monthKey(d),
      label: monthLabel(d),
      spend: 0,
      cumulative: 0,
    })
  }
  const idx = new Map(months.map((m, i) => [m.key, i]))

  for (const b of bookings) {
    if (b.payment_status && b.payment_status !== "paid") continue
    const d = new Date(b.created_at)
    if (Number.isNaN(d.getTime())) continue
    const k = monthKey(d)
    const i = idx.get(k)
    if (i === undefined) continue
    const naira = Number(b.total_price_kobo ?? 0) / 100
    months[i].spend += naira
  }
  let running = 0
  for (const m of months) {
    running += m.spend
    m.cumulative = running
  }
  return months
}

function buildStatusMix(bookings: AnalyticsBooking[]) {
  const counts: Record<string, number> = {}
  for (const b of bookings) {
    const k = (b.status || "unknown").toLowerCase()
    counts[k] = (counts[k] || 0) + 1
  }
  const ORDER = ["completed", "confirmed", "pending", "cancelled", "no_show"]
  const COLOURS: Record<string, string> = {
    completed: BRAND,
    confirmed: BRAND_SOFT,
    pending: "#F59E0B",
    cancelled: "#9CA3AF",
    no_show: "#E5E7EB",
  }
  const slices = ORDER.filter((k) => counts[k]).map((k) => ({
    name: k.replace(/_/g, " "),
    value: counts[k],
    fill: COLOURS[k] ?? BRAND_SOFT,
  }))
  // Anything we don't know about gets bucketed as "other" so totals
  // line up.
  for (const k of Object.keys(counts)) {
    if (!ORDER.includes(k)) {
      slices.push({ name: k, value: counts[k], fill: NEUTRAL })
    }
  }
  return slices
}

function buildActivityByWeek(pageViews: AnalyticsPageView[]) {
  const buckets: { label: string; count: number }[] = []
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay() - 7 * 11)
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < 12; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i * 7)
    buckets.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: 0,
    })
  }
  for (const p of pageViews) {
    const t = new Date(p.created_at).getTime()
    if (Number.isNaN(t)) continue
    const idx = Math.floor((t - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    if (idx >= 0 && idx < 12) buckets[idx].count += 1
  }
  return buckets
}

// ── Card primitives ─────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  icon,
  children,
  compact,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div
        className={`flex items-start justify-between gap-3 ${compact ? "p-3" : "p-4"} border-b border-gray-100`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[#7B2D8E]">{icon}</span>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500 truncate">{subtitle}</p>
        </div>
      </div>
      <div className={compact ? "p-2" : "p-3 sm:p-4"}>{children}</div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-center px-3">
      <p className="text-xs text-gray-400">{message}</p>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────

export function UserAnalyticsCharts({ bookings, pageViews, compact }: Props) {
  const bookingTrend = buildBookingsByWeek(bookings)
  const spendTrend = buildSpendByMonth(bookings)
  const statusMix = buildStatusMix(bookings)
  const activityTrend = buildActivityByWeek(pageViews)

  const hasBookings = bookings.length > 0
  const hasSpend = spendTrend.some((m) => m.spend > 0)
  const hasStatus = statusMix.length > 0
  const hasActivity = activityTrend.some((b) => b.count > 0)

  const chartHeight = compact ? 150 : 180

  return (
    <div className={`grid gap-3 sm:gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
      {/* Bookings over time — line chart of weekly bookings. Picked a
          line over an area chart here because the customer view is
          about *cadence* (do they come back?) rather than the cumulative
          value the spend chart already covers. */}
      <ChartCard
        title="Bookings over time"
        subtitle="Last 12 weeks"
        icon={<CalendarRange className="w-3.5 h-3.5" />}
        compact={compact}
      >
        {hasBookings ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart
              data={bookingTrend}
              margin={{ top: 6, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  fontSize: 12,
                  boxShadow: "0 10px 25px -5px rgba(123,45,142,0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={BRAND}
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: BRAND }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No bookings yet — chart will appear after the first booking." />
        )}
      </ChartCard>

      {/* Spend over time — cumulative naira spent, area-filled for the
          quick "is this customer growing?" read. */}
      <ChartCard
        title="Spend over time"
        subtitle={
          hasSpend
            ? `${naira(spendTrend[spendTrend.length - 1].cumulative)} lifetime`
            : "Last 12 months"
        }
        icon={<Wallet className="w-3.5 h-3.5" />}
        compact={compact}
      >
        {hasSpend ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart
              data={spendTrend}
              margin={{ top: 6, right: 8, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                width={42}
                tickFormatter={(v) =>
                  Number(v) >= 1_000_000
                    ? `${(Number(v) / 1_000_000).toFixed(1)}M`
                    : `${(Number(v) / 1_000).toFixed(0)}k`
                }
              />
              <Tooltip
                formatter={(v: number) => naira(Number(v))}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  fontSize: 12,
                  boxShadow: "0 10px 25px -5px rgba(123,45,142,0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={BRAND}
                strokeWidth={2.5}
                fill="url(#spendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No paid bookings yet — spend will appear here." />
        )}
      </ChartCard>

      {/* Booking status mix — donut. Sits in the second column on
          desktop so each chart gets a balanced share of the row. */}
      <ChartCard
        title="Booking status mix"
        subtitle={`${bookings.length} total`}
        icon={<PieChartIcon className="w-3.5 h-3.5" />}
        compact={compact}
      >
        {hasStatus ? (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <ResponsiveContainer width="100%" height={chartHeight} minWidth={140}>
              <PieChart>
                <Pie
                  data={statusMix}
                  innerRadius={compact ? 36 : 44}
                  outerRadius={compact ? 60 : 72}
                  dataKey="value"
                  paddingAngle={2}
                  stroke="#fff"
                >
                  {statusMix.map((s, i) => (
                    <Cell key={i} fill={s.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full sm:w-auto text-[11px] text-gray-600 space-y-1">
              {statusMix.map((s) => (
                <li key={s.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: s.fill }}
                  />
                  <span className="capitalize flex-1">{s.name}</span>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {s.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyChart message="No booking history to break down." />
        )}
      </ChartCard>

      {/* Platform activity — page views per week. We only render this
          when there's signal so brand-new accounts don't see a flat
          row of zeros. */}
      <ChartCard
        title="Platform activity"
        subtitle="Page views per week, last 12 weeks"
        icon={<Activity className="w-3.5 h-3.5" />}
        compact={compact}
      >
        {hasActivity ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={activityTrend}
              margin={{ top: 6, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #E5E7EB",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill={BRAND_TINT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No recent visits to chart yet." />
        )}
      </ChartCard>
    </div>
  )
}
