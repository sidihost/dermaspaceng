"use client"

/**
 * /staff/clients
 *
 * Salon-style client management screen — mirrors the Splice "Clients"
 * panel but rendered in Dermaspace's purple/black brand. The list lives
 * on the left at all sizes; tapping a row opens a sliding detail panel
 * that overlays the right two-thirds on desktop and slides up to full
 * screen on mobile.
 *
 * Visual rules (kept consistent with the rest of the staff console):
 *   - One brand colour: #7B2D8E.
 *   - Hairline borders, rounded-xl/2xl, no drop shadows on cards.
 *   - Status / stat colours stay inside the brand purple family.
 */

import { useState } from "react"
import useSWR from "swr"
import {
  Search,
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  Users,
  Receipt,
  Award,
  StickyNote,
  X,
  Save,
  AlertTriangle,
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
import { UserAnalyticsCharts } from "@/components/shared/user-analytics-charts"
import { ClientPaymentsTab } from "@/components/staff/client-payments-tab"
import { safeFetcher } from "@/lib/safe-fetcher"
import { DataLoadError } from "@/components/shared/data-load-error"

// `safeFetcher` throws on non-OK responses so SWR's `error` slot
// fires for 401/403/500 instead of silently decoding the error
// JSON into `data` and pretending the staff member has no clients.
// `cache: 'no-store'` is preserved — the clients list must always
// reflect live customer data, not the browser's HTTP cache.
const fetcher = (url: string) => safeFetcher(url, { cache: "no-store" })

interface Client {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
  avatarUrl: string | null
  createdAt: string
  bookingsCount: number
  totalSpent: number
}

interface ClientDetail {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  phone: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  createdAt: string
  stats: {
    completed: number
    noShow: number
    cancelled: number
    totalSpent: number
    loyaltyPoints: number
  }
  // Analytics feed for the shared <UserAnalyticsCharts /> panel.
  // Optional because older API responses (cached in dev) won't have
  // it; the component already handles empty arrays gracefully.
  analytics?: {
    bookings: Array<{
      created_at: string
      status: string
      total_price_kobo: number | null
      payment_status: string | null
    }>
    pageViews: Array<{ created_at: string }>
  }
}

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n)

const formatBirthday = (iso: string | null) => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "long" })
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const initials = (first: string | null, last: string | null, email: string) => {
  const f = (first || "").trim()
  const l = (last || "").trim()
  if (f || l) return `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

export default function StaffClientsPage() {
  const [q, setQ] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR<{ clients: Client[]; total: number }>(
    `/api/staff/clients?q=${encodeURIComponent(q)}&limit=50`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { data: detail, isLoading: detailLoading, mutate: mutateDetail } = useSWR<{ client: ClientDetail }>(
    activeId ? `/api/staff/clients/${activeId}` : null,
    fetcher
  )

  const clients = data?.clients ?? []

  const refreshAll = () => {
    mutate()
    if (activeId) mutateDetail()
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.total ?? 0} customer{(data?.total ?? 0) === 1 ? "" : "s"} on file
          </p>
        </div>
        <div className="inline-flex items-center gap-2">
          <Button
            variant="outline"
            className="border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]"
            onClick={() => mutate()}
          >
            Refresh
          </Button>
        </div>
      </header>

      {/* Manage clients section card */}
      <section className="rounded-2xl border border-gray-100 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Manage Clients</h2>
            <p className="text-xs text-gray-500">Search, view and edit your customer list</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search by name, number, email"
              className="h-10 pl-9 border-gray-200 focus-visible:ring-[#7B2D8E]/30 focus-visible:border-[#7B2D8E]/50"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-hidden">
          <div className="hidden sm:grid grid-cols-12 gap-3 border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="col-span-5 inline-flex items-center gap-1">
              Client name <ChevronDown className="h-3.5 w-3.5" />
            </div>
            <div className="col-span-3 inline-flex items-center gap-1">
              Date added <ChevronDown className="h-3.5 w-3.5" />
            </div>
            <div className="col-span-2 text-right">Bookings</div>
            <div className="col-span-2 text-right">Spend</div>
          </div>

          {/* Real failure surface — replaces the blanket empty state
              the page used to fall through to whenever the API
              returned a non-OK status. */}
          {error && !data ? (
            <div className="p-4">
              <DataLoadError
                title="Could not load clients"
                error={error}
                onRetry={() => mutate()}
              />
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            </div>
          ) : clients.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">No clients found</p>
              <p className="text-xs text-gray-500">Try adjusting your search.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {clients.map((c) => {
                const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email
                const isActive = c.id === activeId
                return (
                  <li
                    key={c.id}
                    className={cn(
                      "grid grid-cols-12 items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors",
                      isActive
                        ? "bg-[#7B2D8E]/[0.06]"
                        : "hover:bg-[#7B2D8E]/[0.03]"
                    )}
                    onClick={() => setActiveId(c.id)}
                  >
                    <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[11px] font-bold uppercase text-[#7B2D8E]">
                        {initials(c.firstName, c.lastName, c.email)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                        <p className="truncate text-[11.5px] text-gray-500">{c.email}</p>
                      </div>
                    </div>
                    <div className="col-span-6 sm:col-span-3 text-xs text-gray-500">
                      {formatDate(c.createdAt)}
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-xs text-gray-700 text-right tabular-nums">
                      {c.bookingsCount}
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-xs font-semibold text-gray-900 text-right tabular-nums">
                      {naira(c.totalSpent)}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Slide-over detail */}
      {activeId && (
        <ClientDetailDrawer
          loading={detailLoading}
          client={detail?.client}
          clientId={activeId}
          onClose={() => setActiveId(null)}
          onChanged={refreshAll}
          onDeleted={() => {
            setActiveId(null)
            mutate()
          }}
        />
      )}
    </div>
  )
}

function ClientDetailDrawer({
  loading,
  client,
  clientId,
  onClose,
  onChanged,
  onDeleted,
}: {
  loading: boolean
  client: ClientDetail | undefined
  clientId: string
  onClose: () => void
  onChanged: () => void
  onDeleted: () => void
}) {
  const notify = useNotify()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
  })

  const openEdit = () => {
    if (!client) return
    setForm({
      firstName: client.firstName ?? "",
      lastName: client.lastName ?? "",
      phone: client.phone ?? "",
      dateOfBirth: client.dateOfBirth
        ? new Date(client.dateOfBirth).toISOString().slice(0, 10)
        : "",
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/staff/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim() || null,
          lastName: form.lastName.trim() || null,
          phone: form.phone.trim() || null,
          dateOfBirth: form.dateOfBirth || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) {
        notify.error("Update failed", j?.error || `HTTP ${res.status}`)
        return
      }
      notify.success("Saved", "Client details updated.")
      setEditOpen(false)
      onChanged()
    } catch (err) {
      console.error("client edit failed:", err)
      notify.error("Network error", "Could not save changes.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/staff/clients/${clientId}`, {
        method: "DELETE",
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) {
        notify.error("Delete failed", j?.error || `HTTP ${res.status}`)
        return
      }
      notify.success("Client suspended", "Their sessions were also revoked.")
      setConfirmDeleteOpen(false)
      onDeleted()
    } catch (err) {
      console.error("client delete failed:", err)
      notify.error("Network error", "Could not delete client.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Client details"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-gray-100 overflow-y-auto animate-slide-in-right"
      >
        {/* Drawer header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 backdrop-blur px-5 py-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#7B2D8E]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={onClose}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {loading || !client ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* Identity row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-sm font-bold uppercase text-[#7B2D8E]">
                  {initials(client.firstName, client.lastName, client.email)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-gray-900">
                    {[client.firstName, client.lastName].filter(Boolean).join(" ") || client.email}
                  </p>
                  <p className="truncate text-xs text-gray-500">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-gray-200"
                  onClick={openEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Personal information card */}
            <div className="rounded-2xl border border-gray-100">
              <h3 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
                Personal information
              </h3>
              <dl className="divide-y divide-gray-100 text-sm">
                <DetailRow label="First name" value={client.firstName ?? "—"} />
                <DetailRow label="Last name" value={client.lastName ?? "—"} />
                <DetailRow label="Phone number" value={client.phone ?? "—"} />
                <DetailRow label="Email address" value={client.email} />
                <DetailRow label="Birthday" value={formatBirthday(client.dateOfBirth)} />
                <DetailRow label="Customer since" value={formatDate(client.createdAt)} />
              </dl>
            </div>

            {/* Appointment statistics */}
            <div className="rounded-2xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Appointment statistics
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <StatPill label="Completed" value={client.stats.completed} tone="purple" />
                <StatPill label="No-show" value={client.stats.noShow} tone="muted" />
                <StatPill label="Cancelled" value={client.stats.cancelled} tone="muted" />
              </div>
            </div>

            {/* Customer analytics — shared component used on
                /admin/users/[userId] too. Renders booking cadence,
                cumulative spend, status mix and platform activity
                so staff can read trends, not just totals. `compact`
                mode collapses the grid to a single column so it
                fits inside this max-w-md drawer without cramping
                the legend or axis labels. */}
            <UserAnalyticsCharts
              compact
              bookings={client.analytics?.bookings ?? []}
              pageViews={client.analytics?.pageViews ?? []}
            />

            {/* Lifetime stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatBigCard
                icon={Receipt}
                label="Total transactions"
                value={naira(client.stats.totalSpent)}
              />
              <StatBigCard
                icon={Award}
                label="Total points"
                value={String(client.stats.loyaltyPoints)}
              />
              <button className="rounded-2xl border border-gray-100 p-4 text-left hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/[0.03] transition-colors">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <StickyNote className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xs font-medium text-gray-500">Notes</p>
                <p className="text-sm font-semibold text-[#7B2D8E] underline-offset-2 underline">
                  View notes
                </p>
              </button>
            </div>

            {/* Payment history — staff can view all wallet & Paystack
                transactions, and issue refunds if needed (guards check
                role + can_refund permission). The component handles
                its own loading/error states. */}
            <div className="rounded-2xl border border-gray-100 p-4">
              <ClientPaymentsTab clientId={client.id} clientName={`${client.firstName} ${client.lastName}`.trim() || client.email} />
            </div>
          </div>
        )}
      </aside>

      {/* Edit dialog — basic profile fields. Email is intentionally
          omitted because it doubles as a sign-in identifier. */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
            <DialogDescription>
              Update the customer&apos;s contact details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+234..."
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A] gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — soft-delete (suspend) since users
          rows are referenced by bookings and transactions. */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7B2D8E]" />
              Suspend client?
            </DialogTitle>
            <DialogDescription>
              This will deactivate the account and sign them out
              everywhere. Their booking and payment history is kept and
              an admin can reinstate the account later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A] gap-1.5"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Confirm suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 truncate text-right max-w-[55%]">{value}</dd>
    </div>
  )
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "purple" | "muted"
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-3 py-3",
        tone === "purple"
          ? "bg-[#7B2D8E]/10"
          : "bg-gray-50"
      )}
    >
      <p
        className={cn(
          "text-xl font-bold tabular-nums",
          tone === "purple" ? "text-[#7B2D8E]" : "text-gray-900"
        )}
      >
        {value}
      </p>
      <p className="text-[10.5px] text-gray-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

function StatBigCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-xs font-medium text-gray-500 truncate">{label}</p>
      <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
    </div>
  )
}
