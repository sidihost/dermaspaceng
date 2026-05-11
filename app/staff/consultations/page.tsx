"use client"

/**
 * /staff/consultations
 *
 * Skincare consultation bookings submitted via the public site. The
 * page used to expect fields that don't exist on the consultations
 * table (`full_name`, `concern_type`, `concern_description`,
 * `preferred_date`, `preferred_time`). This rewrite uses the actual
 * schema (`name`, `email`, `phone`, `location`, `concerns[]`,
 * `message`, `scheduled_at`, plus the newer `first_name`,
 * `last_name`, `appointment_date`, `appointment_time` columns added
 * by fix-consultations-table.sql) and gracefully handles either
 * shape.
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
  Calendar,
  Search,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  User,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
} from "lucide-react"
import { useNotify } from "@/components/shared/notify"
import { cn } from "@/lib/utils"

interface Consultation {
  id: number
  name: string
  email: string
  phone: string | null
  location: string | null
  concerns: string[] | string | null
  message: string | null
  status: string
  scheduled_at: string | null
  created_at: string
  // newer optional columns
  first_name?: string | null
  last_name?: string | null
  appointment_date?: string | null
  appointment_time?: string | null
  admin_notes?: string | null
  notes?: string | null
}

interface ApiResponse {
  consultations: Consultation[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  statusCounts: Record<string, number>
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const statusConfig: Record<string, { cls: string; Icon: typeof Clock; label: string }> = {
  pending: {
    cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20",
    Icon: Clock,
    label: "Pending",
  },
  confirmed: {
    cls: "bg-[#7B2D8E] text-white ring-[#7B2D8E]",
    Icon: CheckCircle2,
    label: "Confirmed",
  },
  completed: {
    cls: "bg-gray-100 text-gray-700 ring-gray-200",
    Icon: CheckCircle2,
    label: "Completed",
  },
  cancelled: {
    cls: "bg-gray-100 text-gray-500 ring-gray-200",
    Icon: XCircle,
    label: "Cancelled",
  },
}

const displayName = (c: Consultation) => {
  if (c.first_name || c.last_name) {
    return [c.first_name, c.last_name].filter(Boolean).join(" ")
  }
  return c.name || "Anonymous"
}

const displayConcerns = (c: Consultation): string[] => {
  if (!c.concerns) return []
  if (Array.isArray(c.concerns)) return c.concerns
  try {
    const parsed = JSON.parse(String(c.concerns))
    return Array.isArray(parsed) ? parsed : [String(c.concerns)]
  } catch {
    return [String(c.concerns)]
  }
}

const displayWhen = (c: Consultation): string | null => {
  if (c.appointment_date) {
    return `${formatShortDate(c.appointment_date)}${c.appointment_time ? ` at ${c.appointment_time}` : ""}`
  }
  if (c.scheduled_at) return formatDate(c.scheduled_at)
  return null
}

export default function StaffConsultationsPage() {
  const notify = useNotify()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selected, setSelected] = useState<Consultation | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      const res = await fetch(`/api/admin/consultations?${params}`, { cache: "no-store" })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || `HTTP ${res.status} — could not load consultations`)
        return
      }
      const json = (await res.json()) as ApiResponse
      setData(json)
    } catch (err) {
      console.error("Consultations fetch failed:", err)
      setError("Network error. Check your connection and retry.")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAction = async () => {
    if (!selected || !newStatus) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/consultations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: selected.id,
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
        await fetch("/api/admin/consultations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultationId: selected.id,
            action: "add_notes",
            notes: adminNote.trim(),
          }),
        })
      }
      notify.success("Updated", `Consultation marked as ${newStatus}.`)
      setActionOpen(false)
      setSelected(null)
      setNewStatus("")
      setAdminNote("")
      fetchData()
    } catch (err) {
      console.error("Consultation action failed:", err)
      notify.error("Network error", "Could not update the consultation.")
    } finally {
      setSubmitting(false)
    }
  }

  const consultations = data?.consultations ?? []
  const filtered = consultations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      displayName(c).toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      displayConcerns(c).join(" ").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Consultations
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Confirm and follow up on skincare consultations.
        </p>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-[#7B2D8E] mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Could not load consultations</p>
            <p className="text-xs text-gray-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="text-xs font-semibold text-[#7B2D8E] hover:underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {["pending", "confirmed", "completed", "cancelled"].map((s) => {
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
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      <Card className="border-gray-100 rounded-2xl">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, email, concerns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 border-gray-200 focus-visible:ring-[#7B2D8E]/30"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-100 rounded-2xl">
        <CardHeader className="border-b border-gray-100 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-4 w-4 text-[#7B2D8E]" />
            Consultations
          </CardTitle>
          <CardDescription className="text-xs">
            {filtered.length} {filtered.length === 1 ? "consultation" : "consultations"}
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
                <Calendar className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-900">No consultations</p>
              <p className="mt-1 text-xs text-gray-500">
                {error ? "Retry above when ready." : "New consultations will appear here."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((c) => {
                const cfg = statusConfig[c.status] || statusConfig.pending
                const concerns = displayConcerns(c)
                const when = displayWhen(c)
                return (
                  <li
                    key={c.id}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[#7B2D8E]/[0.03] sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{displayName(c)}</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
                            cfg.cls,
                          )}
                        >
                          <cfg.Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                        {c.location && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-700 ring-1 ring-gray-200 px-2 py-0.5 text-[10px] font-semibold capitalize">
                            <MapPin className="h-2.5 w-2.5" />
                            {c.location}
                          </span>
                        )}
                      </div>
                      {concerns.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {concerns.slice(0, 3).map((concern, i) => (
                            <span
                              key={i}
                              className="inline-block rounded-full bg-[#7B2D8E]/8 text-[#7B2D8E] px-2 py-0.5 text-[10.5px] font-medium capitalize"
                            >
                              {concern}
                            </span>
                          ))}
                          {concerns.length > 3 && (
                            <span className="text-[10.5px] text-gray-500">
                              +{concerns.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </span>
                        {c.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                        )}
                        {when && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#7B2D8E]">
                            <Calendar className="h-3 w-3" />
                            {when}
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-gray-400">
                        Submitted {formatDate(c.created_at)}
                      </p>
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
                      {c.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelected(c)
                            setActionOpen(true)
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

      {/* View dialog */}
      <Dialog open={!!selected && !actionOpen} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Consultation details</DialogTitle>
            <DialogDescription>Full submission and metadata</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{displayName(selected)}</p>
                  <p className="text-xs text-gray-500">{selected.email}</p>
                  {selected.phone && <p className="text-xs text-gray-500">{selected.phone}</p>}
                </div>
              </div>

              {displayWhen(selected) && (
                <div>
                  <Label className="text-xs text-gray-500">Preferred slot</Label>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#7B2D8E]">
                    <Calendar className="h-3.5 w-3.5" />
                    {displayWhen(selected)}
                  </p>
                </div>
              )}

              {selected.location && (
                <div>
                  <Label className="text-xs text-gray-500">Location</Label>
                  <p className="text-sm capitalize">{selected.location}</p>
                </div>
              )}

              {displayConcerns(selected).length > 0 && (
                <div>
                  <Label className="text-xs text-gray-500">Concerns</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {displayConcerns(selected).map((c, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2.5 py-1 text-xs font-medium capitalize"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.message && (
                <div>
                  <Label className="text-xs text-gray-500">Message</Label>
                  <p className="mt-1 rounded-md bg-gray-50 p-3 text-sm">{selected.message}</p>
                </div>
              )}

              {(selected.admin_notes || selected.notes) && (
                <div>
                  <Label className="text-xs text-gray-500">Internal notes</Label>
                  <p className="mt-1 rounded-md bg-[#7B2D8E]/5 p-3 text-sm">
                    {selected.admin_notes || selected.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selected?.status === "pending" && (
              <Button
                onClick={() => setActionOpen(true)}
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A]"
              >
                Take action
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update consultation</DialogTitle>
            <DialogDescription>
              Confirm, complete or cancel the booking. The customer will be notified.
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
                  <SelectItem value="confirmed">Confirm appointment</SelectItem>
                  <SelectItem value="completed">Mark as completed</SelectItem>
                  <SelectItem value="cancelled">Cancel appointment</SelectItem>
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
            <Button variant="outline" onClick={() => setActionOpen(false)}>
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
