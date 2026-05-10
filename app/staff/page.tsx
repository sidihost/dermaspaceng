"use client"

/**
 * Staff dashboard
 *
 * The front-desk's control room. The previous version only surfaced
 * pending counts — staff couldn't tell whether a customer who'd just
 * walked in had paid, and the complaints surface forced them to open
 * a separate page. We now surface:
 *
 *   • Welcome hero with a "today's revenue" pill so the operator
 *     reads how the day is going at a glance.
 *   • Triage tiles for gift cards / complaints / consultations /
 *     surveys (unchanged).
 *   • A two-column grid showing:
 *       – Recent client payments (who paid, how much, what method).
 *       – Recent complaints (with customer name + snippet) so the
 *         front desk can pick up context before greeting them.
 *   • Quick-action navigation.
 *
 * Visual rules — keeps the brand pure: brand purple (#7B2D8E),
 * neutrals (white / gray-50/100/200/500/900), hairline borders, no
 * gradients or random fills.
 */

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Gift,
  MessageSquare,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Wallet,
  CreditCard,
  AlertCircle,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useNotify } from "@/components/shared/notify"

interface Stats {
  pendingGiftCards: number
  pendingComplaints: number
  pendingConsultations: number
  recentSurveys: number
}

interface RecentItem {
  id: string
  type: string
  title: string
  status: string
  created_at: string
}

interface RecentPayment {
  id: string
  reference: string | null
  amount: number
  method: string | null
  description: string
  customerName: string
  customerEmail: string | null
  createdAt: string
}

interface RecentComplaint {
  id: string
  subject: string
  message: string
  status: string
  priority: string
  customerName: string
  customerEmail: string
  createdAt: string
}

interface DashboardResponse {
  success: boolean
  stats: Stats
  recentItems: RecentItem[]
  recentPayments: RecentPayment[]
  recentComplaints: RecentComplaint[]
  todayRevenue: number
}

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n)

const formatRelative = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
  })
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const formatMethod = (method: string | null) => {
  if (!method) return "Payment"
  if (method === "paystack") return "Paystack"
  if (method === "wallet") return "Wallet"
  if (method === "bank_transfer") return "Bank transfer"
  return method.charAt(0).toUpperCase() + method.slice(1)
}

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function StaffDashboardPage() {
  const { user } = useAuth()
  const notify = useNotify()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    // Background poll every 30s so payments / complaints feel live.
    const t = window.setInterval(() => fetchDashboardData(true), 30000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch("/api/staff/dashboard", { cache: "no-store" })
      const json = (await res.json()) as DashboardResponse
      if (json.success) {
        setData(json)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      if (!silent) {
        notify.error("Could not refresh", "Try again in a moment.")
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const triggerRefresh = async () => {
    await fetchDashboardData()
    notify.success("Up to date", "The dashboard is showing the latest data.")
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  }, [])

  const operatorName = user?.firstName ?? "there"
  const stats = data?.stats
  const recentItems = data?.recentItems ?? []
  const recentPayments = data?.recentPayments ?? []
  const recentComplaints = data?.recentComplaints ?? []
  const todayRevenue = data?.todayRevenue ?? 0

  const totalPending =
    (stats?.pendingGiftCards ?? 0) +
    (stats?.pendingComplaints ?? 0) +
    (stats?.pendingConsultations ?? 0)

  const statCards = [
    {
      title: "Gift cards",
      value: stats?.pendingGiftCards ?? 0,
      hint: "Awaiting approval",
      icon: Gift,
      href: "/staff/gift-cards",
    },
    {
      title: "Complaints",
      value: stats?.pendingComplaints ?? 0,
      hint: "Open tickets",
      icon: MessageSquare,
      href: "/staff/complaints",
    },
    {
      title: "Consultations",
      value: stats?.pendingConsultations ?? 0,
      hint: "Pending review",
      icon: Calendar,
      href: "/staff/consultations",
    },
    {
      title: "Recent surveys",
      value: stats?.recentSurveys ?? 0,
      hint: "Last 7 days",
      icon: FileText,
      href: "/staff/surveys",
    },
  ]

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      pending: {
        cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20",
        label: "Pending",
      },
      open: {
        cls: "bg-[#7B2D8E]/15 text-[#5A1D6A] ring-[#7B2D8E]/30",
        label: "Open",
      },
      in_progress: {
        cls: "bg-[#7B2D8E] text-white ring-[#7B2D8E]",
        label: "In progress",
      },
      resolved: {
        cls: "bg-gray-100 text-gray-700 ring-gray-200",
        label: "Resolved",
      },
    }
    const cfg = map[status] ?? map.pending
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1 ${cfg.cls}`}
      >
        {cfg.label}
      </span>
    )
  }

  const getPriorityDot = (priority: string) => {
    if (priority === "urgent" || priority === "high") {
      return <span className="inline-block h-2 w-2 rounded-full bg-[#7B2D8E]" aria-hidden />
    }
    return <span className="inline-block h-2 w-2 rounded-full bg-gray-300" aria-hidden />
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Welcome card with today's revenue chip */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#7B2D8E]" aria-hidden />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" aria-hidden />
              Today
            </span>
            <p className="mt-1.5 text-sm font-medium text-[#7B2D8E]">
              {greeting}, {operatorName}.
            </p>
            <h1 className="mt-0.5 text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight text-balance">
              {totalPending > 0
                ? `${totalPending} ${totalPending === 1 ? "thing" : "things"} need your attention.`
                : "You're all caught up."}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
              {totalPending > 0
                ? "Tap any tile below to triage. Customers see updates in real time."
                : "Take a breath — we'll let you know when something new comes in."}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#7B2D8E]/8 border border-[#7B2D8E]/15 px-3.5 py-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-[#7B2D8E]" aria-hidden />
              <span className="text-xs text-gray-600">Today&apos;s revenue</span>
              <span className="text-sm font-bold text-[#7B2D8E] tabular-nums">
                {naira(todayRevenue)}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={triggerRefresh}
              disabled={refreshing}
              className="self-start sm:self-end inline-flex items-center gap-2 border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 text-gray-700 hover:text-[#7B2D8E]"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} className="group">
            <article className="relative h-full rounded-2xl border border-gray-100 bg-white p-5 transition-colors hover:border-[#7B2D8E]/30">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <stat.icon className="h-5 w-5" aria-hidden />
                </span>
                <ArrowRight className="h-4 w-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#7B2D8E]" />
              </div>
              <div className="mt-4">
                <p className="text-[28px] leading-none font-semibold tabular-nums text-gray-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-gray-700">{stat.title}</p>
                <p className="text-[11.5px] text-gray-500">{stat.hint}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* Recent payments + recent complaints — the front desk's new
          situational-awareness row. Two-column on lg+, stacked on
          mobile so phones don't feel cramped. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-gray-100 rounded-2xl">
          <CardHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Wallet className="h-4 w-4 text-[#7B2D8E]" />
                  Recent client payments
                </CardTitle>
                <CardDescription className="text-xs">
                  Confirm a customer paid before they walk in.
                </CardDescription>
              </div>
              <Link
                href="/staff/clients"
                className="text-[11.5px] font-semibold text-[#7B2D8E] hover:underline"
              >
                Clients
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-11 h-11 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">No payments yet today</p>
                <p className="mt-1 text-xs text-gray-500">
                  Customer payments will show up here in real time.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentPayments.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#7B2D8E]/[0.03] transition-colors">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[11px] font-bold uppercase text-[#7B2D8E]">
                      {initials(p.customerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {p.customerName}
                        </p>
                        <p className="text-sm font-bold text-[#7B2D8E] tabular-nums flex-shrink-0">
                          {naira(p.amount)}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="truncate">{formatMethod(p.method)}</span>
                        <span aria-hidden>&middot;</span>
                        <span className="flex-shrink-0">{formatRelative(p.createdAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-100 rounded-2xl">
          <CardHeader className="border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <AlertCircle className="h-4 w-4 text-[#7B2D8E]" />
                  Recent complaints
                </CardTitle>
                <CardDescription className="text-xs">
                  Know who&apos;s unhappy before they walk through the door.
                </CardDescription>
              </div>
              <Link
                href="/staff/complaints"
                className="text-[11.5px] font-semibold text-[#7B2D8E] hover:underline"
              >
                Open
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentComplaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-11 h-11 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">No open complaints</p>
                <p className="mt-1 text-xs text-gray-500">
                  Every customer is happy right now.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentComplaints.map((c) => (
                  <li key={c.id}>
                    <Link
                      href="/staff/complaints"
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#7B2D8E]/[0.03] transition-colors"
                    >
                      <span className="mt-1.5 flex-shrink-0">{getPriorityDot(c.priority)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {c.customerName}
                          </p>
                          {getStatusBadge(c.status)}
                        </div>
                        <p className="mt-0.5 text-[12px] text-gray-700 line-clamp-1">
                          {c.subject}
                        </p>
                        {c.message && (
                          <p className="mt-0.5 text-[11.5px] text-gray-500 line-clamp-1">
                            {c.message}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10.5px] text-gray-400">
                          {formatRelative(c.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + quick actions */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-gray-100 rounded-2xl">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-4 w-4 text-[#7B2D8E]" />
              Recent requests
            </CardTitle>
            <CardDescription className="text-xs">
              Latest customer requests requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center text-[#7B2D8E]">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="mt-3 text-base font-semibold text-gray-900">All caught up</p>
                <p className="mt-1 text-sm text-gray-500">
                  No pending requests at the moment.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentItems.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-[#7B2D8E]/[0.03]"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-[11.5px] text-gray-500">
                        {item.type} &middot; {formatDateTime(item.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-100 rounded-2xl">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
            <CardDescription className="text-xs">
              Common tasks you can perform
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid gap-2">
              <QuickAction
                href="/staff/clients"
                icon={Wallet}
                label="Look up a client"
                hint="Search bookings, spend, and history"
              />
              <QuickAction
                href="/staff/gift-cards"
                icon={Gift}
                label="Gift card requests"
                hint="Review and approve applications"
              />
              <QuickAction
                href="/staff/complaints"
                icon={MessageSquare}
                label="Respond to complaints"
                hint="Help customers with their concerns"
              />
              <QuickAction
                href="/staff/consultations"
                icon={Calendar}
                label="Manage consultations"
                hint="Schedule and confirm appointments"
              />
              <QuickAction
                href="/staff/surveys"
                icon={FileText}
                label="Survey responses"
                hint="See what customers are saying"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  hint,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-100 hover:border-[#7B2D8E]/30 hover:bg-[#7B2D8E]/[0.03] p-3 transition-colors group"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex-shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
        <p className="text-[11.5px] text-gray-500 truncate">{hint}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#7B2D8E] transition-colors flex-shrink-0" />
    </Link>
  )
}
