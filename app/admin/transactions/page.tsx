'use client'

/**
 * Admin transactions console.
 *
 * Lives inside `app/admin/layout.tsx`, which already provides the
 * sidebar + `<main className="lg:pl-72">` shell and centres content in
 * a `max-w-[1400px]` container. This page therefore renders ONLY its
 * own content (no second sidebar / main) so it lines up edge-to-edge
 * with the rest of the console — the same width as Bookings, Users,
 * etc. (an earlier version double-wrapped the shell, which squeezed
 * the table into a narrow column).
 *
 * Layout:
 *   • Header with Reconcile / Export actions
 *   • Four KPI tiles (Revenue / Today / Pending / Failed)
 *   • A charts row — 7-day revenue trend (area) + payment-method mix
 *     (donut) — built from the loaded page of transactions
 *   • A full-width filter toolbar
 *   • A full-width transactions table (cards on mobile)
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  CreditCard,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Receipt,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Transaction {
  id: number
  user_id: number
  type: 'credit' | 'debit' | 'refund'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'wallet' | 'paystack' | 'bank_transfer' | 'cash'
  payment_reference: string | null
  paystack_reference: string | null
  description: string | null
  error_message: string | null
  created_at: string
  formattedAmount: string
  formattedDate: string
  user: {
    id: number
    name: string
    email: string
  } | null
}

interface TransactionStats {
  totalTransactions: number
  totalRevenue: number
  pendingAmount: number
  failedCount: number
  todayRevenue: number
  formattedTotalRevenue: string
  formattedPendingAmount: string
  formattedTodayRevenue: string
}

// Brand palette — kept tight so the whole console reads as one product.
const PLUM = '#7B2D8E'
const METHOD_COLORS: Record<string, string> = {
  paystack: '#7B2D8E',
  wallet: '#B254C4',
  bank_transfer: '#C98BD6',
  cash: '#E3C4EB',
}

export default function AdminTransactionsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [authReady, setAuthReady] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user.role !== 'admin' && data.user.role !== 'staff') {
            router.push('/dashboard')
            return
          }
          setAuthReady(true)
          await fetchTransactions()
        } else {
          router.push('/admin/login')
        }
      } catch {
        router.push('/admin/login')
      }
    }
    checkAuth()
  }, [router])

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', limit.toString())
      params.append('offset', ((page - 1) * limit).toString())
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)
      if (dateFrom) params.append('startDate', dateFrom)
      if (dateTo) params.append('endDate', dateTo)

      const res = await fetch(`/api/admin/transactions?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions)
        setStats(data.stats)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authReady) {
      fetchTransactions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter, dateFrom, dateTo])

  const handleSearch = () => {
    setPage(1)
    fetchTransactions()
  }

  // ---- Derived chart data (built from the loaded page) ------------------
  // 7-day revenue trend — sum of completed credit/refund amounts per day.
  const revenueTrend = useMemo(() => {
    const days: { key: string; label: string; revenue: number }[] = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days.push({
        key,
        label: d.toLocaleDateString('en-NG', { weekday: 'short' }),
        revenue: 0,
      })
    }
    const byKey = new Map(days.map((d) => [d.key, d]))
    for (const t of transactions) {
      if (t.status !== 'completed') continue
      if (t.type === 'debit') continue
      const key = new Date(t.created_at).toISOString().split('T')[0]
      const bucket = byKey.get(key)
      if (bucket) bucket.revenue += t.amount / 100
    }
    return days
  }, [transactions])

  // Payment-method mix across the loaded transactions.
  const methodMix = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of transactions) {
      counts.set(t.payment_method, (counts.get(t.payment_method) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([method, value]) => ({
      method,
      label: method.replace('_', ' '),
      value,
      fill: METHOD_COLORS[method] || PLUM,
    }))
  }, [transactions])

  const hasTrend = revenueTrend.some((d) => d.revenue > 0)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-[#7B2D8E]" />
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  // Credit/refund amounts use the brand purple (not green) so the whole
  // console stays on one palette. Debits stay neutral dark.
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'credit':
        return { color: 'text-[#7B2D8E]', prefix: '+', icon: <TrendingUp className="h-4 w-4" /> }
      case 'debit':
        return { color: 'text-gray-900', prefix: '-', icon: <TrendingDown className="h-4 w-4" /> }
      case 'refund':
        return { color: 'text-[#7B2D8E]', prefix: '+', icon: <RefreshCw className="h-4 w-4" /> }
      default:
        return { color: 'text-gray-600', prefix: '', icon: null }
    }
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'User', 'Type', 'Amount', 'Status', 'Payment Method', 'Reference', 'Description']
    const rows = transactions.map((t) => [
      t.id,
      t.formattedDate,
      t.user?.name || 'Unknown',
      t.type,
      t.formattedAmount,
      t.status,
      t.payment_method,
      t.payment_reference || t.paystack_reference || '-',
      t.description || '-',
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#7B2D8E]" />
            Transactions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor all payment transactions and wallet activities across every customer.
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2 self-start sm:self-auto">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </header>

      {/* KPI tiles */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiTile
            label="Total Revenue"
            value={stats.formattedTotalRevenue}
            icon={TrendingUp}
            tint="bg-[#7B2D8E]/10 text-[#7B2D8E]"
            delay={0}
          />
          <KpiTile
            label="Today"
            value={stats.formattedTodayRevenue}
            icon={Calendar}
            tint="bg-[#7B2D8E]/10 text-[#7B2D8E]"
            delay={0.05}
          />
          <KpiTile
            label="Pending"
            value={stats.formattedPendingAmount}
            icon={Clock}
            tint="bg-amber-100 text-amber-600"
            delay={0.1}
          />
          <KpiTile
            label="Failed"
            value={String(stats.failedCount)}
            icon={XCircle}
            tint="bg-red-100 text-red-600"
            delay={0.15}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Revenue trend</h2>
              <p className="text-xs text-gray-500">Completed inflow over the last 7 days</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/8 px-2.5 py-1 text-[11px] font-medium text-[#7B2D8E]">
              <TrendingUp className="h-3.5 w-3.5" />
              This week
            </span>
          </div>
          {hasTrend ? (
            <ChartContainer
              config={{ revenue: { label: 'Revenue', color: PLUM } }}
              className="h-[200px] w-full"
            >
              <AreaChart data={revenueTrend} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PLUM} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={PLUM} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F1F1F4" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(v) => `₦${v >= 1000 ? `${v / 1000}k` : v}`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={PLUM}
                  strokeWidth={2.5}
                  fill="url(#revFill)"
                  dot={{ r: 3, fill: PLUM, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-center">
              <TrendingUp className="h-8 w-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No completed revenue in this range yet.</p>
            </div>
          )}
        </motion.div>

        {/* Payment-method mix */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <h2 className="text-sm font-semibold text-gray-900">Payment methods</h2>
          <p className="text-xs text-gray-500 mb-2">Across loaded transactions</p>
          {methodMix.length > 0 ? (
            <div className="flex items-center gap-4">
              <ChartContainer config={{}} className="h-[160px] w-[160px] shrink-0">
                <PieChart>
                  <Pie
                    data={methodMix}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={42}
                    outerRadius={66}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {methodMix.map((m) => (
                      <Cell key={m.method} fill={m.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                </PieChart>
              </ChartContainer>
              <ul className="flex-1 space-y-2 min-w-0">
                {methodMix.map((m) => (
                  <li key={m.method} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: m.fill }}
                      />
                      <span className="capitalize text-gray-600 truncate">{m.label}</span>
                    </span>
                    <span className="font-semibold text-gray-900">{m.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center">
              <p className="text-sm text-gray-400">No data yet.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <div className="w-full sm:flex-1 sm:min-w-[220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by reference or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-[150px]"
              placeholder="From"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-[150px]"
              placeholder="To"
            />
          </div>

          <Button onClick={handleSearch} className="gap-2 w-full sm:w-auto bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white">
            <Filter className="h-4 w-4" />
            Apply filters
          </Button>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900">No transactions found</h3>
            <p className="text-gray-500 text-sm">Transactions will appear here once customers start making payments.</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="md:hidden divide-y divide-gray-100">
              {transactions.map((transaction) => {
                const typeStyle = getTypeStyles(transaction.type)
                return (
                  <li key={transaction.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/transactions/${transaction.id}`)}
                      className="w-full text-left px-4 py-4 active:bg-[#7B2D8E]/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {transaction.user?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {transaction.description || transaction.payment_method.replace('_', ' ')}
                          </p>
                        </div>
                        <span className={cn('text-sm font-bold whitespace-nowrap', typeStyle.color)}>
                          {typeStyle.prefix}
                          {transaction.formattedAmount}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border capitalize',
                            getStatusStyles(transaction.status)
                          )}
                        >
                          {getStatusIcon(transaction.status)}
                          {transaction.status}
                        </span>
                        <span className="text-[11px] text-gray-400">{transaction.formattedDate}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => {
                    const typeStyle = getTypeStyles(transaction.type)
                    return (
                      <motion.tr
                        key={transaction.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => router.push(`/admin/transactions/${transaction.id}`)}
                        className="border-b border-gray-50 hover:bg-[#7B2D8E]/5 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{transaction.formattedDate}</td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900">{transaction.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{transaction.user?.email || '-'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-600 truncate max-w-[240px]">{transaction.description || '-'}</p>
                          {transaction.error_message && (
                            <p className="text-xs text-red-500 truncate max-w-[240px]">{transaction.error_message}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            {typeStyle.icon}
                            <span className="text-sm capitalize">{transaction.type}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={cn('text-sm font-semibold whitespace-nowrap', typeStyle.color)}>
                            {typeStyle.prefix}
                            {transaction.formattedAmount}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize',
                                getStatusStyles(transaction.status)
                              )}
                            >
                              {getStatusIcon(transaction.status)}
                              {transaction.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                              {transaction.payment_method === 'wallet' ? (
                                <Wallet className="h-4 w-4" />
                              ) : (
                                <CreditCard className="h-4 w-4" />
                              )}
                              <span className="capitalize">{transaction.payment_method.replace('_', ' ')}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-center text-gray-300">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
              <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KpiTile — compact stat card matching the rest of the admin console.
// ---------------------------------------------------------------------------
function KpiTile({
  label,
  value,
  icon: Icon,
  tint,
  delay,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tint: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 truncate">{label}</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </motion.div>
  )
}
