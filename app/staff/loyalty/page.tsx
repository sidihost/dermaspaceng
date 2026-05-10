"use client"

/**
 * /staff/loyalty
 *
 * Loyalty & Promos screen — mirrors the Splice page in our purple
 * brand palette.
 *
 * Layout, top to bottom:
 *   1. Tabs (Loyalty | Promos).
 *   2. Header row with Points Settings + Edit Loyalty Program actions.
 *   3. Two-column grid:
 *        a. Programme status card + the rich loyalty card promo.
 *        b. Redemption rate (donut) + Top service callout.
 *   4. Top members table (search + filter + paginator + rows).
 *
 * Promos tab is a placeholder until we ship the promo schema; the
 * empty state matches the rest of the staff console.
 */

import { useState } from "react"
import useSWR from "swr"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  ArrowUpRight,
  Target,
  CheckCircle2,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json())

interface LoyaltyData {
  program: {
    active: boolean
    rewardLabel: string
    rewardThreshold: number
    rewardPercent: number
    cardTitle: string
    brandSubtitle: string
  }
  stats: {
    totalIssued: number
    totalRedeemed: number
    redemptionRate: number
    topService: string
  }
  members: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    spendValue: number
    pointsEarned: number
    discountValue: number
  }[]
}

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n)

export default function StaffLoyaltyPage() {
  const [tab, setTab] = useState<"loyalty" | "promos">("loyalty")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [sortDesc, setSortDesc] = useState(true)
  const pageSize = 25

  const { data, isLoading } = useSWR<{ success: boolean } & LoyaltyData>(
    "/api/staff/loyalty",
    fetcher,
    { revalidateOnFocus: false }
  )

  const program = data?.program
  const stats = data?.stats
  const members = data?.members ?? []

  const filtered = members.filter((m) =>
    search ? m.name.toLowerCase().includes(search.toLowerCase()) : true
  )
  const sorted = [...filtered].sort((a, b) =>
    sortDesc ? b.discountValue - a.discountValue : a.discountValue - b.discountValue
  )
  const start = (page - 1) * pageSize
  const visible = sorted.slice(start, start + pageSize)
  const lastPage = Math.max(1, Math.ceil(sorted.length / pageSize))

  return (
    <div className="space-y-5">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Loyalty</h1>
      </header>

      {/* Tabs */}
      <div className="rounded-full bg-gray-100 p-1 w-fit">
        {(["loyalty", "promos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full transition-colors capitalize",
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "promos" ? (
        <PromosEmptyState />
      ) : (
        <>
          {/* Loyalty list header / actions — stacks on phones so the two
              CTAs never crowd a 360px screen. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-900">Loyalty list</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] w-full sm:w-auto justify-center"
              >
                <SettingsIcon className="h-4 w-4" />
                Points settings
              </Button>
              <Button className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white w-full sm:w-auto justify-center">
                Edit Loyalty Program
              </Button>
            </div>
          </div>

          {/* Top grid: program + card | redemption rate + top service */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              {/* Programme status */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
                    <SettingsIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      Loyalty program status
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      Track your loyalty program status
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                    program?.active
                      ? "bg-[#7B2D8E]/10 text-[#7B2D8E]"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      program?.active ? "bg-[#7B2D8E]" : "bg-gray-400"
                    )}
                  />
                  {program?.active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Loyalty card promo */}
              <LoyaltyCardArt
                title={program?.cardTitle ?? "LOYALTY CARD"}
                subtitle={program?.brandSubtitle ?? "powered by Dermaspace"}
                rewardLabel={program?.rewardLabel ?? "10% off"}
                threshold={program?.rewardThreshold ?? 100_000}
              />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <RedemptionCard
                rate={stats?.redemptionRate ?? 0}
                issued={stats?.totalIssued ?? 0}
                redeemed={stats?.totalRedeemed ?? 0}
              />

              {/* Top service */}
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      Top service purchased
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      Service with the highest amount of purchase
                    </p>
                  </div>
                </div>
                <p className="text-base font-bold text-gray-900 flex-shrink-0">
                  {stats?.topService ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Top members table */}
          <section className="rounded-2xl border border-gray-100 bg-white">
            {/* Search + filter + paginator */}
            <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 w-full sm:max-w-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search by name, date"
                    className="h-10 pl-9 border-gray-200 focus-visible:ring-[#7B2D8E]/30"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  className="gap-2 border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]"
                >
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-gray-200 px-1 py-0.5 self-end sm:self-auto">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-full hover:bg-gray-50 disabled:opacity-30"
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-500" />
                </button>
                <span className="text-xs text-gray-700 px-1 tabular-nums">
                  {start + 1}-{Math.min(start + pageSize, sorted.length)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  className="p-1 rounded-full hover:bg-gray-50 disabled:opacity-30"
                  disabled={page >= lastPage}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <p className="text-sm font-semibold text-gray-700">Top members</p>
            </div>

            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <div className="col-span-5">Name</div>
              <div className="col-span-3">Spend value</div>
              <div className="col-span-2">Points earned</div>
              <button
                onClick={() => setSortDesc((v) => !v)}
                className="col-span-2 inline-flex items-center justify-end gap-1 cursor-pointer text-right hover:text-[#7B2D8E]"
              >
                Discount value
                {sortDesc ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <p className="text-sm font-semibold text-gray-900">No members yet</p>
                <p className="mt-1 text-xs text-gray-500">
                  Loyalty members will appear here as customers spend.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visible.map((m) => (
                  <li
                    key={m.id}
                    className="grid grid-cols-12 gap-2 sm:gap-3 items-center px-4 py-3.5 hover:bg-[#7B2D8E]/[0.03] transition-colors"
                  >
                    <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[10.5px] font-bold uppercase text-[#7B2D8E]">
                        {m.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")}
                      </span>
                      <p className="truncate text-sm font-medium text-gray-900">{m.name}</p>
                    </div>
                    {/* Mobile: 3 metric chips share the row beneath the name.
                        The sm: layout falls back to the original 12-col split. */}
                    <div className="col-span-4 sm:col-span-3 min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider sm:hidden">
                        Spend
                      </p>
                      <p className="truncate text-[13px] sm:text-sm text-gray-700 tabular-nums">
                        {naira(m.spendValue)}
                      </p>
                    </div>
                    <div className="col-span-4 sm:col-span-2 min-w-0">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider sm:hidden">
                        Points
                      </p>
                      <p className="truncate text-[13px] sm:text-sm font-semibold text-gray-900 tabular-nums">
                        {m.pointsEarned}
                      </p>
                    </div>
                    <div className="col-span-4 sm:col-span-2 min-w-0 text-right">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider sm:hidden">
                        Discount
                      </p>
                      <p className="truncate text-[13px] sm:text-sm font-semibold text-[#7B2D8E] tabular-nums">
                        {m.discountValue}%
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function LoyaltyCardArt({
  title,
  subtitle,
  rewardLabel,
  threshold,
}: {
  title: string
  subtitle: string
  rewardLabel: string
  threshold: number
}) {
  // The whole card lives in a `relative` wrapper with `overflow-hidden`
  // so the decorative circles never bleed outside the rounded edges.
  // `min-w-0` on inner flex children keeps long Dermaspace labels from
  // pushing the right cluster off-screen on a 360px phone — the
  // earlier version cut off "Dermaspace" → "Dermaspa" because the
  // right cluster had no flex-shrink protection. Padding stepped down
  // on mobile (p-5) so the inner content has more room without
  // shrinking the card itself; aspect ratio relaxed on phones (16/11)
  // so the reward number doesn't crash into the threshold sub-line.
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#7B2D8E] p-5 sm:p-7 lg:p-8 text-white aspect-[16/11] sm:aspect-[16/10]">
      {/* Decorative grid + circles */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>
      <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/[0.04]" aria-hidden />
      <div className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-white/[0.04]" aria-hidden />

      {/* Top row — left title is allowed to shrink/truncate, right
          brand cluster never shrinks (flex-shrink-0) so the
          "DERMASPACE" wordmark and subtitle always render in full. */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-[10.5px] sm:text-[11px] font-semibold tracking-[0.18em] sm:tracking-[0.24em] uppercase text-white/80 truncate min-w-0">
          {title}
        </p>
        <div className="text-right flex-shrink-0">
          <p className="text-[11px] uppercase tracking-wider text-white/80 leading-tight">
            Dermaspace
          </p>
          <p className="text-[10px] sm:text-[10.5px] text-white/60 leading-tight mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Reward — slight bump on phones too, but still scales cleanly
          to the larger sm/md sizes when there's room. */}
      <div className="relative z-10 mt-5 sm:mt-10">
        <p className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-none">
          {rewardLabel}
        </p>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm italic text-white/70">
          after {naira(threshold)} spent
        </p>
      </div>
    </div>
  )
}

function RedemptionCard({
  rate,
  issued,
  redeemed,
}: {
  rate: number
  issued: number
  redeemed: number
}) {
  // Two-slice pie. We deliberately keep both colours inside the brand
  // family — solid purple for redeemed, light gray for un-redeemed —
  // so the donut doesn't read as a "system status" widget.
  const pieData = [
    { name: "Redeemed", value: rate, fill: "#7B2D8E" },
    { name: "Remaining", value: Math.max(0, 100 - rate), fill: "#E5E7EB" },
  ]
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Redemption rate</h3>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-40 w-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={52}
                outerRadius={70}
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-gray-900">{rate}%</p>
            <p className="text-[10.5px] text-gray-500">Points redeemed</p>
          </div>
        </div>
        <ul className="space-y-3 flex-1 min-w-0">
          <li className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gray-200" aria-hidden />
            <div>
              <p className="text-xs text-gray-500">Total issued</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">{issued}</p>
            </div>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#7B2D8E]" aria-hidden />
            <div>
              <p className="text-xs text-gray-500">Total redeemed</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">{redeemed}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}

function PromosEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
        <Target className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-900">No promos yet</p>
      <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
        Promos let you run time-bound campaigns alongside loyalty. The
        promo schema lands in a future release — your loyalty programme
        keeps running in the meantime.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#7B2D8E]">
        <CheckCircle2 className="h-4 w-4" />
        Coming soon
      </div>
    </div>
  )
}
