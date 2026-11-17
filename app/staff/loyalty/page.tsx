"use client"

/**
 * /staff/loyalty
 *
 * Loyalty & Promos screen — in Dermaspace's purple brand palette.
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
  Target,
  CheckCircle2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useNotify } from "@/components/shared/notify"
import { cn } from "@/lib/utils"
import { safeFetcher } from "@/lib/safe-fetcher"
import { DataLoadError } from "@/components/shared/data-load-error"

const fetcher = (url: string) => safeFetcher(url, { cache: "no-store" })

interface LoyaltyData {
  program: {
    active: boolean
    rewardLabel: string
    rewardThreshold: number
    rewardPercent: number
    pointsPerNaira?: number
    cardTitle: string
    brandSubtitle: string
  }
  stats: {
    totalIssued: number
    totalRedeemed: number
    redemptionRate: number
    topService: string | null
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
  const notify = useNotify()
  const [tab, setTab] = useState<"loyalty" | "promos">("loyalty")
  const [search, setSearch] = useState("")
  const [memberFilter, setMemberFilter] = useState<"all" | "max_discount" | "high_spend">("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [sortDesc, setSortDesc] = useState(true)
  const pageSize = 25

  const [pointsOpen, setPointsOpen] = useState(false)
  const [pointsPerNairaInput, setPointsPerNairaInput] = useState("0.01")
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [programForm, setProgramForm] = useState({
    active: true,
    rewardLabel: "10% off",
    rewardPercent: "10",
    rewardThreshold: "100000",
    cardTitle: "LOYALTY CARD",
    brandSubtitle: "powered by Dermaspace",
  })

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean } & LoyaltyData>(
    "/api/staff/loyalty",
    fetcher,
    { revalidateOnFocus: false }
  )

  const program = data?.program
  const stats = data?.stats
  const members = data?.members ?? []

  const filtered = members.filter((m) => {
    const matchesSearch = search
      ? m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      : true
    if (!matchesSearch) return false
    if (memberFilter === "max_discount") {
      const targetPct = program?.rewardPercent ?? 10
      return m.discountValue >= targetPct
    }
    if (memberFilter === "high_spend") {
      const threshold = program?.rewardThreshold ?? 100_000
      return m.spendValue >= threshold
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    sortDesc ? b.discountValue - a.discountValue : a.discountValue - b.discountValue
  )
  const start = (page - 1) * pageSize
  const visible = sorted.slice(start, start + pageSize)
  const lastPage = Math.max(1, Math.ceil(sorted.length / pageSize))

  const openPointsDialog = () => {
    setPointsPerNairaInput(String(program?.pointsPerNaira ?? 0.01))
    setPointsOpen(true)
  }

  const openEditDialog = () => {
    setProgramForm({
      active: program?.active ?? true,
      rewardLabel: program?.rewardLabel ?? "10% off",
      rewardPercent: String(program?.rewardPercent ?? 10),
      rewardThreshold: String(program?.rewardThreshold ?? 100000),
      cardTitle: program?.cardTitle ?? "LOYALTY CARD",
      brandSubtitle: program?.brandSubtitle ?? "powered by Dermaspace",
    })
    setEditOpen(true)
  }

  const handleSavePoints = async () => {
    const val = Number(pointsPerNairaInput)
    if (!Number.isFinite(val) || val <= 0) {
      notify.error("Invalid ratio", "Enter a positive points-per-Naira value (e.g. 0.01 = 1 pt per ₦100).")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/staff/loyalty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsPerNaira: val }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        notify.error("Update failed", json?.error || `HTTP ${res.status}`)
        return
      }
      notify.success("Points updated", "Loyalty earning rate saved.")
      setPointsOpen(false)
      mutate()
    } catch {
      notify.error("Network error", "Could not save points settings.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProgram = async () => {
    const rewardPercent = Number(programForm.rewardPercent)
    const rewardThreshold = Number(programForm.rewardThreshold)
    if (!programForm.rewardLabel.trim() || !Number.isFinite(rewardPercent) || rewardPercent <= 0 || !Number.isFinite(rewardThreshold) || rewardThreshold <= 0) {
      notify.error("Invalid details", "Check reward label, percentage, and spend threshold.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/staff/loyalty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: programForm.active,
          rewardLabel: programForm.rewardLabel.trim(),
          rewardPercent,
          rewardThreshold,
          cardTitle: programForm.cardTitle.trim() || "LOYALTY CARD",
          brandSubtitle: programForm.brandSubtitle.trim() || "powered by Dermaspace",
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        notify.error("Update failed", json?.error || `HTTP ${res.status}`)
        return
      }
      notify.success("Program updated", "Loyalty configuration saved.")
      setEditOpen(false)
      mutate()
    } catch {
      notify.error("Network error", "Could not update loyalty program.")
    } finally {
      setSaving(false)
    }
  }

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
                ? "bg-white text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {error && !data && tab === "loyalty" ? (
        <DataLoadError
          title="Could not load loyalty programme"
          error={error}
          onRetry={() => mutate()}
        />
      ) : tab === "promos" ? (
        <PromosEmptyState />
      ) : (
        <>
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <SettingsIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">
                      Loyalty program
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        program?.active
                          ? "bg-[#7B2D8E]/10 text-[#7B2D8E]"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          program?.active ? "bg-[#7B2D8E]" : "bg-gray-400"
                        )}
                      />
                      {program?.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    Reward members spending over {naira(program?.rewardThreshold ?? 100_000)} with {program?.rewardLabel ?? "10% off"}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openPointsDialog}
                  className="gap-2 border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] flex-1 sm:flex-initial justify-center"
                >
                  <SettingsIcon className="h-3.5 w-3.5" />
                  Points
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={openEditDialog}
                  className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white flex-1 sm:flex-initial justify-center"
                >
                  Edit program
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <KpiTile
              label="Redemption"
              value={`${stats?.redemptionRate ?? 0}%`}
              hint={`${stats?.totalRedeemed ?? 0} / ${stats?.totalIssued ?? 0}`}
            />
            <KpiTile
              label="Members"
              value={members.length.toString()}
              hint="On programme"
            />
            <KpiTile
              label="Top service"
              value={stats?.topService ?? "—"}
              hint="Most redeemed"
              truncate
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <RedemptionCard
                rate={stats?.redemptionRate ?? 0}
                issued={stats?.totalIssued ?? 0}
                redeemed={stats?.totalRedeemed ?? 0}
              />
            </div>
            <div className="lg:col-span-3">
              <LoyaltyCardArt
                title={program?.cardTitle ?? "LOYALTY CARD"}
                subtitle={program?.brandSubtitle ?? "powered by Dermaspace"}
                rewardLabel={program?.rewardLabel ?? "10% off"}
                threshold={program?.rewardThreshold ?? 100_000}
              />
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
                    placeholder="Search by name or email"
                    className="h-10 pl-9 border-gray-200 focus-visible:ring-[#7B2D8E]/30"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFilterOpen((v) => !v)}
                  className={cn(
                    "gap-2 border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]",
                    (filterOpen || memberFilter !== "all") && "border-[#7B2D8E] text-[#7B2D8E] bg-[#7B2D8E]/5"
                  )}
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
                  {sorted.length === 0 ? "0-0" : `${start + 1}-${Math.min(start + pageSize, sorted.length)}`}
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

            {filterOpen && (
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-[#FBF9FC] px-4 py-2.5">
                {(
                  [
                    { id: "all", label: "All members" },
                    { id: "max_discount", label: "Max reward unlocked" },
                    { id: "high_spend", label: "Above threshold" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setMemberFilter(f.id)
                      setPage(1)
                    }}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      memberFilter === f.id
                        ? "bg-[#7B2D8E] text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:text-[#7B2D8E]"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

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
                <p className="text-sm font-semibold text-gray-900">No members match</p>
                <p className="mt-1 text-xs text-gray-500">
                  {members.length === 0
                    ? "Loyalty members will appear here as customers spend."
                    : "Try clearing your search or filter."}
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

      {/* Points Settings Dialog */}
      <Dialog open={pointsOpen} onOpenChange={setPointsOpen}>
        <DialogContent className="max-w-md border-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle>Points earning rate</DialogTitle>
            <DialogDescription>
              Set how many loyalty points customers earn per Naira spent (e.g. 0.01 = 1 point per ₦100).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="points-per-naira">Points per Naira</Label>
            <Input
              id="points-per-naira"
              type="number"
              step="0.001"
              min="0.001"
              value={pointsPerNairaInput}
              onChange={(e) => setPointsPerNairaInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePoints}
              disabled={saving}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Loyalty Program Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md border-gray-200 bg-white">
          <DialogHeader>
            <DialogTitle>Edit loyalty program</DialogTitle>
            <DialogDescription>
              Update reward tiers, threshold, and card branding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              <span className="font-medium text-gray-900">Programme active</span>
              <input
                type="checkbox"
                checked={programForm.active}
                onChange={(e) => setProgramForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 accent-[#7B2D8E]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="reward-label">Reward label</Label>
                <Input
                  id="reward-label"
                  value={programForm.rewardLabel}
                  onChange={(e) => setProgramForm((f) => ({ ...f, rewardLabel: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reward-percent">Reward %</Label>
                <Input
                  id="reward-percent"
                  type="number"
                  min={1}
                  max={100}
                  value={programForm.rewardPercent}
                  onChange={(e) => setProgramForm((f) => ({ ...f, rewardPercent: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="reward-threshold">Spend threshold (NGN)</Label>
              <Input
                id="reward-threshold"
                type="number"
                min={1000}
                step={1000}
                value={programForm.rewardThreshold}
                onChange={(e) => setProgramForm((f) => ({ ...f, rewardThreshold: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="card-title">Card title</Label>
                <Input
                  id="card-title"
                  value={programForm.cardTitle}
                  onChange={(e) => setProgramForm((f) => ({ ...f, cardTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="brand-subtitle">Subtitle</Label>
                <Input
                  id="brand-subtitle"
                  value={programForm.brandSubtitle}
                  onChange={(e) => setProgramForm((f) => ({ ...f, brandSubtitle: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProgram}
              disabled={saving}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#7B2D8E] p-5 sm:p-7 lg:p-8 text-white aspect-[16/11] sm:aspect-[16/10]">
      <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/[0.06]" aria-hidden />
      <div className="absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-white/[0.06]" aria-hidden />

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

function KpiTile({
  label,
  value,
  hint,
  truncate,
}: {
  label: string
  value: string
  hint?: string
  truncate?: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-base sm:text-lg font-bold text-gray-900 tabular-nums",
          truncate && "truncate"
        )}
        title={truncate ? value : undefined}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[10.5px] text-gray-500 mt-0.5 truncate">{hint}</p>
      )}
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
        Promos let you run time-bound campaigns alongside loyalty. Your loyalty programme
        keeps running in the meantime.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#7B2D8E]">
        <CheckCircle2 className="h-4 w-4" />
        Active loyalty rewards enabled
      </div>
    </div>
  )
}
