"use client"

/**
 * /staff/complaints
 *
 * Customer complaints + support tickets, in one unified inbox. The
 * page used to gate on `data.success` (which the admin API doesn't
 * return) and silently render empty. This rewrite consumes the
 * actual `/api/admin/complaints` payload — `complaints[]`,
 * `statusCounts`, `sourceCounts` — and surfaces network/HTTP errors
 * visibly so a broken API never produces a phantom empty state.
 *
 * Brand rules: brand purple #7B2D8E, hairline borders, no shadows.
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
  MessageSquare,
  Search,
  Eye,
  Reply,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  User,
  AlertTriangle,
  Mail,
  Ticket,
} from "lucide-react"
import { useNotify } from "@/components/shared/notify"
import { cn } from "@/lib/utils"

interface Complaint {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  status: string
  priority: string
  category: string | null
  assigned_to: string | null
  created_at: string
  source?: "complaint" | "ticket"
  ticket_id?: string | null
  ticket_source?: "app" | "email" | null
  last_activity_at?: string
  reply_count?: number
}

interface ApiResponse {
  complaints: Complaint[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  statusCounts: Record<string, number>
  sourceCounts?: { complaints: number; tickets: number }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const statusConfig: Record<string, { cls: string; Icon: typeof Clock; label: string }> = {
  open: {
    cls: "bg-[#7B2D8E]/15 text-[#5A1D6A] ring-[#7B2D8E]/30",
    Icon: AlertCircle,
    label: "Open",
  },
  pending: {
    cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20",
    Icon: Clock,
    label: "Pending",
  },
  in_progress: {
    cls: "bg-[#7B2D8E] text-white ring-[#7B2D8E]",
    Icon: RefreshCw,
    label: "In progress",
  },
  resolved: {
    cls: "bg-gray-100 text-gray-700 ring-gray-200",
    Icon: CheckCircle2,
    label: "Resolved",
  },
  closed: {
    cls: "bg-gray-100 text-gray-500 ring-gray-200",
    Icon: CheckCircle2,
    label: "Closed",
  },
}

const priorityCls: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 ring-gray-200",
  normal: "bg-gray-50 text-gray-700 ring-gray-200",
  medium: "bg-[#7B2D8E]/8 text-[#7B2D8E] ring-[#7B2D8E]/20",
  high: "bg-[#7B2D8E]/15 text-[#5A1D6A] ring-[#7B2D8E]/30",
  urgent: "bg-[#7B2D8E] text-white ring-[#7B2D8E]",
}

export default function StaffComplaintsPage() {
  const notify = useNotify()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selected, setSelected] = useState<Complaint | null>(null)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyMessage, setReplyMessage] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchComplaints = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      const res = await fetch(`/api/admin/complaints?${params}`, { cache: "no-store" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || `HTTP ${res.status} — could not load complaints`)
        return
      }
      const json = (await res.json()) as ApiResponse
      setData(json)
    } catch (err) {
      console.error("Complaints fetch failed:", err)
      setError("Network error. Check your connection and retry.")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const handleReply = async () => {
    if (!selected || !replyMessage.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: selected.source === "ticket" ? "ticket" : "complaint",
          entityId: selected.id,
          message: replyMessage,
          newStatus: newStatus || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        notify.error("Could not send reply", j.error || `HTTP ${res.status}`)
        return
      }
      notify.success("Reply sent", "The customer has been notified.")
      setReplyOpen(false)
      setSelected(null)
      setReplyMessage("")
      setNewStatus("")
      fetchComplaints()
    } catch (err) {
      console.error("Reply failed:", err)
      notify.error("Network error", "Could not send the reply.")
    } finally {
      setSubmitting(false)
    }
  }

  const complaints = data?.complaints ?? []
  const filtered = complaints.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q) ||
      c.message?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Customer complaints
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Reply to complaints and support tickets in one inbox.
          {data?.sourceCounts && (
            <span className="ml-2 text-[11.5px] text-gray-400">
              ({data.sourceCounts.complaints} complaints · {data.sourceCounts.tickets} tickets)
            </span>
          )}
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Could not load complaints</p>
            <p className="text-xs text-gray-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchComplaints}
            className="text-xs font-semibold text-[#7B2D8E] hover:underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {["open", "in_progress", "resolved", "closed"].map((s) => {
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
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                {cfg.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <Card className="border-gray-100 rounded-2xl">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, email, subject..."
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
            <MessageSquare className="h-4 w-4 text-[#7B2D8E]" />
            Inbox
          </CardTitle>
          <CardDescription className="text-xs">
            {filtered.length} {filtered.length === 1 ? "item" : "items"}
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
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">No complaints</p>
              <p className="mt-1 text-xs text-gray-500">
                {error ? "Retry above when ready." : "Every customer is happy right now."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((c) => {
                const cfg = statusConfig[c.status] || statusConfig.open
                return (
                  <li
                    key={`${c.source}-${c.id}`}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[#7B2D8E]/[0.03] sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">
                          {c.subject || "(no subject)"}
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
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 capitalize",
                            priorityCls[c.priority] || priorityCls.normal,
                          )}
                        >
                          {c.priority || "normal"}
                        </span>
                        {c.source === "ticket" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            <Ticket className="h-2.5 w-2.5" />
                            Ticket
                          </span>
                        )}
                        {c.ticket_source === "email" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            <Mail className="h-2.5 w-2.5" />
                            Email
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm text-gray-600">{c.message}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {c.name || "Anonymous"}
                        </span>
                        <span>{c.email}</span>
                        <span>{formatDate(c.created_at)}</span>
                        {(c.reply_count ?? 0) > 0 && (
                          <span className="font-semibold text-[#7B2D8E]">
                            {c.reply_count} {c.reply_count === 1 ? "reply" : "replies"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(c)}
                        className="gap-1 border-gray-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      {c.status !== "resolved" && c.status !== "closed" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelected(c)
                            setReplyOpen(true)
                          }}
                          className="gap-1 bg-[#7B2D8E] hover:bg-[#5A1D6A]"
                        >
                          <Reply className="h-3.5 w-3.5" />
                          Reply
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

      {/* View dialog */}
      <Dialog open={!!selected && !replyOpen} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.subject || "Complaint"}</DialogTitle>
            <DialogDescription>Full message and metadata</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-gray-500">From</Label>
                  <p className="font-medium text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.email}</p>
                  {selected.phone && <p className="text-xs text-gray-500">{selected.phone}</p>}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Submitted</Label>
                  <p className="text-sm">{formatDate(selected.created_at)}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Message</Label>
                <div className="mt-1 rounded-lg bg-gray-50 p-3">
                  <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
                </div>
              </div>
              {selected.ticket_id && (
                <div className="rounded-lg bg-[#7B2D8E]/5 px-3 py-2">
                  <Label className="text-xs text-gray-500">Ticket reference</Label>
                  <p className="font-mono text-sm font-semibold text-[#7B2D8E]">
                    {selected.ticket_id}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selected && selected.status !== "resolved" && selected.status !== "closed" && (
              <Button
                onClick={() => setReplyOpen(true)}
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A]"
              >
                <Reply className="mr-2 h-4 w-4" />
                Reply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {selected?.name || "customer"}</DialogTitle>
            <DialogDescription>
              The customer will receive your response via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Response</Label>
              <Textarea
                placeholder="Type your reply..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Update status (optional)</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Keep current status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">Mark as in progress</SelectItem>
                  <SelectItem value="resolved">Mark as resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReply}
              disabled={!replyMessage.trim() || submitting}
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A]"
            >
              {submitting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
