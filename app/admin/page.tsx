'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar,
} from 'recharts'
import {
  Users, Calendar, LifeBuoy, Gift, Star,
  ArrowUpRight, ArrowDownRight, UserCog,
  ChevronRight, Activity, Inbox, LayoutGrid,
  TrendingUp, Clock, CheckCircle2, Bell,
  Wallet, Mail, Cake, CreditCard,
  Ticket, CircleDashed, CircleDot, Archive,
  ThumbsUp, ThumbsDown,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { AdminOpsOverview } from '@/components/admin/ops-overview'
import { OperationsPanel } from '@/components/admin/operations-panel'
import {
  computeTicketSummary,
  formatRelativeTimestamp,
  getTicketPriorityMeta,
  getTicketStatusMeta,
  parseLiveChatFeedbackComment,
} from '@/lib/support-and-chat'

interface RecentTicketItem {
  id: string
  ticketId: string | null
  subject: string
  customerName: string
  customerEmail: string
  status: string
  priority: string
  category: string | null
  source: 'ticket' | 'complaint'
  createdAt: string
  updatedAt: string
}

interface Stats {
  users: { total: number; recent: number; growth: number }
  consultations: { total: number; pending: number; thisWeek: number }
  complaints: {
    total: number
    open: number
    awaiting?: number
    inProgress?: number
    resolved: number
    closed?: number
  }
  tickets?: {
    open: number
    total?: number
    breakdown?: {
      total: number
      open: number
      inProgress: number
      resolved: number
      closed: number
    }
    recent?: RecentTicketItem[]
  }
  giftCards: { total: number; pending: number; totalValue: number }
  surveys: { total: number; avgRating: number; thisWeek: number }
  staff: { total: number }
  liveChat?: { waiting: number; active: number }
  liveChatRatings?: {
    avgRating: number
    ratedCount: number
    positiveCount: number
    negativeCount: number
    staffSummary: Array<{
      staffId: string
      staffName: string
      staffAvatarUrl: string
      avgRating: number
      ratingsCount: number
      positiveCount: number
    }>
    recentFeedback: Array<{
      sessionId: string
      supportCode: string
      customerName: string
      staffId: string | null
      staffName: string | null
      staffAvatarUrl: string | null
      rating: number
      comment: string | null
      ratedAt: string
    }>
  }
  bookings?: { pending: number; upcoming: number }
  pendingTransactions?: { count: number; totalAmount: number }
  birthdaysToday?: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
  }>
  todayBookings?: {
    count: number
    items: Array<{
      id: string
      bookingReference: string
      appointmentTime: string
      locationName: string
      customerName: string
      status: string
    }>
  }
  recentStaffActivity?: Array<{
    id: string
    staffId: string
    actorName: string
    actorRole: string
    actionType: string
    entityType: string
    description: string
    createdAt: string
  }>
  newsletter?: {
    total: number
    active: number
    thisWeek: number
    todayNew: number
    recentSubscribers?: Array<{
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      source: string
      status: string
      createdAt: string | null
    }>
  }
}

interface RevenueSummary {
  grossThisMonth: number
  grossLastMonth: number
  growth: number
}

interface ChartData {
  userTrend: { date: string; count: number }[]
  salesTrend: { month: string; gross: number; tax: number; net: number }[]
}

// Naira number formatter — ₦12,500 / ₦1.2M depending on size. Used by
// the Sales chart legend, the headline number, and the Recharts
// tooltip so they all read as a single currency style.
const formatNaira = (n: number): string => {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`
  return `₦${Math.round(n).toLocaleString('en-NG')}`
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [charts, setCharts] = useState<ChartData | null>(null)
  // Revenue summary feeds the headline number + delta on the Sales
  // chart card. Null until the first stats fetch resolves so the
  // card's empty state can render without flashing zeros.
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Personalised first-name greeting. Falls back to a generic
  // "Admin" only if /api/auth/me hasn't hydrated yet — once it
  // does, the hero re-renders with "Itunu", "Franca", etc. so the
  // dashboard reads like a console *for them* rather than a
  // generic admin shell.
  const adminName = user?.firstName?.trim() || 'Admin'

  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats')
        if (res.ok && isMounted) {
          const data = await res.json()
          setStats(data.stats)
          setCharts(data.charts)
          setRevenue(data.revenue ?? null)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchStats()
    return () => {
      isMounted = false
    }
  }, [])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full" />
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total users',
      value: stats?.users.total ?? 0,
      delta: stats?.users.growth,
      sublabel: `${stats?.users.recent ?? 0} joined recently`,
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Consultations',
      value: stats?.consultations.pending ?? 0,
      sublabel: `${stats?.consultations.thisWeek ?? 0} new this week`,
      icon: Calendar,
      href: '/admin/consultations',
    },
    {
      label: 'Open support inbox',
      value: stats?.complaints.open ?? 0,
      sublabel: `${stats?.complaints.resolved ?? 0} resolved all time`,
      icon: Inbox,
      href: '/admin/complaints',
    },
    {
      label: 'Gift cards',
      value: stats?.giftCards.pending ?? 0,
      sublabel: `₦${(stats?.giftCards.totalValue ?? 0).toLocaleString()} in value`,
      icon: Gift,
      href: '/admin/gift-cards',
    },
    {
      label: 'Survey responses',
      value: stats?.surveys.total ?? 0,
      sublabel: `${(stats?.surveys.avgRating ?? 0).toFixed(1)} average rating`,
      icon: Star,
      href: '/admin/surveys',
    },
    {
      label: 'Bookings',
      value: stats?.bookings?.pending ?? 0,
      sublabel: `${stats?.bookings?.upcoming ?? 0} upcoming confirmed`,
      icon: Calendar,
      href: '/admin/bookings',
    },
    {
      label: 'Staff members',
      value: stats?.staff.total ?? 0,
      sublabel: 'Active on the platform',
      icon: UserCog,
      href: '/admin/staff',
    },
    {
      label: 'Newsletter',
      value: stats?.newsletter?.active ?? 0,
      sublabel: `${stats?.newsletter?.thisWeek ?? 0} new this week · ${stats?.newsletter?.total ?? 0} total`,
      icon: Mail,
      href: '/admin/newsletter',
    },
  ]

  const ticketSummary = computeTicketSummary({
    open: stats?.complaints.awaiting ?? stats?.complaints.open ?? 0,
    inProgress: stats?.complaints.inProgress ?? 0,
    resolved: stats?.complaints.resolved ?? 0,
    closed: stats?.complaints.closed ?? 0,
  })
  const resolutionRate = ticketSummary.resolutionRate
  const complaintData = ticketSummary.rows.map((row) => ({
    status: row.status,
    name: row.label,
    value: row.count,
    color: row.chartColor,
  }))
  const hasChartBreakdown = complaintData.some((item) => item.value > 0)
  const pieChartData = hasChartBreakdown
    ? complaintData
    : [{ status: 'closed', name: 'No tickets yet', value: 1, color: '#F3E8F7' }]
  const recentTickets = stats?.tickets?.recent ?? []

  const quickActions = [
    { label: 'Invite staff', sub: 'Add team members', href: '/admin/staff', icon: UserCog },
    { label: 'Gift cards', sub: 'Review requests', href: '/admin/gift-cards', icon: Gift },
    { label: 'Support', sub: 'Messages & tickets', href: '/admin/complaints', icon: LifeBuoy },
    { label: 'Activity log', sub: 'View all events', href: '/admin/activity', icon: Activity },
  ]

  const highlights = [
    {
      label: 'New users this week',
      value: stats?.users.recent ?? 0,
      icon: TrendingUp,
    },
    {
      label: 'Consultations this week',
      value: stats?.consultations.thisWeek ?? 0,
      icon: Calendar,
    },
    {
      label: 'Survey responses this week',
      value: stats?.surveys.thisWeek ?? 0,
      icon: Star,
    },
  ]

  return (
    // Tighter vertical rhythm between sections — 20px mobile / 24px desktop
    // instead of 24/32. The dashboard previously felt very "tall".
    <div className="space-y-5 sm:space-y-6">
      {/* Hero header — flat solid purple. The blurred lilac orbs and the
          radial-dot overlay were reading as a soft gradient against the
          base colour, which conflicted with the "no gradients" direction
          for the admin console. Now it's just a clean purple panel. */}
      <section className="relative overflow-hidden rounded-2xl bg-[#7B2D8E] text-white">
        <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="max-w-xl">
              {/* The "All systems operational" pulsing chip was removed — the
                  hero now opens directly with the greeting for a cleaner,
                  calmer feel. Real system status lives on the Settings page. */}
              {/* Hero title trimmed — no more step to 36/40px on wide screens.
                  Keeps the greeting calm, not a landing-page shout. */}
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-balance">
                {greeting}, {adminName}
              </h1>
              <p className="mt-1.5 text-sm text-white/80 text-pretty max-w-md">
                Here&apos;s your console — users, consultations, bookings and
                support inbox at a glance for today.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#7B2D8E] px-4 py-2 text-sm font-medium hover:bg-white/95 transition-colors"
                >
                  View users
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/admin/activity"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/20 text-white px-4 py-2 text-sm font-medium hover:bg-white/15 transition-colors"
                >
                  Activity log
                </Link>
              </div>
            </div>

            {/* Snapshot cards — the redundant "THIS WEEK" eyebrow has
                been removed entirely; every label already says "this
                week" so the chrome was duplicating itself and clipping
                to "THIS WE…" at narrow widths. We now stack the cards
                in a single column on phones (full width — no clipping
                possible), 3-up from sm: where there's room. Labels
                use whitespace-normal + leading-snug so the multi-word
                copy ("New users this week") always wraps to as many
                lines as it needs. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:min-w-[360px] w-full lg:w-auto">
              {highlights.map((h) => (
                <div
                  key={h.label}
                  className="rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-3 py-2.5 sm:p-3 flex sm:flex-col items-center sm:items-start justify-between gap-3 sm:gap-0 min-w-0"
                >
                  <p className="order-2 sm:order-1 text-[11px] sm:text-[11.5px] text-white/75 leading-snug whitespace-normal sm:mb-1 text-right sm:text-left">
                    {h.label}
                  </p>
                  <p className="order-1 sm:order-2 text-2xl sm:text-xl font-semibold tabular-nums leading-none">
                    {h.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Action Center — surfaces the things that actually need a
          decision from the admin today (open tickets, pending
          consultations, gift-card requests, drafts). The card stays
          out of view entirely when the inbox is clear: in that
          state we render a calm "all caught up" success card
          instead, so admins finally get the same positive
          reinforcement customers see on the user dashboard. Pure
          brand palette — no green / red / amber — to match the rest
          of the console. */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#7B2D8E]" />
            <h2 className="text-sm font-semibold text-gray-900">
              Needs your attention
            </h2>
          </div>
        </div>
        {(() => {
          const items: {
            label: string
            count: number
            href: string
            sub: string
            icon: typeof Inbox
          }[] = []
          if ((stats?.liveChat?.waiting ?? 0) > 0) {
            items.push({
              label: 'Live chats waiting',
              count: stats!.liveChat!.waiting,
              href: '/admin/live-chat',
              sub: 'Customers waiting in queue right now',
              icon: Inbox,
            })
          }
          if ((stats?.pendingTransactions?.count ?? 0) > 0) {
            items.push({
              label: 'Pending payments',
              count: stats!.pendingTransactions!.count,
              href: '/admin/transactions?status=pending',
              sub: `${formatNaira(stats!.pendingTransactions!.totalAmount)} awaiting verification or cancel`,
              icon: CreditCard,
            })
          }
          if ((stats?.complaints.open ?? 0) > 0) {
            items.push({
              label: 'Open support tickets',
              count: stats!.complaints.open,
              href: '/admin/complaints',
              sub: 'Customers waiting on a reply',
              icon: Inbox,
            })
          }
          if ((stats?.consultations.pending ?? 0) > 0) {
            items.push({
              label: 'Consultations to review',
              count: stats!.consultations.pending,
              href: '/admin/consultations',
              sub: 'AI handovers and bookings',
              icon: Calendar,
            })
          }
          if ((stats?.giftCards.pending ?? 0) > 0) {
            items.push({
              label: 'Gift card requests',
              count: stats!.giftCards.pending,
              href: '/admin/gift-cards',
              sub: 'Approve or decline',
              icon: Gift,
            })
          }

          if (items.length === 0) {
            return (
              <div className="relative rounded-2xl border border-[#7B2D8E]/20 bg-white p-3.5 sm:p-4 overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 w-1 bg-[#7B2D8E] rounded-l-2xl"
                  aria-hidden
                />
                <div className="pl-2 flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-semibold text-gray-900 tabular-nums">
                        0
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7B2D8E]">
                        All clear
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
                      You&apos;re all caught up
                    </p>
                    <p className="text-[11.5px] text-gray-500 mt-0.5 leading-relaxed">
                      No waiting chats, pending payments, consultations, complaints or gift-card
                      requests. Have a great day.
                    </p>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((it) => (
                <Link
                  key={it.label}
                  href={it.href}
                  className="group relative rounded-2xl border border-[#7B2D8E]/20 bg-white p-3.5 sm:p-4 hover:border-[#7B2D8E]/40 transition-colors overflow-hidden"
                >
                  <span
                    className="absolute inset-y-0 left-0 w-1 bg-[#7B2D8E] rounded-l-2xl"
                    aria-hidden
                  />
                  <div className="pl-2 flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                      <it.icon className="w-4 h-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-semibold text-gray-900 tabular-nums">
                          {it.count}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7B2D8E]">
                          To do
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
                        {it.label}
                      </p>
                      <p className="text-[11.5px] text-gray-500 mt-0.5">
                        {it.sub}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )
        })()}
      </section>

      {/* Today at the spa — operational snapshot */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7B2D8E]" />
            <h2 className="text-sm font-semibold text-gray-900">
              Today at the spa
            </h2>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs font-medium text-[#7B2D8E] hover:underline inline-flex items-center gap-1"
          >
            Full schedule
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Today's appointments */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#7B2D8E]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Today&apos;s appointments
                </h3>
              </div>
              <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
                {stats?.todayBookings?.count ?? 0}
              </span>
            </div>
            <div className="p-3.5 flex-1">
              {!stats?.todayBookings?.items || stats.todayBookings.items.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  No bookings scheduled for today yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {stats.todayBookings.items.map((b) => (
                    <li key={b.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{b.customerName}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {b.appointmentTime} · {b.locationName}
                        </p>
                      </div>
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="shrink-0 text-[11px] font-medium text-[#7B2D8E] hover:underline"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Card 2: Pending payments & Birthdays today */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-[#7B2D8E]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Birthdays &amp; Payments
                </h3>
              </div>
              <Link
                href="/admin/transactions?status=pending"
                className="text-[11px] font-semibold text-[#7B2D8E] hover:underline"
              >
                {stats?.pendingTransactions?.count ?? 0} pending
              </Link>
            </div>
            <div className="p-3.5 space-y-3 flex-1">
              <Link
                href="/admin/transactions?status=pending"
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 hover:border-[#7B2D8E]/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900">
                    Pending transactions
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatNaira(stats?.pendingTransactions?.totalAmount ?? 0)} open across {stats?.pendingTransactions?.count ?? 0} item(s)
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>

              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Birthdays today ({stats?.birthdaysToday?.length ?? 0})
                </p>
                {!stats?.birthdaysToday || stats.birthdaysToday.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">
                    No client birthdays today.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {stats.birthdaysToday.slice(0, 3).map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-gray-800 font-medium">
                          {b.firstName} {b.lastName}
                        </span>
                        <Link
                          href={`/admin/users/${b.id}`}
                          className="shrink-0 text-[11px] font-medium text-[#7B2D8E] hover:underline"
                        >
                          Message
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Recent staff activity */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-[#7B2D8E]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Recent staff activity
                </h3>
              </div>
              <Link
                href="/admin/activity?role=staff"
                className="text-[11px] font-semibold text-[#7B2D8E] hover:underline"
              >
                All activity
              </Link>
            </div>
            <div className="p-3.5 flex-1">
              {!stats?.recentStaffActivity || stats.recentStaffActivity.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  No recent staff activity recorded yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {stats.recentStaffActivity.map((act) => (
                    <li key={act.id} className="py-2 first:pt-0 last:pb-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/admin/staff/${act.staffId}`}
                          className="font-semibold text-gray-900 hover:text-[#7B2D8E] truncate"
                        >
                          {act.actorName}
                        </Link>
                        <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                          {new Date(act.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {act.description || act.actionType}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section>
        <div className="flex items-end justify-between mb-3 sm:mb-4">
          <div>
            {/* Section headers stay at 14px across breakpoints — the
                previous jump to 16px made sections feel heavy. */}
            <h2 className="text-sm font-semibold text-gray-900">
              Overview
            </h2>
            <p className="text-xs text-gray-500">Key metrics across the platform</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Clock className="w-3 h-3" />
            Updated{' '}
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 hover:border-[#7B2D8E]/30 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:ring-offset-2"
            >
              {/* Hover accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-[#7B2D8E] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  {/* `whitespace-normal` + `leading-snug` so labels
                      like "Open support inbox" or "Survey responses"
                      wrap onto a second line at narrow widths instead
                      of clipping to "Open suppor…". */}
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-normal leading-snug break-words">
                    {stat.label}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/5 group-hover:bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 transition-colors">
                  <stat.icon className="w-4 h-4 text-[#7B2D8E]" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                {/* Stat values trimmed one step — 20/24 instead of 24/30. */}
                <span className="text-xl sm:text-2xl font-semibold text-gray-900 tabular-nums tracking-tight">
                  {stat.value.toLocaleString()}
                </span>
                {stat.delta !== undefined && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5 ${
                      stat.delta >= 0
                        ? 'text-[#7B2D8E] bg-[#7B2D8E]/10'
                        : 'text-gray-700 bg-gray-100'
                    }`}
                  >
                    {stat.delta >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(stat.delta)}%
                  </span>
                )}
              </div>
              {/* Sublabel — switched from `truncate` to wrap so the
                  full descriptor renders. Two-line clamp keeps the
                  card heights even when one card has a much longer
                  copy ("₦12,500,000 in value") than another. */}
              <p className="mt-1.5 text-xs text-gray-500 leading-snug line-clamp-2">
                {stat.sublabel}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* User Registrations - takes 2 cols */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                User registrations
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                New signups over the last 30 days
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#7B2D8E]/5 text-[#7B2D8E] px-2.5 py-1 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
              Daily
            </div>
          </div>
          <div className="p-2 sm:p-4">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={charts?.userTrend ?? []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3F4F6"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  width={30}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E5E7EB',
                    fontSize: 12,
                  }}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#7B2D8E"
                  strokeWidth={2.5}
                  fill="#7B2D8E"
                  fillOpacity={0.08}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ticket & Support Status Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between gap-2 p-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Ticket status breakdown
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {ticketSummary.total} total · {ticketSummary.awaitingReply} active
              </p>
            </div>
            <Link
              href="/admin/complaints"
              className="text-xs font-semibold text-[#7B2D8E] hover:underline whitespace-nowrap"
            >
              Open inbox
            </Link>
          </div>
          <div className="p-4">
            <div className="relative h-[168px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={hasChartBreakdown ? 2 : 0}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-semibold text-gray-900 tabular-nums tracking-tight">
                  {resolutionRate}%
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
                  resolved
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {complaintData.map((item) => (
                <Link
                  key={item.status}
                  href={`/admin/complaints?status=${item.status}`}
                  className="flex items-center justify-between text-xs bg-[#FAF6FB]/70 hover:bg-[#FAF6FB] border border-gray-100 hover:border-[#7B2D8E]/25 rounded-lg px-2.5 py-2 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700 font-medium truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900 tabular-nums ml-2">
                    {item.value}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Support Tickets & Live Status — shows every recent ticket
          alongside its current status pill and clickable status counters
          so admins can track ticket progress directly from the dashboard. */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Ticket className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                Support tickets &amp; status
              </h2>
              <p className="text-xs text-gray-500">
                <span className="tabular-nums font-medium text-gray-700">
                  {ticketSummary.open}
                </span>{' '}
                open
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums font-medium text-[#7B2D8E]">
                  {ticketSummary.inProgress}
                </span>{' '}
                in progress
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums">
                  {ticketSummary.resolved}
                </span>{' '}
                resolved
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums">
                  {ticketSummary.closed}
                </span>{' '}
                closed
              </p>
            </div>
          </div>
          <Link
            href="/admin/complaints"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:underline whitespace-nowrap"
          >
            View all tickets
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Status quick-filter strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-b border-gray-100 bg-[#FAF6FB]/40">
          {ticketSummary.rows.map((row) => {
            const StatusIcon =
              row.status === 'open'
                ? CircleDashed
                : row.status === 'in_progress'
                  ? CircleDot
                  : row.status === 'resolved'
                    ? CheckCircle2
                    : Archive
            return (
              <Link
                key={row.status}
                href={`/admin/complaints?status=${row.status}`}
                className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-[#FAF6FB] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${row.dotClass}`}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {row.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {row.count}
                  </span>
                  <StatusIcon className="w-3.5 h-3.5 text-[#7B2D8E]/60" aria-hidden="true" />
                </div>
              </Link>
            )
          })}
        </div>

        {recentTickets.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-2">
              <Ticket className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              No support tickets yet
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Customer tickets and support messages will appear here with their live status.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentTickets.map((ticket) => {
              const sMeta = getTicketStatusMeta(ticket.status)
              const pMeta = getTicketPriorityMeta(ticket.priority)
              return (
                <li key={`${ticket.source}-${ticket.id}`}>
                  <Link
                    href={`/admin/complaints/${ticket.id}?source=${ticket.source}`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 hover:bg-[#FAF6FB]/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ticket.ticketId ? (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-gray-700 border border-gray-200">
                            {ticket.ticketId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 border border-gray-200">
                            Contact
                          </span>
                        )}
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-[#7B2D8E] truncate transition-colors">
                          {ticket.subject}
                        </p>
                      </div>
                      <p className="text-[11.5px] text-gray-500 mt-0.5 truncate">
                        {ticket.customerName}
                        {ticket.customerEmail ? ` · ${ticket.customerEmail}` : ''}
                        {ticket.category
                          ? ` · ${ticket.category.replace(/_/g, ' ')}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {ticket.priority !== 'normal' && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${pMeta.badgeClass}`}
                          >
                            {pMeta.label}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${sMeta.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              sMeta.key === 'resolved' ? 'bg-white' : sMeta.dotClass
                            }`}
                            aria-hidden="true"
                          />
                          {sMeta.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
                        {formatRelativeTimestamp(ticket.updatedAt || ticket.createdAt)}
                      </span>
                      <ChevronRight
                        className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E] transition-colors hidden sm:block"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Live Support Staff Ratings & Customer Feedback */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Star className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                Live support staff ratings &amp; feedback
              </h2>
              <p className="text-xs text-gray-500">
                {stats?.liveChatRatings && stats.liveChatRatings.ratedCount > 0 ? (
                  <>
                    <span className="tabular-nums font-semibold text-[#7B2D8E]">
                      {stats.liveChatRatings.avgRating.toFixed(1)}/5
                    </span>{' '}
                    average across{' '}
                    <span className="tabular-nums font-medium text-gray-700">
                      {stats.liveChatRatings.ratedCount}
                    </span>{' '}
                    rated chat{stats.liveChatRatings.ratedCount === 1 ? '' : 's'}
                    <span aria-hidden="true"> · </span>
                    <span className="tabular-nums">
                      {stats.liveChatRatings.positiveCount} helpful
                    </span>
                    {stats.liveChatRatings.negativeCount > 0 && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums text-gray-700">
                          {stats.liveChatRatings.negativeCount} flagged
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  'Customer ratings and feedback per attending representative'
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/live-chat"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:underline whitespace-nowrap"
          >
            View all in Live Chat
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!stats?.liveChatRatings || stats.liveChatRatings.ratedCount === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-2">
              <Star className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              No live chat ratings yet
            </p>
            <p className="text-xs text-gray-500 mt-1">
              When customers rate a live support chat, per-staff scores and comments will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            {/* Staff Rating Leaderboard */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Representative scores
                </h3>
                <span className="text-[11px] text-gray-400 tabular-nums">
                  {stats.liveChatRatings.staffSummary.length} rep
                  {stats.liveChatRatings.staffSummary.length === 1 ? '' : 's'}
                </span>
              </div>

              {stats.liveChatRatings.staffSummary.length === 0 ? (
                <p className="text-xs text-gray-400 py-4">
                  Ratings have not been linked to an individual representative yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {stats.liveChatRatings.staffSummary.map((rep) => (
                    <li
                      key={rep.staffId}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={rep.staffAvatarUrl}
                          alt={rep.staffName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-[#7B2D8E]/20 bg-[#FAF6FB] shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/staff/${rep.staffId}`}
                            className="block text-xs font-semibold text-gray-900 hover:text-[#7B2D8E] truncate"
                          >
                            {rep.staffName}
                          </Link>
                          <p className="text-[11px] text-gray-500 tabular-nums truncate">
                            {rep.ratingsCount} rating{rep.ratingsCount === 1 ? '' : 's'} · {rep.positiveCount} helpful
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 rounded-lg bg-[#FAF6FB] border border-[#7B2D8E]/20 px-2 py-1">
                        <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                        <span className="text-xs font-semibold text-gray-900 tabular-nums">
                          {rep.avgRating.toFixed(1)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Feedback on Staff */}
            <div className="lg:col-span-2 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Recent customer feedback
                </h3>
                <span className="text-[11px] text-gray-400 tabular-nums">
                  Latest {stats.liveChatRatings.recentFeedback.length}
                </span>
              </div>

              {stats.liveChatRatings.recentFeedback.length === 0 ? (
                <p className="text-xs text-gray-400 py-4">
                  No recent comments submitted.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {stats.liveChatRatings.recentFeedback.map((fb) => {
                    const parsed = parseLiveChatFeedbackComment(fb.comment)
                    const isPositive = fb.rating >= 4
                    const isNegative = fb.rating <= 2
                    return (
                      <li
                        key={fb.sessionId}
                        className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {fb.staffAvatarUrl ? (
                              <img
                                src={fb.staffAvatarUrl}
                                alt={fb.staffName || 'Representative'}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover border border-[#7B2D8E]/20 bg-[#FAF6FB] shrink-0"
                              />
                            ) : (
                              <span className="w-7 h-7 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[11px] font-semibold text-[#7B2D8E] inline-flex items-center justify-center shrink-0">
                                {(fb.staffName || 'S').slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-semibold text-gray-900 truncate">
                                  {fb.staffName || 'Unassigned rep'}
                                </span>
                                <span aria-hidden="true" className="text-gray-300">
                                  ·
                                </span>
                                <span className="text-gray-500 truncate">
                                  by {fb.customerName}
                                </span>
                                <span className="font-mono text-[10.5px] text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 tabular-nums">
                                  {fb.supportCode}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="inline-flex items-center gap-0.5"
                              aria-label={`${fb.rating} out of 5 stars`}
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star
                                  key={n}
                                  className={`w-3.5 h-3.5 ${
                                    n <= fb.rating
                                      ? 'fill-[#7B2D8E] text-[#7B2D8E]'
                                      : 'text-gray-200'
                                  }`}
                                />
                              ))}
                            </span>
                            {(isPositive || isNegative) && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold ${
                                  isPositive
                                    ? 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/25'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                {isPositive ? (
                                  <ThumbsUp className="w-3 h-3" />
                                ) : (
                                  <ThumbsDown className="w-3 h-3" />
                                )}
                                {isPositive ? 'Helpful' : 'Needs review'}
                              </span>
                            )}
                          </div>
                        </div>

                        {(parsed.reasons.length > 0 || parsed.note) && (
                          <div className="pl-9 space-y-1.5">
                            {parsed.reasons.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {parsed.reasons.map((reason) => (
                                  <span
                                    key={reason}
                                    className="inline-flex items-center rounded-md bg-[#FAF6FB] border border-[#7B2D8E]/20 px-2 py-0.5 text-[11px] font-medium text-[#7B2D8E]"
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}
                            {parsed.note && (
                              <p className="text-xs text-gray-600 leading-relaxed">
                                &ldquo;{parsed.note}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        <div className="pl-9 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                          <span className="tabular-nums">
                            {formatRelativeTimestamp(fb.ratedAt)}
                          </span>
                          <Link
                            href={`/admin/live-chat?session=${fb.sessionId}`}
                            className="font-semibold text-[#7B2D8E] hover:underline inline-flex items-center gap-0.5"
                          >
                            View chat
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Sales — monthly Gross / Tax / Net mix.
          --------------------------------------------------------
          Mirrors the Sales card on the staff /reports page so the
          two surfaces tell the same story in the same colours. The
          headline number ("₦12.4M this month") plus the period
          delta sit in the card header so the chart still
          communicates even when the user only glances at the top
          of the card. We render an empty state instead of an axis
          full of "0k" labels when no paid bookings exist yet —
          this was a frequent mobile complaint on /reports. */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 border-b border-gray-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#7B2D8E]" />
              <h2 className="text-sm font-semibold text-gray-900">Sales</h2>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-semibold text-gray-900 tabular-nums tracking-tight">
                {formatNaira(revenue?.grossThisMonth ?? 0)}
              </span>
              {revenue && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5 ${
                    revenue.growth >= 0
                      ? 'text-[#7B2D8E] bg-[#7B2D8E]/10'
                      : 'text-gray-700 bg-gray-100'
                  }`}
                >
                  {revenue.growth >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(revenue.growth)}%
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Last 12 months · gross vs tax vs net
            </p>
          </div>
          <ul className="flex items-center gap-2.5 text-[10.5px] text-gray-500">
            <li className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#E5D6EB]" /> Gross
            </li>
            <li className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#C9A4D6]" /> Taxes
            </li>
            <li className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-[#7B2D8E]" /> Net
            </li>
          </ul>
        </div>
        <div className="p-2 sm:p-4">
          {(() => {
            const data = charts?.salesTrend ?? []
            const hasData = data.some(
              (d) => d.gross + d.tax + d.net > 0,
            )
            if (!hasData) {
              return (
                <div className="h-44 flex flex-col items-center justify-center text-center px-3">
                  <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mb-2">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    No sales yet
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-xs">
                    Bars will appear here once paid bookings are recorded.
                  </p>
                </div>
              )
            }
            return (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} barCategoryGap={10} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    tickFormatter={(v) => formatNaira(Number(v))}
                  />
                  <Tooltip
                    formatter={(v: number) => formatNaira(Number(v))}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #E5E7EB',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="gross" fill="#E5D6EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tax" fill="#C9A4D6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" fill="#7B2D8E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      </section>

      {/* Operations overview — Revenue, Staff performance, Platform
          health, Security log. Sits between Sales (which is a 12-month
          historical look) and Quick Actions (which is task-oriented),
          so this section is the "now" pane: what's earning today, who
          is producing, is the platform healthy, are we being attacked. */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#7B2D8E]" />
            <h2 className="text-sm font-semibold text-gray-900">
              Operations overview
            </h2>
          </div>
        </div>
        <AdminOpsOverview />
      </section>

      {/*
        Operations panel — Revenue overview, Staff performance,
        Platform health, Security log. Backed by the unified
        /api/admin/operations endpoint, refreshes every 30 seconds.
      */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Operations
          </h2>
        </div>
        <OperationsPanel />
      </section>

      {/* Newsletter Subscribers — surfaces recent mailing list signups
          right on the main admin dashboard so admins see new
          subscribers immediately alongside users and bookings. */}
      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                Newsletter subscribers
              </h2>
              <p className="text-xs text-gray-500">
                <span className="tabular-nums font-medium text-gray-700">
                  {(stats?.newsletter?.active ?? 0).toLocaleString()}
                </span>{' '}
                active
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums">
                  {(stats?.newsletter?.thisWeek ?? 0).toLocaleString()}
                </span>{' '}
                new this week
                {(stats?.newsletter?.todayNew ?? 0) > 0 && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span className="tabular-nums font-medium text-[#7B2D8E]">
                      {stats?.newsletter?.todayNew} today
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/newsletter"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:underline whitespace-nowrap"
          >
            Manage subscribers
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {(() => {
          const recent = stats?.newsletter?.recentSubscribers ?? []
          if (recent.length === 0) {
            return (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-gray-900">
                  No newsletter subscribers yet
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  People who subscribe on the site or newsletter popup will appear here.
                </p>
              </div>
            )
          }
          return (
            <ul className="divide-y divide-gray-100">
              {recent.map((sub) => {
                const fullName = [sub.firstName, sub.lastName]
                  .filter(Boolean)
                  .join(' ')
                  .trim()
                const dateLabel = sub.createdAt
                  ? new Date(sub.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'
                return (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {sub.email}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {fullName ? `${fullName} · ` : ''}
                        Source: {sub.source}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] font-medium text-[#7B2D8E] capitalize">
                        {sub.status}
                      </span>
                      <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">
                        {dateLabel}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        })()}
      </section>

      {/* Quick Actions */}
      <section>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[#7B2D8E]" />
            <h2 className="text-sm font-semibold text-gray-900">
              Quick actions
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group relative overflow-hidden flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-gray-200 bg-white hover:border-[#7B2D8E]/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 group-hover:bg-[#7B2D8E] flex items-center justify-center flex-shrink-0 transition-colors">
                  <action.icon className="w-4 h-4 text-[#7B2D8E] group-hover:text-white transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {action.label}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{action.sub}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
