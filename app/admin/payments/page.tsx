'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock,
  Search, Filter, Download, ChevronLeft, ChevronRight, Eye, X,
  RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  AlertCircle, RotateCcw, ExternalLink, Copy, Check
} from 'lucide-react'

interface Payment {
  id: string
  booking_id: string
  client_name: string
  client_email: string
  service_name: string
  amount: number
  payment_method: 'card' | 'bank_transfer' | 'cash' | 'paystack' | 'flutterwave'
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'processing'
  transaction_ref: string
  gateway_response: string | null
  created_at: string
  completed_at: string | null
}

interface PaymentError {
  id: string
  payment_id: string
  client_name: string
  client_email: string
  amount: number
  error_code: string
  error_message: string
  gateway: string
  card_type: string | null
  last_four: string | null
  created_at: string
  resolved: boolean
  resolution_note: string | null
}

interface Stats {
  totalRevenue: number
  todayRevenue: number
  pendingPayments: number
  failedPayments: number
  successRate: number
  averageTransaction: number
  monthlyGrowth: number
}

const mockPayments: Payment[] = [
  {
    id: '1',
    booking_id: 'b1',
    client_name: 'Sarah Johnson',
    client_email: 'sarah@email.com',
    service_name: 'Facial Treatment',
    amount: 25000,
    payment_method: 'paystack',
    status: 'completed',
    transaction_ref: 'PSK_TXN_123456789',
    gateway_response: 'Success',
    created_at: '2026-03-29T10:00:00Z',
    completed_at: '2026-03-29T10:00:30Z',
  },
  {
    id: '2',
    booking_id: 'b2',
    client_name: 'Michael Okonkwo',
    client_email: 'michael@email.com',
    service_name: 'Acne Treatment',
    amount: 35000,
    payment_method: 'card',
    status: 'pending',
    transaction_ref: 'TXN_987654321',
    gateway_response: null,
    created_at: '2026-03-29T12:00:00Z',
    completed_at: null,
  },
  {
    id: '3',
    booking_id: 'b3',
    client_name: 'Fatima Ahmed',
    client_email: 'fatima@email.com',
    service_name: 'Chemical Peel',
    amount: 50000,
    payment_method: 'flutterwave',
    status: 'failed',
    transaction_ref: 'FLW_ERR_456789',
    gateway_response: 'Insufficient funds',
    created_at: '2026-03-29T14:00:00Z',
    completed_at: null,
  },
  {
    id: '4',
    booking_id: 'b4',
    client_name: 'Grace Adeyemi',
    client_email: 'grace@email.com',
    service_name: 'Consultation',
    amount: 10000,
    payment_method: 'bank_transfer',
    status: 'completed',
    transaction_ref: 'BNK_TXN_111222333',
    gateway_response: 'Transfer confirmed',
    created_at: '2026-03-28T09:00:00Z',
    completed_at: '2026-03-28T09:30:00Z',
  },
  {
    id: '5',
    booking_id: 'b5',
    client_name: 'David Eze',
    client_email: 'david@email.com',
    service_name: 'Laser Treatment',
    amount: 75000,
    payment_method: 'paystack',
    status: 'refunded',
    transaction_ref: 'PSK_REF_444555666',
    gateway_response: 'Refund processed',
    created_at: '2026-03-27T15:00:00Z',
    completed_at: '2026-03-27T15:00:20Z',
  },
]

const mockPaymentErrors: PaymentError[] = [
  {
    id: 'e1',
    payment_id: '3',
    client_name: 'Fatima Ahmed',
    client_email: 'fatima@email.com',
    amount: 50000,
    error_code: 'INSUFFICIENT_FUNDS',
    error_message: 'The card has insufficient funds to complete this transaction',
    gateway: 'Flutterwave',
    card_type: 'Visa',
    last_four: '4521',
    created_at: '2026-03-29T14:00:00Z',
    resolved: false,
    resolution_note: null,
  },
  {
    id: 'e2',
    payment_id: 'p6',
    client_name: 'James Okoro',
    client_email: 'james@email.com',
    amount: 30000,
    error_code: 'CARD_DECLINED',
    error_message: 'Card was declined by the issuing bank',
    gateway: 'Paystack',
    card_type: 'Mastercard',
    last_four: '8876',
    created_at: '2026-03-28T11:00:00Z',
    resolved: true,
    resolution_note: 'Customer used different card',
  },
  {
    id: 'e3',
    payment_id: 'p7',
    client_name: 'Blessing Nweke',
    client_email: 'blessing@email.com',
    amount: 45000,
    error_code: 'NETWORK_ERROR',
    error_message: 'Connection timeout while processing payment',
    gateway: 'Paystack',
    card_type: null,
    last_four: null,
    created_at: '2026-03-28T16:30:00Z',
    resolved: false,
    resolution_note: null,
  },
]

const mockStats: Stats = {
  totalRevenue: 2450000,
  todayRevenue: 185000,
  pendingPayments: 8,
  failedPayments: 3,
  successRate: 94.5,
  averageTransaction: 32500,
  monthlyGrowth: 12.5,
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: RotateCcw },
}

const methodConfig = {
  card: { label: 'Card', icon: CreditCard },
  bank_transfer: { label: 'Bank Transfer', icon: DollarSign },
  cash: { label: 'Cash', icon: DollarSign },
  paystack: { label: 'Paystack', icon: CreditCard },
  flutterwave: { label: 'Flutterwave', icon: CreditCard },
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(mockPayments)
  const [paymentErrors, setPaymentErrors] = useState<PaymentError[]>(mockPaymentErrors)
  const [stats, setStats] = useState<Stats>(mockStats)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'payments' | 'errors'>('payments')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [selectedError, setSelectedError] = useState<PaymentError | null>(null)
  const [copied, setCopied] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !search || 
      payment.client_name.toLowerCase().includes(search.toLowerCase()) ||
      payment.transaction_ref.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || payment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredErrors = paymentErrors.filter(error => {
    const matchesSearch = !search || 
      error.client_name.toLowerCase().includes(search.toLowerCase()) ||
      error.error_code.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resolveError = (errorId: string, note: string) => {
    setPaymentErrors(prev => prev.map(e => 
      e.id === errorId ? { ...e, resolved: true, resolution_note: note } : e
    ))
    setSelectedError(null)
  }

  const exportPayments = () => {
    const headers = ['Client', 'Email', 'Service', 'Amount', 'Method', 'Status', 'Reference', 'Date']
    const rows = filteredPayments.map(p => [
      p.client_name,
      p.client_email,
      p.service_name,
      p.amount,
      p.payment_method,
      p.status,
      p.transaction_ref,
      p.created_at,
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Track all payments and handle transaction errors</p>
        </div>
        <button
          onClick={exportPayments}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.monthlyGrowth >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm ${stats.monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stats.monthlyGrowth}% this month
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.todayRevenue)}</p>
                <p className="text-sm text-gray-400 mt-1">{stats.pendingPayments} pending</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.successRate}%</p>
                <p className="text-sm text-gray-400 mt-1">{stats.failedPayments} failed</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Transaction</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.averageTransaction)}</p>
                <p className="text-sm text-gray-400 mt-1">Per booking</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-[#7B2D8E] text-[#7B2D8E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Payments
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'errors'
              ? 'border-[#7B2D8E] text-[#7B2D8E]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Payment Errors
          {paymentErrors.filter(e => !e.resolved).length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {paymentErrors.filter(e => !e.resolved).length}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'payments' ? "Search by client or reference..." : "Search by client or error code..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>
            {activeTab === 'payments' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
            <CardDescription>{filteredPayments.length} transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const statusInfo = statusConfig[payment.status]
                      const methodInfo = methodConfig[payment.payment_method]
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{payment.client_name}</p>
                              <p className="text-sm text-gray-500">{payment.client_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700">{payment.service_name}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <methodInfo.icon className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{methodInfo.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                              {payment.transaction_ref.slice(0, 15)}...
                            </code>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => setSelectedPayment(payment)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Errors Table */}
      {activeTab === 'errors' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Payment Errors
            </CardTitle>
            <CardDescription>
              {paymentErrors.filter(e => !e.resolved).length} unresolved errors
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredErrors.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <p className="text-gray-500">No payment errors found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Error Code</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredErrors.map((error) => (
                      <TableRow key={error.id} className={error.resolved ? 'opacity-60' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{error.client_name}</p>
                            <p className="text-sm text-gray-500">{error.client_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-gray-900">{formatCurrency(error.amount)}</span>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                            {error.error_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{error.gateway}</span>
                        </TableCell>
                        <TableCell>
                          {error.card_type && error.last_four ? (
                            <span className="text-sm text-gray-600">
                              {error.card_type} ****{error.last_four}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={error.resolved 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-red-50 text-red-700 border-red-200'
                            }
                          >
                            {error.resolved ? 'Resolved' : 'Unresolved'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {new Date(error.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelectedError(error)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Payment Details</h3>
              <button onClick={() => setSelectedPayment(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center pb-4 border-b border-gray-100">
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</p>
                <Badge variant="outline" className={statusConfig[selectedPayment.status].color + ' mt-2'}>
                  {statusConfig[selectedPayment.status].label}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium text-gray-900">{selectedPayment.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-medium text-gray-900">{selectedPayment.service_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium text-gray-900 capitalize">{selectedPayment.payment_method.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedPayment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Transaction Reference</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <code className="flex-1 text-sm text-gray-700">{selectedPayment.transaction_ref}</code>
                  <button
                    onClick={() => copyRef(selectedPayment.transaction_ref)}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              {selectedPayment.gateway_response && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Gateway Response</p>
                  <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">{selectedPayment.gateway_response}</p>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setSelectedPayment(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {selectedPayment.status === 'completed' && (
                <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Process Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">Payment Error Details</h3>
              </div>
              <button onClick={() => setSelectedError(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <code className="text-sm font-semibold text-red-700">{selectedError.error_code}</code>
                <p className="text-sm text-red-600 mt-1">{selectedError.error_message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium text-gray-900">{selectedError.client_name}</p>
                  <p className="text-sm text-gray-500">{selectedError.client_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium text-gray-900">{formatCurrency(selectedError.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gateway</p>
                  <p className="font-medium text-gray-900">{selectedError.gateway}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Card</p>
                  <p className="font-medium text-gray-900">
                    {selectedError.card_type && selectedError.last_four 
                      ? `${selectedError.card_type} ****${selectedError.last_four}`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              {selectedError.resolved && selectedError.resolution_note && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Resolution Note</p>
                  <p className="text-sm text-gray-700 p-3 bg-green-50 rounded-lg border border-green-100">
                    {selectedError.resolution_note}
                  </p>
                </div>
              )}

              {!selectedError.resolved && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Resolution Note</label>
                  <textarea
                    id="resolution-note"
                    placeholder="How was this error resolved?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                  />
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setSelectedError(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {!selectedError.resolved && (
                <button
                  onClick={() => {
                    const note = (document.getElementById('resolution-note') as HTMLTextAreaElement)?.value || 'Resolved'
                    resolveError(selectedError.id, note)
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
