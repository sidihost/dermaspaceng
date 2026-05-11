"use client"

/**
 * /staff/gift-cards
 *
 * Process gift card requests submitted from the marketing site. The
 * page was previously rendering empty because it expected an API
 * response shape (`{ success, requests }` with `user_name` /
 * `user_email` / `message` fields) that doesn't exist — the actual
 * `gift_card_requests` schema uses `recipient_name`, `sender_name`,
 * `personal_message`, etc. This rewrite matches the real schema and
 * the existing `/api/admin/gift-cards` contract (which is staff-
 * accessible via `requireAdminOrStaff`).
 *
 * Brand rules: brand purple #7B2D8E, neutral grays, hairline borders,
 * no gradients/shadows, professional Lucide icons.
 */

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Gift,
  Search,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  AlertTriangle,
  Mail,
  Phone,
  Calendar as CalendarIcon,
} from "lucide-react"
import { useNotify } from "@/components/shared/notify"
import { cn } from "@/lib/utils"

interface GiftCardRequest {
  id: number
  user_id: string | null
  amount: number
  design: string | null
  design_name: string | null
  occasion: string | null
  recipient_name: string
  recipient_email: string | null
  recipient_phone: string | null
  sender_name: string | null
  sender_email: string | null
  personal_message: string | null
  delivery_method: string | null
  delivery_date: string | null
  status: string
  assigned_to: string | null
  notes: string | null
  created_at: string
}

interface ApiResponse {
  requests: GiftCardRequest[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  statusCounts: Record<string, number>
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const statusConfig: Record<string, { cls: string; Icon: typeof Clock; label: string }> = {
  pending: {
    cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20",
    Icon: Clock,
    label: "Pending",
  },
  processing: {
    cls: "bg-[#7B2D8E]/15 text-[#5A1D6A] ring-[#7B2D8E]/30",
    Icon: RefreshCw,
    label: "Processing",
  },
  approved: {
    cls: "bg-[#7B2D8E] text-white ring-[#7B2D8E]",
    Icon: CheckCircle2,
    label: "Approved",
  },
  completed: {
    cls: "bg-gray-100 text-gray-700 ring-gray-200",
    Icon: CheckCircle2,
    label: "Completed",
  },
  rejected: {
    cls: "bg-gray-100 text-gray-500 ring-gray-200",
    Icon: XCircle,
    label: "Rejected",
  },
}

export default function StaffGiftCardsPage() {
  const notify = useNotify()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selected, setSelected] = useState<GiftCardRequest | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      const res = await fetch(`/api/admin/gift-cards?${params}`, { cache: "no-store" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || `HTTP ${res.status} — could not load gift card requests`)
        return
      }
      const json = (await res.json()) as ApiResponse
      setData(json)
    } catch (err) {
      console.error("Gift cards fetch failed:", err)
      setError("Network error. Check your connection and retry.")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleAction = async () => {
    if (!selected || !newStatus) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selected.id,
          action: "update_status",
          value: newStatus,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        notify.error("Update failed", j.error || `HTTP ${res.status}`)
        return
      }
      if (adminNote.trim()) {
        await fetch("/api/admin/gift-cards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: selected.id,
            action: "add_notes",
            notes: adminNote.trim(),
          }),
        })
      }
      notify.success("Updated", `Marked as ${newStatus}.`)
      setActionDialogOpen(false)
      setSelected(null)
      setNewStatus("")
      setAdminNote("")
      fetchRequests()
    } catch (err) {
      console.error("Gift card action failed:", err)
      notify.error("Network error", "Could not update the request.")
    } finally {
      setSubmitting(false)
    }
  }

  const requests = data?.requests ?? []
  const filtered = requests.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.recipient_name?.toLowerCase().includes(q) ||
      r.recipient_email?.toLowerCase().includes(q) ||
      r.sender_name?.toLowerCase().includes(q) ||
      r.sender_email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Gift card requests
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Approve and process customer gift card orders.
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Could not load requests</p>
            <p className="text-xs text-gray-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchRequests}
            className="text-xs font-semibold text-[#7B2D8E] hover:underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {["pending", "processing", "approved", "completed", "rejected"].map((s) => {
          const cfg = statusConfig[s]
          const count = data?.statusCounts?.[s] ?? 0
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? "" : s)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                active
                  ? "border-[#7B2D8E] bg-[#7B2D8E]/5"
                  : "border-gray-100 bg-white hover:border-[#7B2D8E]/30",
              )}
            >
              <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">
                {count}
              </p>
              <p className="text-[11px] text-gray-500 capitalize leading-tight mt-0.5">
                {cfg.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <Card className="border-gray-100 rounded-2xl">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by recipient or sender..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 border-gray-200 focus-visible:ring-[#7B2D8E]/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-gray-100 rounded-2xl">
        <CardHeader className="border-b border-gray-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Gift className="h-4 w-4 text-[#7B2D8E]" />
            Requests
          </CardTitle>
          <CardDescription className="text-xs">
            {filtered.length} {filtered.length === 1 ? "request" : "requests"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="h-11 w-11 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                <Gift className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">No requests found</p>
              <p className="mt-1 text-xs text-gray-500">
                {error ? "Try retrying above." : "Try adjusting the filters."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const cfg = statusConfig[r.status] || statusConfig.pending
                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[#7B2D8E]/[0.03] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {r.recipient_name}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
                            cfg.cls,
                          )}
                        >
                          <cfg.Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
                        <span className="font-bold text-[#7B2D8E]">
                          {formatCurrency(r.amount)}
                        </span>
                        {r.sender_name && <span>From: {r.sender_name}</span>}
                        {r.occasion && <span className="capitalize">{r.occasion}</span>}
                      </div>
                      <p className="text-[10.5px] text-gray-400">
                        {formatDate(r.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(r)}
                        className="gap-1 border-gray-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      {r.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelected(r)
                            setActionDialogOpen(true)
                          }}
                          className="gap-1 bg-[#7B2D8E] hover:bg-[#5A1D6A]"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Action
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!selected && !actionDialogOpen} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gift card request</DialogTitle>
            <DialogDescription>Full request details</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-gray-500">From (sender)</Label>
                  <p className="font-medium text-gray-900">{selected.sender_name || "—"}</p>
                  <p className="text-xs text-gray-500">{selected.sender_email || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Amount</Label>
                  <p className="text-xl font-bold text-[#7B2D8E] tabular-nums">
                    {formatCurrency(selected.amount)}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Recipient</Label>
                <p className="font-medium text-gray-900">{selected.recipient_name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {selected.recipient_email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selected.recipient_email}
                    </span>
                  )}
                  {selected.recipient_phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selected.recipient_phone}
                    </span>
                  )}
                </div>
              </div>
              {selected.delivery_date && (
                <div>
                  <Label className="text-xs text-gray-500">Delivery</Label>
                  <p className="text-sm inline-flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3 text-[#7B2D8E]" />
                    {new Date(selected.delivery_date).toLocaleDateString("en-NG")} via {selected.delivery_method || "email"}
                  </p>
                </div>
              )}
              {selected.personal_message && (
                <div>
                  <Label className="text-xs text-gray-500">Personal message</Label>
                  <p className="mt-1 rounded-md bg-gray-50 p-3 text-sm">
                    {selected.personal_message}
                  </p>
                </div>
              )}
              {selected.notes && (
                <div>
                  <Label className="text-xs text-gray-500">Internal notes</Label>
                  <p className="mt-1 rounded-md bg-[#7B2D8E]/5 p-3 text-sm">
                    {selected.notes}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  <p className="text-sm font-semibold capitalize text-[#7B2D8E]">
                    {selected.status}
                  </p>
                </div>
                <div className="text-right">
                  <Label className="text-xs text-gray-500">Submitted</Label>
                  <p className="text-xs text-gray-700">{formatDate(selected.created_at)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selected?.status === "pending" && (
              <Button
                onClick={() => setActionDialogOpen(true)}
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A]"
              >
                Take action
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update gift card request</DialogTitle>
            <DialogDescription>
              Mark as approved, processing, completed or rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="processing">Mark as processing</SelectItem>
                  <SelectItem value="completed">Mark as completed</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Internal note (optional)</Label>
              <Textarea
                placeholder="Notes only visible to staff..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={!newStatus || submitting}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A]"
            >
              {submitting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
