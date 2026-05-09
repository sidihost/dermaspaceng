'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, Calendar, MessageSquare, Gift, Star,
  ArrowUpRight, ArrowDownRight, UserCog,
  ChevronRight, Activity, Inbox, LayoutGrid,
  TrendingUp, Clock, CheckCircle2, Bell,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useAdminStats } from '@/hooks/use-stats'
import { StatsBarChart } from '@/components/charts/stats-bar-chart'

export default function AdminDashboard() {
  const { user } = useAuth()
  // SWR: instant render with cached data, refresh on tab focus,
  // 30s background poll. Server-side cache invalidation in
  // lib/stats-cache.ts makes those polls return fresh aggregates
  // the moment any write happens (signup, booking change, gift
  // card approval, etc.).
  const { data, isLoading } = useAdminStats()
  const stats = data?.stats
  const charts = data?.charts

  // Personalised first-name greeting. Falls back to a generic
  // "Admin" only if /api/auth/me hasn't hydrated yet — once it
  // does, the hero re-renders with "Itunu", "Franca", etc. so the
  // dashboard reads like a console *for them* rather than a
  // generic admin shell.
  const adminName = user?.firstName?.trim() || 'Admin'

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  if (isLoading && !stats) {
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
      label: 'Staff members',
      value: stats?.staff.total ?? 0,
      sublabel: 'Active on the platform',
      icon: UserCog,
      href: '/admin/staff',
    },
  ]

  const totalComplaints = (stats?.complaints.open ?? 0) + (stats?.complaints.resolved ?? 0)
  const resolutionRate = totalComplaints > 0
    ? Math.round(((stats?.complaints.resolved ?? 0) / totalComplaints) * 100)
    : 0

  const complaintData = [
    { name: 'Resolved', value: stats?.complaints.resolved ?? 0, color: '#7B2D8E' },
    { name: 'Open', value: stats?.complaints.open ?? 0, color: '#F3E8F7' },
  ]

  const quickActions = [
    { label: 'Invite staff', sub: 'Add team members', href: '/admin/staff', icon: UserCog },
    { label: 'Gift cards', sub: 'Review requests', href: '/admin/gift-cards', icon: Gift },
    { label: 'Support', sub: 'Messages & tickets', href: '/admin/complaints', icon: MessageSquare },
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#5A1D6A] px-4 py-2 text-sm font-medium hover:bg-white/95 transition-colors"
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

            {/* Snapshot cards — tighter padding and a calmer type scale so
                the right side of the hero doesn't dominate the greeting. */}
            <div className="grid grid-cols-3 gap-2 lg:min-w-[340px]">
              {highlights.map((h) => (
                <div
                  key={h.label}
                  className="rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 p-2.5 sm:p-3"
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-white/70 uppercase tracking-wide">
                    <h.icon className="w-3 h-3" />
                    <span className="truncate">This week</span>
                  </div>
                  <p className="mt-1 text-lg sm:text-xl font-semibold tabular-nums">
                    {h.value.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[10px] sm:text-[11px] text-white/70 truncate">
                    {h.label}
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

          // Success card and action cards now share the same shell —
          // same rounded-2xl radius, same padding (p-3.5 sm:p-4),
          // same brand-purple left accent bar, same white background
          // and hairline border. The team flagged that the success
          // and action variants felt like two different components;
          // they should read as the same module flipping between
          // "all clear" and "items waiting" modes.
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
                      No pending consultations, complaints or gift-card
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
                  className="group relative rounded-2xl border border-[#7B2D8E]/20 bg-white p-3.5 sm:p-4 hover:border-[#7B2D8E]/40 hover:shadow-md hover:shadow-[#7B2D8E]/5 transition-all overflow-hidden"
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

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 hover:border-[#7B2D8E]/30 hover:shadow-md hover:shadow-[#7B2D8E]/5 transition-all focus:outline-none focus:ring-2 focus:ring-[#7B2D8E] focus:ring-offset-2"
            >
              {/* Hover accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-[#7B2D8E] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
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
                        : 'text-rose-600 bg-rose-50'
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
              <p className="mt-1.5 text-xs text-gray-500 truncate">{stat.sublabel}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* User Registrations - takes 2 cols. Switched from area to
            bar chart so each day's signups read as a discrete count
            rather than a smoothed curve — admins compare day-vs-day,
            not the gradient. The gradient bars share the brand-purple
            palette with every other dashboard chart. */}
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
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7B2D8E] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#7B2D8E]" />
              </span>
              Live
            </div>
          </div>
          <div className="p-2 sm:p-4">
            <StatsBarChart
              data={charts?.userTrend ?? []}
              xKey="date"
              xTickFormatter={(value) =>
                new Date(value).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }
              series={[{ dataKey: 'count', label: 'New signups' }]}
              ariaLabel="User registrations over the last 30 days"
              height={240}
            />
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Complaint resolution
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">Current status breakdown</p>
          </div>
          <div className="p-4">
            <div className="relative h-[180px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complaintData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {complaintData.map((entry, index) => (
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
            <div className="mt-4 space-y-2">
              {complaintData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700 font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bookings trend — last 8 weeks, broken out by status. Lives
          below the charts row because it's a wider single-row chart;
          stacked bars let admins eyeball completed vs upcoming vs
          cancelled at a glance without flipping a toggle. Only renders
          when the bookings table exists in this environment (the API
          returns an empty array on legacy DBs that haven't run
          migration 300). */}
      {charts?.bookingsTrend && charts.bookingsTrend.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Bookings — last 8 weeks
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Completed vs upcoming vs cancelled, by week
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
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-gray-300" />
                Cancelled
              </span>
            </div>
          </div>
          <div className="p-2 sm:p-4">
            <StatsBarChart
              data={charts.bookingsTrend}
              xKey="week"
              xTickFormatter={(value) =>
                new Date(value).toLocaleDateString('en-NG', {
                  month: 'short',
                  day: 'numeric',
                })
              }
              series={[
                { dataKey: 'completed', label: 'Completed', color: '#7B2D8E' },
                { dataKey: 'upcoming', label: 'Upcoming', color: '#C084FC' },
                { dataKey: 'cancelled', label: 'Cancelled', color: '#D1D5DB' },
              ]}
              ariaLabel="Booking volume per week, last 8 weeks, broken out by status"
              height={260}
            />
          </div>
        </section>
      )}

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
              className="group relative overflow-hidden flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-gray-200 bg-white hover:border-[#7B2D8E]/40 hover:shadow-md hover:shadow-[#7B2D8E]/5 transition-all"
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
