'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
} from 'recharts'
import {
  Users, Calendar, MessageSquare, Gift, Star,
  ArrowUpRight, ArrowDownRight, UserCog,
  ChevronRight, Activity, Inbox, LayoutGrid,
  TrendingUp, Clock,
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  users: { total: number; recent: number; growth: number }
  consultations: { total: number; pending: number; thisWeek: number }
  complaints: { total: number; open: number; resolved: number }
  giftCards: { total: number; pending: number; totalValue: number }
  surveys: { total: number; avgRating: number; thisWeek: number }
  staff: { total: number }
}

interface ChartData {
  userTrend: { date: string; count: number }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [charts, setCharts] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats')
        if (res.ok && isMounted) {
          const data = await res.json()
          setStats(data.stats)
          setCharts(data.charts)
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
    {/* Tighter vertical rhythm between sections — 20px mobile / 24px desktop
        instead of 24/32. The dashboard previously felt very "tall". */}
    <div className="space-y-5 sm:space-y-6">
      {/* Hero Header — rounded-2xl only (no jump to rounded-3xl) and a
          softer shadow so it sits flatter against the page. */}
      <section className="relative overflow-hidden rounded-2xl bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/15">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[#9B4DB0]/40 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
            aria-hidden
          />
        </div>

        {/* Hero padding tuned down one step — 20/24/32 instead of 20/32/40. */}
        <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="max-w-xl">
              {/* The "All systems operational" pulsing chip was removed — the
                  hero now opens directly with the greeting for a cleaner,
                  calmer feel. Real system status lives on the Settings page. */}
              {/* Hero title trimmed — no more step to 36/40px on wide screens.
                  Keeps the greeting calm, not a landing-page shout. */}
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-balance">
                {greeting}, Admin
              </h1>
              <p className="mt-1.5 text-sm text-white/80 text-pretty max-w-md">
                Here&apos;s a clear view of what&apos;s happening across Dermaspace
                today — users, consultations, complaints and more.
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
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7B2D8E" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#7B2D8E" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                    boxShadow: '0 10px 25px -5px rgba(123,45,142,0.1)',
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
                  fill="url(#userGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
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
