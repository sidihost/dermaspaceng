'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import AdminSidebar from '@/components/admin/sidebar'
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
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function AdminTransactionsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('admin')
  
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

  // Selected transaction for details
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

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
          setUserName(`${data.user.firstName} ${data.user.lastName}`)
          setUserRole(data.user.role)
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
    if (userName) {
      fetchTransactions()
    }
  }, [page, statusFilter, typeFilter, dateFrom, dateTo])

  const handleSearch = () => {
    setPage(1)
    fetchTransactions()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
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
        return 'bg-green-50 text-green-700 border-green-200'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'credit':
        return { color: 'text-green-600', prefix: '+', icon: <TrendingUp className="h-4 w-4" /> }
      case 'debit':
        return { color: 'text-red-600', prefix: '-', icon: <TrendingDown className="h-4 w-4" /> }
      case 'refund':
        return { color: 'text-blue-600', prefix: '+', icon: <RefreshCw className="h-4 w-4" /> }
      default:
        return { color: 'text-gray-600', prefix: '', icon: null }
    }
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'User', 'Type', 'Amount', 'Status', 'Payment Method', 'Reference', 'Description']
    const rows = transactions.map(t => [
      t.id,
      t.formattedDate,
      t.user?.name || 'Unknown',
      t.type,
      t.formattedAmount,
      t.status,
      t.payment_method,
      t.payment_reference || t.paystack_reference || '-',
      t.description || '-'
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar userRole={userRole} userName={userName} />
      
      <main className="lg:pl-72 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500 mt-1">Monitor all payment transactions and wallet activities</p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-xl font-bold text-gray-900">{stats.formattedTotalRevenue}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Today</p>
                    <p className="text-xl font-bold text-gray-900">{stats.formattedTodayRevenue}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-xl font-bold text-gray-900">{stats.formattedPendingAmount}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Failed</p>
                    <p className="text-xl font-bold text-gray-900">{stats.failedCount}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
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
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
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
                <SelectTrigger className="w-[140px]">
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
                className="w-[140px]"
                placeholder="From"
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px]"
                placeholder="To"
              />

              <Button onClick={handleSearch} variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Apply
              </Button>

              <Button onClick={exportToCSV} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-[#7B2D8E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">No transactions found</h3>
                <p className="text-gray-500 text-sm">Transactions will appear here once customers start making payments.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction, index) => {
                        const typeStyle = getTypeStyles(transaction.type)
                        return (
                          <motion.tr
                            key={transaction.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {transaction.formattedDate}
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {transaction.user?.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {transaction.user?.email || '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-sm text-gray-600 truncate max-w-[200px]">
                                {transaction.description || '-'}
                              </p>
                              {transaction.error_message && (
                                <p className="text-xs text-red-500 truncate max-w-[200px]">
                                  {transaction.error_message}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5">
                                {typeStyle.icon}
                                <span className="text-sm capitalize text-gray-600">{transaction.type}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={cn('text-sm font-semibold', typeStyle.color)}>
                                {typeStyle.prefix}{transaction.formattedAmount}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-center">
                                <span className={cn(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                                  getStatusStyles(transaction.status)
                                )}>
                                  {getStatusIcon(transaction.status)}
                                  {transaction.status}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
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
                            <td className="px-4 py-4">
                              <div className="flex justify-center">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setSelectedTransaction(transaction)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} transactions
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
      </main>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTransaction(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Transaction ID</span>
                <span className="text-sm font-mono text-gray-900">#{selectedTransaction.id}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Date</span>
                <span className="text-sm text-gray-900">{selectedTransaction.formattedDate}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">User</span>
                <span className="text-sm text-gray-900">{selectedTransaction.user?.name || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm text-gray-900">{selectedTransaction.user?.email || '-'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm text-gray-900 capitalize">{selectedTransaction.type}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Amount</span>
                <span className={cn('text-sm font-semibold', getTypeStyles(selectedTransaction.type).color)}>
                  {getTypeStyles(selectedTransaction.type).prefix}{selectedTransaction.formattedAmount}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                  getStatusStyles(selectedTransaction.status)
                )}>
                  {getStatusIcon(selectedTransaction.status)}
                  {selectedTransaction.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Payment Method</span>
                <span className="text-sm text-gray-900 capitalize">{selectedTransaction.payment_method.replace('_', ' ')}</span>
              </div>
              
              {selectedTransaction.payment_reference && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Reference</span>
                  <span className="text-sm font-mono text-gray-900">{selectedTransaction.payment_reference}</span>
                </div>
              )}
              
              {selectedTransaction.paystack_reference && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Paystack Ref</span>
                  <span className="text-sm font-mono text-gray-900">{selectedTransaction.paystack_reference}</span>
                </div>
              )}
              
              {selectedTransaction.description && (
                <div>
                  <span className="text-sm text-gray-500">Description</span>
                  <p className="text-sm text-gray-900 mt-1">{selectedTransaction.description}</p>
                </div>
              )}
              
              {selectedTransaction.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-sm text-red-700 font-medium">Error</span>
                  <p className="text-sm text-red-600 mt-1">{selectedTransaction.error_message}</p>
                </div>
              )}
            </div>
            
            <Button
              onClick={() => setSelectedTransaction(null)}
              className="w-full mt-6"
            >
              Close
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
