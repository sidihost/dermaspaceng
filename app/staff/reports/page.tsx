"use client"

/**
 * /staff/reports
 *
 * Splice "Business Performance" screen, in Dermaspace purple/black.
 *
 *   - Tabs: Executive Summary | Monthly Summary | Customer Spend | Reviews | Expense Report
 *     (only Executive is wired today; the others render empty states.)
 *   - Top row: Customers (new vs returning bar) + Trends (line + delta).
 *   - Bottom row: Appointments (donut) + Sales (gross/tax/net stack)
 *     + Services & Products tallies.
 *
 * Charts use Recharts (already a dep) and are themed with #7B2D8E
 * (returning / dark) and #C9A4D6 (new / light) to stay inside the
 * 3-colour brand budget.
 */

import { useState } from "react"
import useSWR from "swr"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  ChevronDown,
  TrendingUp,
  Loader2,
  MapPin,
  User,
  Package,
  ShoppingBag,
} from "lucide-react"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json())

interface ReportsData {
  charts: {
    customers: { month: string; new: number; returning: number }[]
    trend: { date: string; value: number }[]
    sales: { month: string; gross: number; tax: number; net: number }[]
  }
  stats: {
    avgAppointments: number
    trendsDeltaPct: number
    servicesQty: number
    servicesItems: number
    productsQty: number
    productsItems: number
    appointmentsTotal: number
    appointmentsBreakdown: { status: string; count: number }[]
  }
}

type Tab = "executive" | "monthly" | "customer_spend" | "reviews" | "expense"

const TABS: { key: Tab; label: string }[] = [
  { key: "executive", label: "Executive Summary" },
  { key: "monthly", label: "Monthly Summary" },
  { key: "customer_spend", label: "Customer Spend" },
  { key: "reviews", label: "Reviews" },
  { key: "expense", label: "Expense Report" },
]

const naira0 = (n: number) =>
  new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(n)

export default function StaffReportsPage() {
  const [tab, setTab] = useState<Tab>("executive")
  const [range, setRange] = useState<"last_month" | "last_30d" | "this_year">("last_month")

  const { data, isLoading } = useSWR<{ success: boolean } & ReportsData>(
    `/api/staff/reports?range=${range}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  return (
    <div className="space-y-5">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Business Performance
        </h1>
      </header>

      {/* Tabs (horizontally scrollable on mobile) */}
      <div className="overflow-x-auto -mx-1 sm:mx-0 px-1 sm:px-0">
        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1 whitespace-nowrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab !== "executive" ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-sm font-semibold text-gray-900">Coming soon</p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            This report is queued for the next release. The Executive
            Summary tab is fully wired today.
          </p>
        </div>
      ) : (
        <>
          {/* General Overview header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">General Overview</h2>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                All branches
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SoftSelect icon={User} label="All staff" />
              <SoftSelect
                label={
                  range === "last_month"
                    ? "Last month"
                    : range === "last_30d"
                      ? "Last 30 days"
                      : "This year"
                }
                onClick={() =>
                  setRange((prev) =>
                    prev === "last_month"
                      ? "last_30d"
                      : prev === "last_30d"
                        ? "this_year"
                        : "last_month"
                  )
                }
              />
            </div>
          </div>

          {isLoading || !data ? (
            <div className="rounded-2xl border border-gray-100 bg-white py-24 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            </div>
          ) : (
            <>
              {/* Top row: Customers + Trends */}
              <div className="grid gap-4 lg:grid-cols-2">
                <CustomersCard data={data.charts.customers} />
                <TrendsCard
                  data={data.charts.trend}
                  avg={data.stats.avgAppointments}
                  delta={data.stats.trendsDeltaPct}
                />
              </div>

              {/* Bottom row: Appointments + Sales + Services & Products */}
              <div className="grid gap-4 lg:grid-cols-3">
                <AppointmentsCard
                  total={data.stats.appointmentsTotal}
                  breakdown={data.stats.appointmentsBreakdown}
                />
                <SalesCard data={data.charts.sales} />
                <ServicesProductsCard
                  servicesQty={data.stats.servicesQty}
                  servicesItems={data.stats.servicesItems}
                  productsQty={data.stats.productsQty}
                  productsItems={data.stats.productsItems}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function SoftSelect({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span className="font-medium">{label}</span>
      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
    </button>
  )
}

function CustomersCard({ data }: { data: ReportsData["charts"]["customers"] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Customers</h3>
        <ul className="flex items-center gap-3 text-xs text-gray-500">
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#E5D6EB]" />
            New
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[#7B2D8E]" />
            Returning
          </li>
        </ul>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              cursor={{ fill: "rgba(123,45,142,0.06)" }}
              contentStyle={{ borderRadius: 8, border: "1px solid #F3F4F6", fontSize: 12 }}
            />
            <Bar dataKey="new" fill="#E5D6EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="returning" fill="#7B2D8E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TrendsCard({
  data,
  avg,
  delta,
}: {
  data: ReportsData["charts"]["trend"]
  avg: number
  delta: number
}) {
  const positive = delta >= 0
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Trends and Highlights</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Find your trends and highlights across staff appointment reports here
          </p>
        </div>
        <TrendingUp className="h-5 w-5 text-[#7B2D8E] flex-shrink-0" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-semibold">
            Average appointments
          </p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900 tabular-nums">{avg}</p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "inline-flex items-center gap-1 text-sm font-bold tabular-nums",
              positive ? "text-[#7B2D8E]" : "text-gray-700"
            )}
          >
            {positive ? "+" : ""}
            {delta}%
            <TrendingUp className={cn("h-3.5 w-3.5", positive ? "rotate-0" : "rotate-180")} />
          </p>
          <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-semibold">
            vs last month
          </p>
        </div>
      </div>
      <div className="h-32 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} interval={5} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #F3F4F6", fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke="#7B2D8E" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function AppointmentsCard({
  total,
  breakdown,
}: {
  total: number
  breakdown: { status: string; count: number }[]
}) {
  // Splice's pie shows three groups (online / rebooked / walk-in). We
  // map our booking statuses onto a similar three-segment palette.
  const palette = ["#7B2D8E", "#C9A4D6", "#E5D6EB", "#F3E8F8", "#1F0626"]
  const slices = breakdown.map((b, i) => ({
    name: b.status.replace("_", " "),
    value: b.count,
    fill: palette[i % palette.length],
  }))
  const safeSlices = slices.length > 0 ? slices : [{ name: "No data", value: 1, fill: "#F3F4F6" }]
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Appointments</h3>
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
          Total: {total}
        </span>
      </div>
      <div className="h-44 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safeSlices}
              dataKey="value"
              innerRadius={36}
              outerRadius={64}
              stroke="none"
              paddingAngle={1}
            >
              {safeSlices.map((s, i) => (
                <Cell key={i} fill={s.fill} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={7}
              formatter={(v) => <span className="text-xs text-gray-600 capitalize">{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SalesCard({ data }: { data: ReportsData["charts"]["sales"] }) {
  // Detect a "no sales yet" state so we don't render five identical
  // "0k" tick labels stacked on top of each other (the previous
  // build's most-reported eyesore on mobile). When everything is
  // zero we swap the chart for a small empty state that still
  // explains the legend, instead of the visually-broken axis.
  const hasData = data.some(
    (d) => Number(d.gross || 0) + Number(d.tax || 0) + Number(d.net || 0) > 0,
  )
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900">Sales</h3>
        <ul className="flex items-center gap-2.5 text-[10.5px] text-gray-500">
          <li className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#E5D6EB]" /> Gross
          </li>
          <li className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#C9A4D6]" /> Taxes
          </li>
          <li className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#7B2D8E]" /> Net
          </li>
        </ul>
      </div>
      <div className="h-44">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "#6B7280" }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => `₦${naira0(v)}`}
                contentStyle={{ borderRadius: 8, border: "1px solid #F3F4F6", fontSize: 12 }}
              />
              <Bar dataKey="gross" fill="#E5D6EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tax" fill="#C9A4D6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" fill="#7B2D8E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-3">
            <div className="w-9 h-9 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mb-2">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-gray-900">No sales yet</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Bars will appear here once paid bookings are recorded.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ServicesProductsCard({
  servicesQty,
  servicesItems,
  productsQty,
  productsItems,
}: {
  servicesQty: number
  servicesItems: number
  productsQty: number
  productsItems: number
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-4">
      <KpiRow
        icon={Package}
        title="Services"
        salesQuantity={servicesQty}
        itemsSold={servicesItems}
      />
      <div className="border-t border-gray-100" />
      <KpiRow
        icon={ShoppingBag}
        title="Products"
        salesQuantity={productsQty}
        itemsSold={productsItems}
      />
      <div className="border-t border-gray-100" />
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Voucher</p>
        <p className="text-sm font-semibold text-[#7B2D8E]">%</p>
      </div>
    </div>
  )
}

function KpiRow({
  icon: Icon,
  title,
  salesQuantity,
  itemsSold,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  salesQuantity: number
  itemsSold: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <Icon className="h-4 w-4 text-[#7B2D8E]" />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
        <dt className="text-gray-500">Sales quantity</dt>
        <dd className="text-right font-semibold text-gray-900 tabular-nums">{salesQuantity}</dd>
        <dt className="text-gray-500">Items sold</dt>
        <dd className="text-right font-semibold text-gray-900 tabular-nums">{itemsSold}</dd>
      </dl>
    </div>
  )
}
