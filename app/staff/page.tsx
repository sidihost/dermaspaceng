"use client"

/**
 * Staff dashboard
 *
 * Re-imagined as the "control room" landing for the staff console:
 *
 *   • A welcome card that greets the operator by name and surfaces
 *     the day's headline — "you have N items waiting" or
 *     "you're all caught up". Big, on-brand, friendly copy.
 *   • A 2×2 grid of triage tiles (gift cards / complaints /
 *     consultations / surveys) with motion-aware hover states and
 *     monochrome brand-purple accents. Tapping any tile applies a
 *     filter on the corresponding sub-page.
 *   • A "Today" panel listing the most recent items requiring
 *     attention with status pills.
 *   • A quick-actions panel for the most common operator gestures.
 *
 * Visual rules — keeps the brand pure:
 *   - One brand colour: #7B2D8E.
 *   - Neutrals: white, gray-50/100/200/500/900.
 *   - One semantic emerald for "all caught up" green-light moments.
 *   - No gradients, no random fills. Solid colours, hairline borders.
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
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useNotify } from "@/components/shared/notify"
// Live per-staff bookings trend (last 8 weeks). Backed by SWR
// against /api/staff/stats/trend, which is invalidated whenever a
// booking gets assigned to or status-changed for this operator.
import { useStaffTrend } from "@/hooks/use-stats"
import { StatsBarChart } from "@/components/charts/stats-bar-chart"

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

export default function StaffDashboardPage() {
  const { user } = useAuth()
  const notify = useNotify()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // Per-staff weekly trend + lifetime totals. Polls every 30s and
  // refreshes on tab focus; cache-keyed by user id on the server.
  const { data: trend } = useStaffTrend()
  const trendChart = trend?.charts.weekly ?? []
  const trendTotals = trend?.totals

  useEffect(() => {
    fetchDashboardData()
    // Background poll every 30s so counts update without a refresh.
    const t = window.setInterval(() => fetchDashboardData(true), 30000)
    return () => window.clearInterval(t)
  }, [])

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch("/api/staff/dashboard")
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setRecentItems(data.recentItems || [])
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

  // Time-of-day greeting matching the admin console. Uses the
  // viewer's local clock — staff are usually salon-floor based in
  // Lagos, but we don't hard-code a timezone so anyone signed in
  // late at home still gets the right copy.
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  }, [])

  const operatorName = user?.firstName ?? "there"

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

  // Status badges originally walked the rainbow (amber / rose /
  // emerald) which read as "system warning" colours and clashed
  // with the rest of the brand-purple staff console. We now use a
  // single brand palette: tinted purple for "needs work", solid
  // purple for "in progress", and a calm gray for "done". The
  // visual hierarchy still works (saturation = urgency) but
  // everything stays inside the Dermaspace identity.
  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      pending: { cls: "bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/20", label: "Pending" },
      open: { cls: "bg-[#7B2D8E]/15 text-[#5A1D6A] ring-[#7B2D8E]/30", label: "Open" },
      in_progress: { cls: "bg-[#7B2D8E] text-white ring-[#7B2D8E]", label: "In progress" },
      resolved: { cls: "bg-gray-100 text-gray-700 ring-gray-200", label: "Resolved" },
    }
    const cfg = map[status] ?? map.pending
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ring-1 ${cfg.cls}`}>
        {cfg.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
      {/* Welcome card — branded but restrained. Replaces the previous
          plain "Staff Dashboard" text with a personalised hero that
          tells the operator at-a-glance how the day is going. */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#7B2D8E]" aria-hidden />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-[#7B2D8E]"
                aria-hidden
              />
              Today
            </span>
            {/* Personal greeting line — mirrors the admin hero so
                operators get the same warm welcome on either console. */}
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
          <Button
            variant="outline"
            onClick={triggerRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto inline-flex items-center gap-2 border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5 text-gray-700 hover:text-[#7B2D8E]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
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

      {/* Per-staff bookings trend — last 8 weeks, completed vs
          upcoming stacked. Renders a quiet "no assigned bookings yet"
          card when this operator hasn't been the primary on anything,
          so the chart card is never blank. */}
      <section className="rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Your bookings — last 8 weeks
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Stacked by status: completed and upcoming
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#7B2D8E]" />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#C084FC]" />
              Upcoming
            </span>
          </div>
        </div>
        <div className="p-3 sm:p-4">
          <StatsBarChart
            data={trendChart}
            xKey="label"
            series={[
              { dataKey: 'completed', label: 'Completed', color: '#7B2D8E' },
              { dataKey: 'upcoming', label: 'Upcoming', color: '#C084FC' },
            ]}
            ariaLabel="Your bookings per week, last 8 weeks, broken out by status"
            height={200}
          />
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-gray-50 p-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                Lifetime completed
              </p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                {(trendTotals?.completed ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                Upcoming
              </p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                {(trendTotals?.upcoming ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                This week
              </p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                {(trendTotals?.thisWeek ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Activity + quick actions */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Recent activity */}
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
                        {item.type} · {formatDate(item.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
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
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
        <p className="text-[11.5px] text-gray-500 truncate">{hint}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#7B2D8E] transition-colors flex-shrink-0" />
    </Link>
  )
}


