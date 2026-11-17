"use client"

/**
 * /staff/reports
 *
 * Business Performance console for Dermaspace staff & admin.
 * All 5 tabs (Executive Summary, Monthly Summary, Customer Spend,
 * Reviews, Expense Report) and the Staff + Date Range filters are wired
 * directly to /api/staff/reports.
 */

import { useState } from "react"
import Link from "next/link"
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
  TrendingUp,
  Loader2,
  MapPin,
  User,
  Package,
  ShoppingBag,
  Star,
  Receipt,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { safeFetcher } from "@/lib/safe-fetcher"
import { DataLoadError } from "@/components/shared/data-load-error"

const fetcher = (url: string) => safeFetcher(url, { cache: "no-store" })

interface ReportsData {
  staffOptions?: Array<{ id: string; name: string }>
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
  monthly?: Array<{
    month: string
    bookings: number
    completed: number
    revenue: number
  }>
  customerSpend?: Array<{
    id: string
    name: string
    email: string
    bookingsCount: number
    totalSpent: number
    lastVisit: string
  }>
  reviews?: {
    avgRating: number
    totalReviews: number
    items: Array<{
      bookingReference: string
      customerName: string
      rating: number
      body: string | null
      wouldRecommend: boolean | null
      createdAt: string
    }>
  }
  expenses?: {
    totalExpenses: number
    categories: Array<{ category: string; total: number; count: number }>
    recent: Array<{
      id: string
      category: string
      description: string
      amount: number
      paidAt: string
    }>
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
  const [staffId, setStaffId] = useState<string>("all")

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean } & ReportsData>(
    `/api/staff/reports?range=${range}&staffId=${encodeURIComponent(staffId)}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const staffOptions = data?.staffOptions ?? []

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Business Performance
        </h1>
      </header>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-1 sm:mx-0 px-1 sm:px-0">
        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1 whitespace-nowrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                tab === t.key
                  ? "bg-white text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {TABS.find((t) => t.key === tab)?.label}
          </h2>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            All branches
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
            <User className="h-3.5 w-3.5 text-[#7B2D8E]" />
            <select
              aria-label="Filter by staff member"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="bg-transparent font-medium text-gray-700 focus:outline-none"
            >
              <option value="all">All staff</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700">
            <Calendar className="h-3.5 w-3.5 text-[#7B2D8E]" />
            <select
              aria-label="Select date range"
              value={range}
              onChange={(e) =>
                setRange(e.target.value as "last_month" | "last_30d" | "this_year")
              }
              className="bg-transparent font-medium text-gray-700 focus:outline-none"
            >
              <option value="last_month">Last month</option>
              <option value="last_30d">Last 30 days</option>
              <option value="this_year">This year</option>
            </select>
          </div>
        </div>
      </div>

      {error && !data ? (
        <DataLoadError title="Could not load report" error={error} onRetry={() => mutate()} />
      ) : isLoading || !data ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-24 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
        </div>
      ) : tab === "executive" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <CustomersCard data={data.charts.customers} />
            <TrendsCard
              data={data.charts.trend}
              avg={data.stats.avgAppointments}
              delta={data.stats.trendsDeltaPct}
            />
          </div>

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
      ) : tab === "monthly" ? (
        <MonthlySummaryTab rows={data.monthly ?? []} />
      ) : tab === "customer_spend" ? (
        <CustomerSpendTab rows={data.customerSpend ?? []} />
      ) : tab === "reviews" ? (
        <ReviewsTab reviews={data.reviews} />
      ) : (
        <ExpenseReportTab expenses={data.expenses} />
      )}
    </div>
  )
}

function MonthlySummaryTab({
  rows,
}: {
  rows: NonNullable<ReportsData["monthly"]>
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="grid grid-cols-12 gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <div className="col-span-4">Month</div>
        <div className="col-span-2 text-right">Bookings</div>
        <div className="col-span-3 text-right">Completed</div>
        <div className="col-span-3 text-right">Paid Revenue</div>
      </div>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-xs text-gray-500">No monthly booking records yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={r.month} className="grid grid-cols-12 gap-3 items-center px-5 py-3 text-sm">
              <span className="col-span-4 font-medium text-gray-900">{r.month}</span>
              <span className="col-span-2 text-right tabular-nums text-gray-700">{r.bookings}</span>
              <span className="col-span-3 text-right tabular-nums text-gray-700">{r.completed}</span>
              <span className="col-span-3 text-right tabular-nums font-semibold text-[#7B2D8E]">
                ₦{naira0(r.revenue)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CustomerSpendTab({
  rows,
}: {
  rows: NonNullable<ReportsData["customerSpend"]>
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <div className="col-span-5">Customer</div>
        <div className="col-span-2 text-right">Visits</div>
        <div className="col-span-3 text-right">Last visit</div>
        <div className="col-span-2 text-right">Total spend</div>
      </div>
      {rows.length === 0 ? (
        <p className="py-12 text-center text-xs text-gray-500">No customer spend records yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 text-sm hover:bg-[#7B2D8E]/[0.03]"
            >
              <div className="col-span-12 sm:col-span-5 min-w-0">
                <p className="font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">{c.email}</p>
              </div>
              <div className="col-span-4 sm:col-span-2 sm:text-right text-xs text-gray-700 tabular-nums">
                {c.bookingsCount} visits
              </div>
              <div className="col-span-4 sm:col-span-3 sm:text-right text-xs text-gray-500 tabular-nums">
                {c.lastVisit || "—"}
              </div>
              <div className="col-span-4 sm:col-span-2 text-right font-semibold text-[#7B2D8E] tabular-nums">
                ₦{naira0(c.totalSpent)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ReviewsTab({ reviews }: { reviews?: ReportsData["reviews"] }) {
  const items = reviews?.items ?? []
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
            Average Rating
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900 inline-flex items-center gap-1.5 tabular-nums">
            <Star className="h-4 w-4 fill-[#7B2D8E] text-[#7B2D8E]" />
            {reviews?.avgRating ?? 0} / 5
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
            Total Reviews
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
            {reviews?.totalReviews ?? 0}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        {items.length === 0 ? (
          <p className="py-12 text-center text-xs text-gray-500">No client reviews submitted yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((r) => (
              <li key={`${r.bookingReference}-${r.createdAt}`} className="px-5 py-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.customerName}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2 py-0.5 text-[11px] font-semibold">
                      <Star className="h-3 w-3 fill-[#7B2D8E]" />
                      {r.rating}.0
                    </span>
                  </div>
                  <Link
                    href={`/booking/${encodeURIComponent(r.bookingReference)}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:underline"
                  >
                    <Receipt className="h-3 w-3" />
                    {r.bookingReference}
                  </Link>
                </div>
                {r.body && <p className="text-sm text-gray-700">{r.body}</p>}
                <p className="text-[11px] text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {r.wouldRecommend === true ? " · Recommends Dermaspace" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ExpenseReportTab({ expenses }: { expenses?: ReportsData["expenses"] }) {
  const categories = expenses?.categories ?? []
  const recent = expenses?.recent ?? []
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500">
            Total Recorded Expenses
          </p>
          <p className="mt-1 text-xl font-bold text-[#7B2D8E] tabular-nums">
            ₦{naira0(expenses?.totalExpenses ?? 0)}
          </p>
        </div>
        {categories.slice(0, 2).map((c) => (
          <div key={c.category} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 truncate">
              {c.category}
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
              ₦{naira0(c.total)}
            </p>
            <p className="text-[11px] text-gray-500">{c.count} entries</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-semibold text-gray-900">Recent expenses</p>
          <Link href="/staff/money" className="text-xs font-semibold text-[#7B2D8E] hover:underline">
            Record in Money
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-12 text-center text-xs text-gray-500">
            No operating expenses recorded yet. Use Money › Record expense to log items.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{e.description}</p>
                  <p className="text-xs text-gray-500">
                    {e.category} ·{" "}
                    {new Date(e.paidAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="font-semibold text-[#7B2D8E] tabular-nums flex-shrink-0">
                  ₦{naira0(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
            vs last period
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
