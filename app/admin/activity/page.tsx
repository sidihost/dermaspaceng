"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Activity,
  Search,
  Filter,
  User,
  Gift,
  MessageSquare,
  Calendar,
  FileText,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  ShieldAlert,
  LogIn,
  LogOut,
  Globe,
  Smartphone,
  Monitor,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityItem {
  id: string
  actor_id: string
  actor_name: string
  actor_role: string
  action: string
  action_raw?: string
  entity_type: string
  entity_id: string
  details: string
  created_at: string
}

interface LoginItem {
  id: number
  eventType: string
  userId: string | null
  userName: string
  userEmail: string | null
  userRole: string | null
  ipAddress: string | null
  userAgent: string | null
  eventData: Record<string, unknown>
  createdAt: string
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <UserPlus className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
  reply: <MessageSquare className="h-4 w-4" />,
  status_change: <RefreshCw className="h-4 w-4" />,
}

const entityIcons: Record<string, React.ReactNode> = {
  user: <User className="h-4 w-4" />,
  gift_card: <Gift className="h-4 w-4" />,
  complaint: <MessageSquare className="h-4 w-4" />,
  consultation: <Calendar className="h-4 w-4" />,
  survey: <FileText className="h-4 w-4" />,
}

const actionColors: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 border-emerald-200",
  update: "bg-sky-50 text-sky-700 border-sky-200",
  delete: "bg-gray-100 text-gray-600 border-gray-200",
  view: "bg-gray-50 text-gray-600 border-gray-200",
  reply: "bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20",
  status_change: "bg-amber-50 text-amber-700 border-amber-200",
}

// Brand-aligned palette for login event types. Successful sign-ins
// are the primary brand purple; failed attempts are a calm rose
// (not alarmist red); signups are emerald to read as a "green light"
// growth signal.
const loginEventColors: Record<string, string> = {
  signin: "bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20",
  signin_failed: "bg-rose-50 text-rose-700 border-rose-200",
  signup: "bg-emerald-50 text-emerald-700 border-emerald-200",
  logout: "bg-gray-100 text-gray-600 border-gray-200",
  password_change: "bg-amber-50 text-amber-700 border-amber-200",
  password_reset_requested: "bg-amber-50 text-amber-700 border-amber-200",
  role_change: "bg-sky-50 text-sky-700 border-sky-200",
  "2fa_enabled": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "2fa_disabled": "bg-rose-50 text-rose-700 border-rose-200",
}

const loginEventIcons: Record<string, React.ReactNode> = {
  signin: <LogIn className="h-4 w-4" />,
  signin_failed: <ShieldAlert className="h-4 w-4" />,
  signup: <UserPlus className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  password_change: <KeyRound className="h-4 w-4" />,
  password_reset_requested: <KeyRound className="h-4 w-4" />,
  role_change: <ShieldCheck className="h-4 w-4" />,
  "2fa_enabled": <ShieldCheck className="h-4 w-4" />,
  "2fa_disabled": <ShieldAlert className="h-4 w-4" />,
}

function deviceFromUA(ua: string | null): { label: string; Icon: typeof Monitor } {
  if (!ua) return { label: "Unknown", Icon: Globe }
  const lower = ua.toLowerCase()
  if (/iphone|android|mobile/.test(lower)) return { label: "Mobile", Icon: Smartphone }
  if (/ipad|tablet/.test(lower)) return { label: "Tablet", Icon: Smartphone }
  return { label: "Desktop", Icon: Monitor }
}

function formatRelative(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ActivityLogPage() {
  const [tab, setTab] = useState<"actions" | "logins">("actions")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Activity Log
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track every action across the platform and every authentication event.
          </p>
        </div>
      </div>

      {/* Tab pills — same vocabulary as the staff console for consistency. */}
      <div className="flex items-center gap-2" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "actions"}
          onClick={() => setTab("actions")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors",
            tab === "actions"
              ? "bg-[#7B2D8E] text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]",
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          Staff actions
        </button>
        <button
          role="tab"
          aria-selected={tab === "logins"}
          onClick={() => setTab("logins")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors",
            tab === "logins"
              ? "bg-[#7B2D8E] text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E]",
          )}
        >
          <LogIn className="h-3.5 w-3.5" />
          Login activity
        </button>
      </div>

      {tab === "actions" ? <ActionsPanel /> : <LoginsPanel />}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Actions panel — staff/admin actions across bookings, complaints, etc.
// ────────────────────────────────────────────────────────────────────

function ActionsPanel() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [filterEntity, setFilterEntity] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterAction, filterEntity])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(filterAction !== "all" && { action: filterAction }),
        ...(filterEntity !== "all" && { entity_type: filterEntity }),
      })
      const res = await fetch(`/api/admin/activity?${params}`)
      const data = await res.json()
      if (res.ok) {
        setActivities(data.activities || [])
        setTotalPages(data.pagination?.totalPages || data.totalPages || 1)
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter((a) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      a.actor_name?.toLowerCase().includes(s) ||
      a.action?.toLowerCase().includes(s) ||
      a.action_raw?.toLowerCase().includes(s) ||
      a.entity_type?.toLowerCase().includes(s) ||
      a.details?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchActivities} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="reply">Reply</SelectItem>
                  <SelectItem value="status_change">Status change</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="booking">Bookings</SelectItem>
                  <SelectItem value="gift_card">Gift cards</SelectItem>
                  <SelectItem value="complaint">Complaints</SelectItem>
                  <SelectItem value="consultation">Consultations</SelectItem>
                  <SelectItem value="survey">Surveys</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-[#7B2D8E]" />
            Recent activity
          </CardTitle>
          <CardDescription>
            Showing {filteredActivities.length}{" "}
            {filteredActivities.length === 1 ? "entry" : "entries"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                No activity yet
              </p>
              <p className="text-sm text-muted-foreground/70">
                Actions will appear here as staff use the platform.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {filteredActivities.map((a, idx) => (
                <li
                  key={a.id}
                  className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border",
                        actionColors[a.action] ||
                          "bg-gray-100 text-gray-600 border-gray-200",
                      )}
                    >
                      {actionIcons[a.action] || <Activity className="h-4 w-4" />}
                    </div>
                    {idx < filteredActivities.length - 1 && (
                      <div className="absolute top-10 h-full w-px bg-border/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {a.actor_name || "System"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {a.actor_role || "system"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {formatLabel(a.action_raw || a.action)}
                      </span>{" "}
                      <span className="inline-flex items-center gap-1">
                        {entityIcons[a.entity_type]}
                        {formatLabel(a.entity_type)}
                      </span>
                    </p>
                    {a.details && (
                      <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                        {a.details}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-sm text-muted-foreground">
                      {formatRelative(a.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Logins panel — pulls from the tamper-evident auth audit chain.
// ────────────────────────────────────────────────────────────────────

function LoginsPanel() {
  const [logins, setLogins] = useState<LoginItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [eventFilter, setEventFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    signins24h: 0,
    failed24h: 0,
    signups7d: 0,
    unique24h: 0,
  })

  useEffect(() => {
    fetchLogins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, eventFilter])

  const fetchLogins = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "30",
        event: eventFilter,
        ...(search ? { q: search } : {}),
      })
      const res = await fetch(`/api/admin/activity/logins?${params}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setLogins(data.logins || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error("Failed to fetch logins:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Sign-ins · 24h" value={stats.signins24h} icon={LogIn} tone="purple" />
        <StatTile label="Unique · 24h" value={stats.unique24h} icon={User} tone="muted" />
        <StatTile
          label="Failed · 24h"
          value={stats.failed24h}
          icon={ShieldAlert}
          tone={stats.failed24h > 0 ? "rose" : "muted"}
        />
        <StatTile label="New signups · 7d" value={stats.signups7d} icon={UserPlus} tone="emerald" />
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setPage(1)
                fetchLogins()
              }}
              className="relative flex-1"
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or identifier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </form>
            <div className="flex gap-2">
              <Select
                value={eventFilter}
                onValueChange={(v) => {
                  setEventFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="signin">Successful sign-in</SelectItem>
                  <SelectItem value="signin_failed">Failed attempt</SelectItem>
                  <SelectItem value="signup">Sign-up</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="password_change">Password change</SelectItem>
                  <SelectItem value="password_reset_requested">Reset requested</SelectItem>
                  <SelectItem value="role_change">Role change</SelectItem>
                  <SelectItem value="2fa_enabled">2FA enabled</SelectItem>
                  <SelectItem value="2fa_disabled">2FA disabled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setPage(1)
                  fetchLogins()
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LogIn className="h-5 w-5 text-[#7B2D8E]" />
            Login & auth events
          </CardTitle>
          <CardDescription>
            Pulled from the tamper-evident auth ledger. Showing {logins.length}{" "}
            {logins.length === 1 ? "event" : "events"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LogIn className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                No login events
              </p>
              <p className="text-sm text-muted-foreground/70">
                Events will appear here as users sign in or out.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {logins.map((l) => {
                const tone =
                  loginEventColors[l.eventType] ||
                  "bg-gray-100 text-gray-600 border-gray-200"
                const icon =
                  loginEventIcons[l.eventType] || <Activity className="h-4 w-4" />
                const device = deviceFromUA(l.userAgent)
                const newDevice = (l.eventData as any)?.newDevice
                return (
                  <li
                    key={l.id}
                    className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/30"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border flex-shrink-0",
                        tone,
                      )}
                    >
                      {icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {l.userName}
                        </span>
                        {l.userRole && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {l.userRole}
                          </Badge>
                        )}
                        <Badge
                          className={cn(
                            "text-xs border",
                            loginEventColors[l.eventType] ||
                              "bg-gray-100 text-gray-600 border-gray-200",
                          )}
                        >
                          {formatLabel(l.eventType)}
                        </Badge>
                        {newDevice && (
                          <Badge className="text-xs border bg-amber-50 text-amber-700 border-amber-200">
                            New device
                          </Badge>
                        )}
                      </div>
                      {l.userEmail && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {l.userEmail}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <device.Icon className="h-3 w-3" />
                          {device.label}
                        </span>
                        {l.ipAddress && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Globe className="h-3 w-3" />
                            {l.ipAddress}
                          </span>
                        )}
                      </div>
                      {l.userAgent && (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground/80">
                          {l.userAgent}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatRelative(l.createdAt)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tone: "purple" | "rose" | "emerald" | "muted"
}) {
  const palette = {
    purple: "bg-[#7B2D8E]/10 text-[#7B2D8E]",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    muted: "bg-gray-100 text-gray-600",
  }[tone]
  return (
    <div className="rounded-2xl border border-border/50 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", palette)}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}
