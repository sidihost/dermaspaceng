'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip
} from 'recharts'
import {
  Users, Calendar, MessageSquare, Gift, Star,
  ArrowUpRight, ArrowDownRight, UserCog,
  ChevronRight, Activity, Inbox, Zap
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
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setCharts(data.charts)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-7 h-7 border-2 border-[#7B2D8E] border-t-transparent rounded-full" />
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total users',
      value: stats?.users.total ?? 0,
      delta: stats?.users.growth,
      deltaLabel: 'vs last month',
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Pending consultations',
      value: stats?.consultations.pending ?? 0,
      sublabel: `${stats?.consultations.thisWeek ?? 0} new this week`,
      icon: Calendar,
      href: '/admin/consultations',
    },
    {
      label: 'Open complaints',
      value: stats?.complaints.open ?? 0,
      sublabel: `${stats?.complaints.resolved ?? 0} resolved`,
      icon: Inbox,
      href: '/admin/complaints',
    },
    {
      label: 'Gift card requests',
      value: stats?.giftCards.pending ?? 0,
      sublabel: `₦${(stats?.giftCards.totalValue ?? 0).toLocaleString()} total value`,
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
      sublabel: 'Active on platform',
      icon: UserCog,
      href: '/admin/staff',
    },
  ]

  const complaintData = [
    { name: 'Open', value: stats?.complaints.open ?? 0, color: '#7B2D8E' },
    { name: 'Resolved', value: stats?.complaints.resolved ?? 0, color: '#E5E7EB' },
  ]

  const totalComplaints = (stats?.complaints.open ?? 0) + (stats?.complaints.resolved ?? 0)
  const resolutionRate = totalComplaints > 0
    ? Math.round(((stats?.complaints.resolved ?? 0) / totalComplaints) * 100)
    : 0

  const quickActions = [
    { label: 'Invite staff', href: '/admin/staff', icon: UserCog },
    { label: 'Gift cards', href: '/admin/gift-cards', icon: Gift },
    { label: 'Complaints', href: '/admin/complaints', icon: MessageSquare },
    { label: 'Activity log', href: '/admin/activity', icon: Activity },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-gray-200 pb-5 sm:pb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#7B2D8E]">
            Overview
          </p>
          <h1 className="mt-1 text-2xl sm:text-[28px] font-semibold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back. Here&apos;s what&apos;s happening across Dermaspace today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-medium">Live</span>
          <span className="text-gray-300">•</span>
          <span>
            Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      {/* Stats Grid */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group bg-white p-4 sm:p-5 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#7B2D8E]"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="text-[11px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">
                  {stat.label}
                </span>
                <stat.icon className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E] transition-colors flex-shrink-0" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-semibold text-gray-900 tabular-nums tracking-tight">
                  {stat.value.toLocaleString()}
                </span>
                {stat.delta !== undefined && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                      stat.delta >= 0 ? 'text-emerald-600' : 'text-red-500'
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
              <p className="mt-1.5 text-xs text-gray-500 truncate">
                {stat.sublabel ?? stat.deltaLabel ?? '\u00A0'}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* User Registrations - takes 2 cols */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">User registrations</h2>
              <p className="mt-0.5 text-xs text-gray-500">New signups over the last 30 days</p>
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 tabular-nums">
                {stats?.users.recent ?? 0}
              </p>
              <p className="text-[11px] text-gray-500">past 7 days</p>
            </div>
          </div>
          <div className="p-2 sm:p-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={charts?.userTrend ?? []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7B2D8E" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7B2D8E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
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
                  strokeWidth={2}
                  fill="url(#userGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Complaint resolution</h2>
            <p className="mt-0.5 text-xs text-gray-500">Current status breakdown</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="relative h-[160px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complaintData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
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
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {resolutionRate}%
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">resolved</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {complaintData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900 tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#7B2D8E]" />
            <h2 className="text-sm font-semibold text-gray-900">Quick actions</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-gray-200 bg-white hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 transition-colors">
                  <action.icon className="w-4 h-4 text-gray-600 group-hover:text-[#7B2D8E] transition-colors" />
                </div>
                <span className="text-sm font-medium text-gray-700 truncate">
                  {action.label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
