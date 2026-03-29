'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { 
  Users, Calendar, MessageSquare, Gift, Star, 
  TrendingUp, TrendingDown, Activity, UserCog,
  ArrowRight, Clock
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

const COLORS = {
  purple: '#7B2D8E',
  purpleLight: '#9B4DB0',
  green: '#10B981',
  red: '#EF4444',
  blue: '#3B82F6',
  orange: '#F59E0B',
  gray: '#6B7280',
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
        <div className="animate-spin w-8 h-8 border-4 border-[#7B2D8E] border-t-transparent rounded-full" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      change: stats?.users.growth || 0,
      changeLabel: 'from last month',
      icon: Users,
      color: 'bg-[#7B2D8E]',
      href: '/admin/users'
    },
    {
      title: 'Pending Consultations',
      value: stats?.consultations.pending || 0,
      subtitle: `${stats?.consultations.thisWeek || 0} this week`,
      icon: Calendar,
      color: 'bg-blue-500',
      href: '/admin/consultations'
    },
    {
      title: 'Open Complaints',
      value: stats?.complaints.open || 0,
      subtitle: `${stats?.complaints.resolved || 0} resolved`,
      icon: MessageSquare,
      color: 'bg-orange-500',
      href: '/admin/complaints'
    },
    {
      title: 'Gift Card Requests',
      value: stats?.giftCards.pending || 0,
      subtitle: `N${(stats?.giftCards.totalValue || 0).toLocaleString()} total value`,
      icon: Gift,
      color: 'bg-green-500',
      href: '/admin/gift-cards'
    },
    {
      title: 'Survey Responses',
      value: stats?.surveys.total || 0,
      subtitle: `${(stats?.surveys.avgRating || 0).toFixed(1)} avg rating`,
      icon: Star,
      color: 'bg-yellow-500',
      href: '/admin/surveys'
    },
    {
      title: 'Staff Members',
      value: stats?.staff.total || 0,
      subtitle: 'Active staff',
      icon: UserCog,
      color: 'bg-indigo-500',
      href: '/admin/staff'
    },
  ]

  // Prepare complaint status data for pie chart
  const complaintData = [
    { name: 'Open', value: stats?.complaints.open || 0, color: COLORS.orange },
    { name: 'Resolved', value: stats?.complaints.resolved || 0, color: COLORS.green },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s an overview of your business.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
                    {stat.change !== undefined && (
                      <div className="flex items-center gap-1 mt-2">
                        {stat.change >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-xs font-medium ${stat.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stat.change >= 0 ? '+' : ''}{stat.change}%
                        </span>
                        <span className="text-xs text-gray-400">{stat.changeLabel}</span>
                      </div>
                    )}
                    {stat.subtitle && (
                      <p className="text-xs text-gray-400 mt-2">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registration Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Registrations</CardTitle>
            <CardDescription>New users over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: 'New Users',
                  color: COLORS.purple,
                },
              }}
              className="h-[250px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts?.userTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke={COLORS.purple}
                    strokeWidth={2}
                    dot={{ fill: COLORS.purple, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Complaints Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complaints Overview</CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complaintData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {complaintData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {complaintData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              href="/admin/staff" 
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#7B2D8E]/10">
                  <UserCog className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-[#7B2D8E]">Invite Staff</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E]" />
            </Link>

            <Link 
              href="/admin/gift-cards" 
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Gift className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-[#7B2D8E]">Review Gift Cards</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E]" />
            </Link>

            <Link 
              href="/admin/complaints" 
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-[#7B2D8E]">Handle Complaints</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E]" />
            </Link>

            <Link 
              href="/admin/activity" 
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-[#7B2D8E]">View Activity</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#7B2D8E]" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
