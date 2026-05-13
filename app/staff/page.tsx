"use client"

/**
 * Staff › Front Desk
 *
 * The operational control room for the spa's front desk. Built to be
 * used by a receptionist with a customer standing in front of them —
 * every section answers a real operational question and avoids
 * decoration.
 *
 * Sections (top to bottom):
 *   1. Upcoming in 30 Minutes — pinned. Next 3 starts.
 *   2. Quick Actions          — Check-In / Walk-in / Lookup / No-Show.
 *   3. Today's Schedule       — timeline with inline status updates.
 *   4. Live Room & Therapist Status — real-time grid.
 *   5. Pending Payments       — clients who haven't paid.
 *   6. Notifications          — recent events.
 *
 * Design rules (strictly enforced):
 *   * Only brand purple (#7B2D8E), white, neutral grays.
 *   * Professional Lucide icons. No sparkles / zaps / lightning.
 *   * Flat surfaces, hairline borders, no glows, no gradient overlays.
 *   * Mobile-first; the same layout scales to tablet/desktop with
 *     responsive grid breakpoints.
 *   * Information-dense but every cell earns its place.
 *
 * Data lives behind /api/staff/front-desk and the page polls every
 * 15 seconds in the background so it always feels current without
 * spinning skeletons.
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Clock,
  UserCheck,
  UserPlus,
  Search,
  UserX,
  Calendar,
  CreditCard,
  Bell,
  AlertCircle,
  CheckCircle2,
  DoorOpen,
  DoorClosed,
  User,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Users,
} from "lucide-react"
import { useNotify } from "@/components/shared/notify"
import { cn } from "@/lib/utils"

// ---- Types -----------------------------------------------------------------

interface Booking {
  id: string
  booking_reference: string
  appointment_date: string
  appointment_time: string
  total_duration: number
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  location_name: string
  status: string
  payment_status: string
  total_price_kobo: number
  assigned_staff_id: string | null
  assigned_staff_name: string | null
  services_summary: string | null
  primary_category: string | null
  minutesUntil?: number
}

interface RoomTile {
  id: string
  label: string
  location: string
  occupied: boolean
  occupied_until: string | null
  current_customer: string | null
  current_therapist: string | null
}

interface TherapistTile {
  id: string
  name: string
  avatar_url: string | null
  current_booking_id: string | null
  current_customer: string | null
  current_service: string | null
  next_booking_time: string | null
  next_booking_customer: string | null
}

interface NotifItem {
  id: string
  kind: "arrival" | "soon" | "new_booking" | "no_show" | "cancelled"
  title: string
  body: string
  created_at: string
}

interface DashboardData {
  success: boolean
  me: { id: string; firstName: string; lastName: string; role: string }
  upcomingSoon: Booking[]
  todaySchedule: Booking[]
  pendingPayments: Booking[]
  rooms: RoomTile[]
  therapists: TherapistTile[]
  notifications: NotifItem[]
  stats: {
    todayBookings: number
    todayCompleted: number
    todayCheckedIn: number
    todayNoShow: number
    pendingPaymentCount: number
    therapistsBusy: number
    therapistsAvailable: number
    roomsOccupied: number
    roomsTotal: number
  }
  todayRevenue: number
  generatedAt: string
}

// ---- Helpers ---------------------------------------------------------------

const PURPLE = "#7B2D8E"

const naira = (kobo: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100)

const formatTime = (hhmm: string) => {
  // "14:30" -> "2:30 PM"
  if (!hhmm) return ""
  const [hStr, mStr] = hhmm.split(":")
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

const formatRelative = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric" })
}

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Map a booking status to the brand-aligned pill style. Saturation
// tracks urgency — pending soft, in-progress solid purple, completed
// neutral grey, no-show muted gray.
const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-[#7B2D8E]/8 text-[#7B2D8E] ring-[#7B2D8E]/20" },
  confirmed: { label: "Confirmed", cls: "bg-white text-[#7B2D8E] ring-[#7B2D8E]/40" },
  checked_in: { label: "Checked-in", cls: "bg-[#7B2D8E]/15 text-[#5A1D6A] ring-[#7B2D8E]/30" },
  in_progress: { label: "In progress", cls: "bg-[#7B2D8E] text-white ring-[#7B2D8E]" },
  completed: { label: "Completed", cls: "bg-gray-100 text-gray-700 ring-gray-200" },
  no_show: { label: "No-show", cls: "bg-gray-200 text-gray-700 ring-gray-300" },
  cancelled: { label: "Cancelled", cls: "bg-gray-100 text-gray-500 ring-gray-200" },
}

const PAYMENT_PILL: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20" },
  unpaid: { label: "Unpaid", cls: "bg-gray-100 text-gray-700 ring-gray-200" },
  refunded: { label: "Refunded", cls: "bg-gray-100 text-gray-500 ring-gray-200" },
  failed: { label: "Failed", cls: "bg-gray-100 text-gray-700 ring-gray-200" },
}

const NEXT_STATUS: Record<string, string[]> = {
  // What an operator can move a booking to from each state. We keep
  // this narrow so the timeline UI exposes only the next sensible
  // step, not every possibility.
  pending: ["confirmed", "checked_in", "cancelled"],
  confirmed: ["checked_in", "in_progress", "no_show", "cancelled"],
  checked_in: ["in_progress", "completed", "no_show"],
  in_progress: ["completed"],
  completed: [],
  no_show: ["checked_in"],
  cancelled: [],
}

// ---- Page ------------------------------------------------------------------

export default function StaffFrontDeskPage() {
  const notify = useNotify()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [now, setNow] = useState(Date.now())

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setError(null)
      try {
        const res = await fetch("/api/staff/front-desk", { cache: "no-store" })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          if (!silent) {
            setError(json.error || `Could not load dashboard (HTTP ${res.status})`)
          }
          return
        }
        const json = (await res.json()) as DashboardData
        setData(json)
        setError(null)
      } catch (err) {
        console.error("Front desk fetch failed:", err)
        if (!silent) setError("Network error. Check your connection and retry.")
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchData()
    // Poll every 15s so the dashboard feels live.
    const t = window.setInterval(() => fetchData(true), 15_000)
    // Re-tick "minutes until" every 30s so the upcoming row stays accurate.
    const c = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => {
      window.clearInterval(t)
      window.clearInterval(c)
    }
  }, [fetchData])

  const updateStatus = useCallback(
    async (bookingId: string, status: string) => {
      setUpdatingBookingId(bookingId)
      try {
        const res = await fetch("/api/staff/front-desk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, status }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          notify.error("Update failed", json.error || "Try again in a moment.")
          return
        }
        notify.success("Status updated", `Booking moved to ${status.replace("_", " ")}.`)
        // Optimistic local update — patch the row so the UI doesn't
        // hang waiting for the next poll.
        setData((prev) => {
          if (!prev) return prev
          const patch = (b: Booking): Booking =>
            b.id === bookingId ? { ...b, status } : b
          return {
            ...prev,
            todaySchedule: prev.todaySchedule.map(patch),
            upcomingSoon: prev.upcomingSoon.map(patch),
            pendingPayments: prev.pendingPayments.map(patch),
          }
        })
        // Background refetch for accuracy.
        fetchData(true)
      } catch (err) {
        console.error("Status update failed:", err)
        notify.error("Network error", "Could not update the booking.")
      } finally {
        setUpdatingBookingId(null)
      }
    },
    [notify, fetchData],
  )

  const markPaid = useCallback(
    async (bookingId: string) => {
      setUpdatingBookingId(bookingId)
      try {
        const res = await fetch("/api/staff/front-desk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, payment_status: "paid" }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          notify.error("Could not record payment", json.error || "Try again.")
          return
        }
        notify.success("Payment recorded", "Booking marked as paid.")
        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            pendingPayments: prev.pendingPayments.filter((b) => b.id !== bookingId),
            todaySchedule: prev.todaySchedule.map((b) =>
              b.id === bookingId ? { ...b, payment_status: "paid" } : b,
            ),
          }
        })
        fetchData(true)
      } catch (err) {
        console.error("Mark paid failed:", err)
        notify.error("Network error", "Could not record the payment.")
      } finally {
        setUpdatingBookingId(null)
      }
    },
    [notify, fetchData],
  )

  // Schedule grouped by hour slot for the timeline section. We use a
  // useMemo so the grouping only runs when the underlying list
  // changes; expensive cell renders in the inner list memoise
  // automatically via React.
  const groupedSchedule = useMemo(() => {
    const rows = data?.todaySchedule || []
    const filtered =
      statusFilter === "all"
        ? rows
        : rows.filter((r) => r.status === statusFilter)
    const groups = new Map<string, Booking[]>()
    for (const b of filtered) {
      // Group by the hour: "14:30" -> "14:00"
      const slot = `${b.appointment_time.slice(0, 2)}:00`
      if (!groups.has(slot)) groups.set(slot, [])
      groups.get(slot)!.push(b)
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    )
  }, [data?.todaySchedule, statusFilter])

  // Recalculate "minutes until" client-side for the upcoming row so
  // the countdown stays accurate between API polls.
  const upcomingSoon = useMemo(() => {
    if (!data?.upcomingSoon) return []
    return data.upcomingSoon.map((b) => {
      const [yyyy, mm, dd] = b.appointment_date.split("-").map(Number)
      const [hh, mi] = b.appointment_time.split(":").map(Number)
      const apptUTC = Date.UTC(yyyy, mm - 1, dd, hh, mi) - 60 * 60_000 // WAT
      const minutesUntil = Math.round((apptUTC - now) / 60_000)
      return { ...b, minutesUntil }
    })
  }, [data?.upcomingSoon, now])

  // ---- Render --------------------------------------------------------------

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-2xl border border-gray-100 bg-white" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-gray-100 bg-white" />
          ))}
        </div>
        <div className="h-64 rounded-2xl border border-gray-100 bg-white" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="mt-3 text-base font-semibold text-gray-900">Dashboard unavailable</p>
        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => fetchData()}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#7B2D8E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A1D6A]"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Inline error banner — surfaces if a polled refresh failed but
          we still have last-known data. */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
          <AlertCircle className="h-3.5 w-3.5 text-[#7B2D8E]" aria-hidden />
          <span>{error}</span>
          <button
            onClick={() => fetchData()}
            className="ml-auto font-semibold text-[#7B2D8E] hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Upcoming in 30 Minutes — pinned at the top, always visible. */}
      <UpcomingSoonRow
        bookings={upcomingSoon}
        onUpdate={updateStatus}
        updatingId={updatingBookingId}
      />

      {/* 2. Quick Actions bar */}
      <QuickActions todayStats={data.stats} />

      {/* Stats strip — gives the operator the numbers they need to
          answer "how's the day going?" without opening any sub-page. */}
      <StatsStrip stats={data.stats} todayRevenue={data.todayRevenue} />

      {/* 3. Today's Schedule */}
      <ScheduleSection
        grouped={groupedSchedule}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        onUpdateStatus={updateStatus}
        updatingId={updatingBookingId}
        total={data.todaySchedule.length}
      />

      {/* 4 + 5 + 6 row */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Live status — spans 2 cols at lg+ */}
        <div className="lg:col-span-2 space-y-3">
          <LiveStatusGrid rooms={data.rooms} therapists={data.therapists} />
          <PendingPayments
            bookings={data.pendingPayments}
            onMarkPaid={markPaid}
            updatingId={updatingBookingId}
          />
        </div>

        {/* Notifications panel — sticky on the right */}
        <NotificationsPanel items={data.notifications} />
      </div>
    </div>
  )
}

// ---- Section: Upcoming Soon ------------------------------------------------

function UpcomingSoonRow({
  bookings,
  onUpdate,
  updatingId,
}: {
  bookings: Booking[]
  onUpdate: (id: string, status: string) => void
  updatingId: string | null
}) {
  return (
    <section
      className="rounded-2xl border border-[#7B2D8E]/30 bg-white overflow-hidden"
      aria-label="Upcoming in the next 30 minutes"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[#7B2D8E]/15 bg-[#7B2D8E]/5 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E] text-white flex-shrink-0">
            <Clock className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              Upcoming in 30 min
            </p>
            <p className="text-[11px] text-gray-600 hidden sm:block">
              Next clients about to arrive
            </p>
          </div>
        </div>
        <span className="text-[10.5px] font-semibold text-[#7B2D8E] tabular-nums">
          {bookings.length} / 3
        </span>
      </header>

      {bookings.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium text-gray-700">No appointments in the next 30 minutes</p>
          <p className="text-xs text-gray-500 mt-0.5">Take a breath. New arrivals will show up here automatically.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {bookings.map((b) => (
            <UpcomingRow
              key={b.id}
              booking={b}
              onUpdate={onUpdate}
              isUpdating={updatingId === b.id}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function UpcomingRow({
  booking,
  onUpdate,
  isUpdating,
}: {
  booking: Booking
  onUpdate: (id: string, status: string) => void
  isUpdating: boolean
}) {
  const minutesUntil = booking.minutesUntil ?? 0
  const isLate = minutesUntil < 0
  const isImminent = minutesUntil >= 0 && minutesUntil <= 5

  // Countdown styling — solid purple if starting in <= 5 min, hairline
  // ring otherwise. Negative (started, not checked in) shows in muted
  // tone with a red-tinted ring inside the brand budget (we re-use
  // the gray-700 text + purple ring for emphasis).
  const countdownCls = isLate
    ? "bg-gray-900 text-white ring-gray-900"
    : isImminent
      ? "bg-[#7B2D8E] text-white ring-[#7B2D8E]"
      : "bg-white text-[#7B2D8E] ring-[#7B2D8E]/40"

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Countdown */}
      <div className="flex items-center gap-3 sm:w-32 flex-shrink-0">
        <span
          className={cn(
            "inline-flex flex-col items-center justify-center h-12 w-12 rounded-xl ring-1 flex-shrink-0",
            countdownCls,
          )}
        >
          <span className="text-base font-bold tabular-nums leading-none">
            {isLate ? `${Math.abs(minutesUntil)}` : minutesUntil}
          </span>
          <span className="text-[8.5px] font-semibold uppercase tracking-wider leading-none mt-0.5">
            {isLate ? "late" : "min"}
          </span>
        </span>
        <div className="sm:hidden">
          <p className="text-sm font-semibold text-gray-900">{booking.customer_name}</p>
          <p className="text-[11px] text-gray-500">{formatTime(booking.appointment_time)}</p>
        </div>
      </div>

      {/* Customer + service */}
      <div className="hidden sm:block min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{booking.customer_name}</p>
        <p className="text-[11.5px] text-gray-500 truncate">
          {booking.services_summary || "Service"}
          {booking.assigned_staff_name && ` · ${booking.assigned_staff_name}`}
        </p>
      </div>

      {/* Time + room */}
      <div className="hidden md:flex items-center gap-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTime(booking.appointment_time)}
        </span>
        <span className="inline-flex items-center gap-1">
          <DoorOpen className="h-3 w-3" />
          {booking.primary_category || "Room"}
        </span>
      </div>

      {/* Mobile metadata strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 sm:hidden">
        <span className="truncate">{booking.services_summary || "Service"}</span>
        {booking.assigned_staff_name && (
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {booking.assigned_staff_name}
          </span>
        )}
      </div>

      {/* Check-in action */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {booking.status === "checked_in" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20 px-2.5 py-1 text-[11px] font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Checked-in
          </span>
        ) : (
          <button
            onClick={() => onUpdate(booking.id, "checked_in")}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white px-3 py-1.5 text-[11.5px] font-semibold disabled:opacity-50"
          >
            <UserCheck className="h-3 w-3" />
            Check in
          </button>
        )}
      </div>
    </li>
  )
}

// ---- Section: Quick Actions ------------------------------------------------

function QuickActions({
  todayStats,
}: {
  todayStats: DashboardData["stats"]
}) {
  const actions: Array<{
    icon: typeof UserCheck
    label: string
    sublabel: string
    href: string
  }> = [
    {
      icon: UserCheck,
      label: "Check in",
      sublabel: `${todayStats.todayCheckedIn} today`,
      href: "/staff/appointments",
    },
    {
      icon: UserPlus,
      label: "New walk-in",
      sublabel: "Quick booking",
      href: "/book",
    },
    {
      icon: Search,
      label: "Client lookup",
      sublabel: "Find a customer",
      href: "/staff/clients",
    },
    {
      icon: UserX,
      label: "Mark no-show",
      sublabel: `${todayStats.todayNoShow} today`,
      href: "/staff/appointments",
    },
  ]

  return (
    <section aria-label="Quick actions">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="group flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-3 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/[0.03] transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0 group-hover:bg-[#7B2D8E] group-hover:text-white transition-colors">
              <a.icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">
                {a.label}
              </p>
              <p className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">
                {a.sublabel}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ---- Section: Stats Strip --------------------------------------------------

function StatsStrip({
  stats,
  todayRevenue,
}: {
  stats: DashboardData["stats"]
  todayRevenue: number
}) {
  const cells: Array<{ label: string; value: string; sublabel?: string }> = [
    {
      label: "Today",
      value: String(stats.todayBookings),
      sublabel: "Bookings",
    },
    {
      label: "Completed",
      value: String(stats.todayCompleted),
      sublabel: `${stats.todayCheckedIn} active`,
    },
    {
      label: "Revenue",
      value: naira(todayRevenue * 100),
      sublabel: "Today",
    },
    {
      label: "Therapists",
      value: `${stats.therapistsBusy}/${stats.therapistsBusy + stats.therapistsAvailable}`,
      sublabel: "Busy",
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-gray-100 bg-white px-3 py-2.5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            {c.label}
          </p>
          <p className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums leading-tight">
            {c.value}
          </p>
          {c.sublabel && (
            <p className="text-[10.5px] text-gray-500 leading-tight">{c.sublabel}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ---- Section: Today's Schedule ---------------------------------------------

const STATUS_FILTERS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "checked_in", label: "Checked-in" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "no_show", label: "No-show" },
]

function ScheduleSection({
  grouped,
  statusFilter,
  onFilterChange,
  onUpdateStatus,
  updatingId,
  total,
}: {
  grouped: Array<[string, Booking[]]>
  statusFilter: string
  onFilterChange: (v: string) => void
  onUpdateStatus: (id: string, status: string) => void
  updatingId: string | null
  total: number
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Today&apos;s schedule</p>
            <p className="text-[11px] text-gray-500 leading-tight">
              {total} {total === 1 ? "booking" : "bookings"} on the books
            </p>
          </div>
        </div>
        {/* Filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0" role="tablist">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap flex-shrink-0",
                statusFilter === f.id
                  ? "bg-[#7B2D8E] text-white"
                  : "bg-gray-50 text-gray-600 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {grouped.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
            <Calendar className="h-4 w-4" />
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-900">No appointments to show</p>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            {total === 0
              ? "Today's day sheet is clear. Walk-ins will show up here automatically."
              : "No bookings match the current filter."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {grouped.map(([slot, bookings]) => (
            <div key={slot} className="px-3 sm:px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#7B2D8E] tabular-nums">
                  {formatTime(slot)}
                </span>
                <span className="h-px bg-gray-100 flex-1" aria-hidden />
                <span className="text-[10.5px] text-gray-400 tabular-nums">
                  {bookings.length}
                </span>
              </div>
              <div className="grid gap-2">
                {bookings.map((b) => (
                  <ScheduleCard
                    key={b.id}
                    booking={b}
                    onUpdateStatus={onUpdateStatus}
                    isUpdating={updatingId === b.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ScheduleCard({
  booking,
  onUpdateStatus,
  isUpdating,
}: {
  booking: Booking
  onUpdateStatus: (id: string, status: string) => void
  isUpdating: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status = STATUS_PILL[booking.status] || STATUS_PILL.pending
  const payment = PAYMENT_PILL[booking.payment_status] || PAYMENT_PILL.unpaid
  const transitions = NEXT_STATUS[booking.status] || []

  return (
    <div className="relative rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 transition-colors px-3 py-2.5 grid grid-cols-[auto_1fr_auto] gap-3 items-center">
      {/* Time + initials */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[11px] font-bold uppercase text-[#7B2D8E] flex-shrink-0">
          {initials(booking.customer_name)}
        </span>
      </div>

      {/* Body */}
      <Link
        href={`/staff/appointments/${booking.id}`}
        className="min-w-0 block hover:text-[#7B2D8E]"
      >
        <p className="text-sm font-semibold text-gray-900 truncate">
          {booking.customer_name}
        </p>
        <p className="text-[11.5px] text-gray-500 truncate">
          {booking.services_summary || "Service"}
          {booking.total_duration > 0 && ` · ${booking.total_duration}m`}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatTime(booking.appointment_time)}
          </span>
          {booking.assigned_staff_name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              {booking.assigned_staff_name}
            </span>
          )}
          {booking.primary_category && (
            <span className="inline-flex items-center gap-1">
              <DoorOpen className="h-2.5 w-2.5" />
              {booking.primary_category}
            </span>
          )}
          <span className="font-mono">{booking.booking_reference}</span>
        </div>
      </Link>

      {/* Status + payment pills */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <button
          onClick={() => transitions.length > 0 && setMenuOpen((v) => !v)}
          disabled={isUpdating || transitions.length === 0}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 uppercase tracking-wider transition-opacity",
            status.cls,
            transitions.length > 0 && !isUpdating
              ? "cursor-pointer hover:opacity-80"
              : "cursor-default",
          )}
          aria-haspopup={transitions.length > 0 ? "menu" : undefined}
          aria-expanded={menuOpen}
        >
          {isUpdating ? (
            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
          ) : null}
          {status.label}
          {transitions.length > 0 && !isUpdating && (
            <ChevronRight className="h-2.5 w-2.5" />
          )}
        </button>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold ring-1 uppercase tracking-wider",
            payment.cls,
          )}
        >
          {payment.label}
        </span>
      </div>

      {/* Status transition popover */}
      {menuOpen && transitions.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute right-3 top-12 z-40 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-sm">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Update status
            </p>
            {transitions.map((next) => (
              <button
                key={next}
                onClick={() => {
                  setMenuOpen(false)
                  onUpdateStatus(booking.id, next)
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[12.5px] text-gray-700 hover:bg-[#7B2D8E]/5 hover:text-[#7B2D8E]"
              >
                <span className="capitalize">{next.replace("_", " ")}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---- Section: Live Status (rooms + therapists) -----------------------------

function LiveStatusGrid({
  rooms,
  therapists,
}: {
  rooms: RoomTile[]
  therapists: TherapistTile[]
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
            <Users className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Live status</p>
            <p className="text-[11px] text-gray-500 leading-tight">Rooms and therapists, right now</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-2 py-0.5 text-[10px] font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7B2D8E] animate-pulse" aria-hidden />
          Live
        </span>
      </header>

      {/* Rooms */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Rooms ({rooms.filter((r) => r.occupied).length}/{rooms.length} occupied)
        </p>
        {rooms.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">No rooms scheduled today.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rooms.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "rounded-lg border px-2.5 py-2",
                  r.occupied
                    ? "border-[#7B2D8E]/30 bg-[#7B2D8E]/[0.04]"
                    : "border-gray-100 bg-white",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-gray-900 truncate">
                    {r.label}
                  </span>
                  {r.occupied ? (
                    <DoorClosed className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" />
                  ) : (
                    <DoorOpen className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{r.location}</p>
                {r.occupied && r.current_customer ? (
                  <>
                    <p className="text-[10.5px] text-gray-700 truncate mt-1">
                      {r.current_customer}
                    </p>
                    {r.occupied_until && (
                      <p className="text-[10px] text-[#7B2D8E] mt-0.5 font-semibold">
                        Until {formatTime(r.occupied_until)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[10.5px] text-gray-400 mt-1">Available</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-gray-100 mx-4" aria-hidden />

      {/* Therapists */}
      <div className="px-4 pt-3 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Therapists ({therapists.filter((t) => !t.current_booking_id).length}/{therapists.length} available)
        </p>
        {therapists.length === 0 ? (
          <p className="text-xs text-gray-500 py-2">No therapists on roster.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {therapists.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-2.5 py-2 hover:border-gray-200"
              >
                <span className="relative flex-shrink-0">
                  {t.avatar_url ? (
                    // Real avatar image — shows the therapist's profile photo
                    // with the initials as fallback in case the image fails
                    <img
                      src={t.avatar_url}
                      alt={t.name}
                      className="h-8 w-8 rounded-full object-cover bg-[#7B2D8E]/10"
                      onError={(e) => {
                        // Fallback to initials if image load fails
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const next = target.nextElementSibling as HTMLElement | null
                        if (next) next.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[11px] font-bold uppercase text-[#7B2D8E]",
                      t.avatar_url ? "hidden" : "flex",
                    )}
                  >
                    {initials(t.name)}
                  </span>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white",
                      t.current_booking_id ? "bg-[#7B2D8E]" : "bg-gray-400",
                    )}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-gray-900 truncate">
                    {t.name}
                  </p>
                  {t.current_booking_id ? (
                    <p className="text-[10.5px] text-[#7B2D8E] truncate">
                      With {t.current_customer}
                      {t.current_service ? ` · ${t.current_service}` : ""}
                    </p>
                  ) : t.next_booking_time ? (
                    <p className="text-[10.5px] text-gray-500 truncate">
                      Next: {formatTime(t.next_booking_time)} · {t.next_booking_customer}
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-gray-400 truncate">Available</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// ---- Section: Pending Payments --------------------------------------------

function PendingPayments({
  bookings,
  onMarkPaid,
  updatingId,
}: {
  bookings: Booking[]
  onMarkPaid: (id: string) => void
  updatingId: string | null
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
            <CreditCard className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Pending payments</p>
            <p className="text-[11px] text-gray-500 leading-tight">
              Clients who finished but haven&apos;t paid
            </p>
          </div>
        </div>
        <span className="text-[10.5px] font-semibold text-[#7B2D8E] tabular-nums">
          {bookings.length}
        </span>
      </header>

      {bookings.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <div className="mx-auto h-9 w-9 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900">All clear</p>
          <p className="mt-0.5 text-[11.5px] text-gray-500">Every client is paid up.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[10.5px] font-bold uppercase text-[#7B2D8E] flex-shrink-0">
                {initials(b.customer_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-gray-900 truncate">
                  {b.customer_name}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {b.services_summary || "Service"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[13px] font-bold text-[#7B2D8E] tabular-nums">
                  {naira(b.total_price_kobo)}
                </p>
                <button
                  onClick={() => onMarkPaid(b.id)}
                  disabled={updatingId === b.id}
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white px-2.5 py-1 text-[10.5px] font-semibold disabled:opacity-50"
                >
                  {updatingId === b.id ? (
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <CreditCard className="h-2.5 w-2.5" />
                  )}
                  Pay now
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---- Section: Notifications ------------------------------------------------

function NotificationsPanel({ items }: { items: NotifItem[] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden h-fit lg:sticky lg:top-4">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
            <Bell className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">Notifications</p>
            <p className="text-[11px] text-gray-500 leading-tight">Live activity feed</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
          {items.length}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-gray-700">All quiet</p>
          <p className="mt-0.5 text-[11.5px] text-gray-500">
            Alerts will show up here as the day unfolds.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
          {items.map((n) => (
            <li key={n.id} className="px-4 py-2.5">
              <div className="flex items-start gap-2.5">
                <NotifIcon kind={n.kind} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-gray-900 truncate">
                    {n.title}
                  </p>
                  <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug">
                    {n.body}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatRelative(n.created_at)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NotifIcon({ kind }: { kind: NotifItem["kind"] }) {
  const map: Record<
    NotifItem["kind"],
    { Icon: typeof Clock; cls: string }
  > = {
    arrival: { Icon: UserCheck, cls: "bg-[#7B2D8E]/10 text-[#7B2D8E]" },
    soon: { Icon: Clock, cls: "bg-[#7B2D8E] text-white" },
    new_booking: { Icon: Calendar, cls: "bg-[#7B2D8E]/10 text-[#7B2D8E]" },
    no_show: { Icon: UserX, cls: "bg-gray-200 text-gray-700" },
    cancelled: { Icon: AlertCircle, cls: "bg-gray-100 text-gray-600" },
  }
  const { Icon, cls } = map[kind]
  return (
    <span
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0",
        cls,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
    </span>
  )
}
