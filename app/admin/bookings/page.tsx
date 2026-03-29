'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, Search, Filter, X,
  User, Mail, Phone, MapPin, Eye, CheckCircle, XCircle, AlertCircle,
  CalendarDays, CalendarClock, DollarSign, MoreVertical, Download,
  Pencil, Trash2, Send, Plus, RefreshCw
} from 'lucide-react'

interface Booking {
  id: string
  client_id: string
  client_name: string
  client_email: string
  client_phone: string
  service_id: string
  service_name: string
  service_category: string
  service_price: number
  service_duration: number
  staff_id: string | null
  staff_name: string | null
  booking_date: string
  booking_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
  notes: string | null
  created_at: string
  updated_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Stats {
  total: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  todayBookings: number
  weekBookings: number
  revenue: number
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle },
}

const paymentStatusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  paid: { label: 'Paid', color: 'bg-green-50 text-green-600 border-green-200' },
  refunded: { label: 'Refunded', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-600 border-red-200' },
}

// Mock data for demonstration
const mockBookings: Booking[] = [
  {
    id: '1',
    client_id: 'c1',
    client_name: 'Sarah Johnson',
    client_email: 'sarah@email.com',
    client_phone: '+234 801 234 5678',
    service_id: 's1',
    service_name: 'Facial Treatment',
    service_category: 'Skincare',
    service_price: 25000,
    service_duration: 60,
    staff_id: 'st1',
    staff_name: 'Dr. Amina',
    booking_date: '2026-03-30',
    booking_time: '10:00',
    status: 'confirmed',
    payment_status: 'paid',
    notes: 'First time client',
    created_at: '2026-03-28T10:00:00Z',
    updated_at: '2026-03-28T10:00:00Z',
  },
  {
    id: '2',
    client_id: 'c2',
    client_name: 'Michael Okonkwo',
    client_email: 'michael@email.com',
    client_phone: '+234 802 345 6789',
    service_id: 's2',
    service_name: 'Acne Treatment',
    service_category: 'Treatment',
    service_price: 35000,
    service_duration: 90,
    staff_id: 'st2',
    staff_name: 'Dr. Chidi',
    booking_date: '2026-03-30',
    booking_time: '14:00',
    status: 'pending',
    payment_status: 'pending',
    notes: null,
    created_at: '2026-03-28T12:00:00Z',
    updated_at: '2026-03-28T12:00:00Z',
  },
  {
    id: '3',
    client_id: 'c3',
    client_name: 'Fatima Ahmed',
    client_email: 'fatima@email.com',
    client_phone: '+234 803 456 7890',
    service_id: 's3',
    service_name: 'Chemical Peel',
    service_category: 'Advanced',
    service_price: 50000,
    service_duration: 120,
    staff_id: null,
    staff_name: null,
    booking_date: '2026-03-31',
    booking_time: '11:00',
    status: 'pending',
    payment_status: 'pending',
    notes: 'Sensitive skin',
    created_at: '2026-03-28T14:00:00Z',
    updated_at: '2026-03-28T14:00:00Z',
  },
  {
    id: '4',
    client_id: 'c4',
    client_name: 'Grace Adeyemi',
    client_email: 'grace@email.com',
    client_phone: '+234 804 567 8901',
    service_id: 's1',
    service_name: 'Facial Treatment',
    service_category: 'Skincare',
    service_price: 25000,
    service_duration: 60,
    staff_id: 'st1',
    staff_name: 'Dr. Amina',
    booking_date: '2026-03-29',
    booking_time: '09:00',
    status: 'completed',
    payment_status: 'paid',
    notes: null,
    created_at: '2026-03-25T10:00:00Z',
    updated_at: '2026-03-29T10:00:00Z',
  },
  {
    id: '5',
    client_id: 'c5',
    client_name: 'David Eze',
    client_email: 'david@email.com',
    client_phone: '+234 805 678 9012',
    service_id: 's4',
    service_name: 'Consultation',
    service_category: 'Basic',
    service_price: 10000,
    service_duration: 30,
    staff_id: 'st2',
    staff_name: 'Dr. Chidi',
    booking_date: '2026-03-29',
    booking_time: '15:00',
    status: 'cancelled',
    payment_status: 'refunded',
    notes: 'Client cancelled',
    created_at: '2026-03-26T12:00:00Z',
    updated_at: '2026-03-28T08:00:00Z',
  },
]

const mockStats: Stats = {
  total: 156,
  pending: 12,
  confirmed: 28,
  completed: 98,
  cancelled: 18,
  todayBookings: 8,
  weekBookings: 45,
  revenue: 1250000,
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(mockBookings)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: mockBookings.length, totalPages: 1 })
  const [stats, setStats] = useState<Stats>(mockStats)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)

  // Filter bookings based on search and filters
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !search || 
      booking.client_name.toLowerCase().includes(search.toLowerCase()) ||
      booking.client_email.toLowerCase().includes(search.toLowerCase()) ||
      booking.service_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || booking.status === statusFilter
    const matchesDate = !dateFilter || booking.booking_date === dateFilter
    return matchesSearch && matchesStatus && matchesDate
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const updateBookingStatus = (bookingId: string, newStatus: Booking['status']) => {
    setBookings(prev => prev.map(b => 
      b.id === bookingId ? { ...b, status: newStatus, updated_at: new Date().toISOString() } : b
    ))
    setActionMenuId(null)
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking(prev => prev ? { ...prev, status: newStatus } : null)
    }
  }

  const exportBookings = () => {
    const headers = ['Client', 'Email', 'Phone', 'Service', 'Date', 'Time', 'Status', 'Payment', 'Amount']
    const rows = filteredBookings.map(b => [
      b.client_name,
      b.client_email,
      b.client_phone,
      b.service_name,
      b.booking_date,
      b.booking_time,
      b.status,
      b.payment_status,
      b.service_price,
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings Management</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage all appointment bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportBookings}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.todayBookings}</p>
                <p className="text-sm text-gray-500">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <CalendarClock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.weekBookings}</p>
                <p className="text-sm text-gray-500">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-yellow-100">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue).replace('NGN', '').trim()}</p>
                <p className="text-sm text-gray-500">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by client name, email, or service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
              />
              {(statusFilter || dateFilter || search) && (
                <button
                  onClick={() => { setStatusFilter(''); setDateFilter(''); setSearch(''); }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Bookings</CardTitle>
              <CardDescription>{filteredBookings.length} bookings found</CardDescription>
            </div>
            <button
              onClick={() => setLoading(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const statusInfo = statusConfig[booking.status]
                    const paymentInfo = paymentStatusConfig[booking.payment_status]
                    return (
                      <TableRow key={booking.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-[#7B2D8E]">
                                {booking.client_name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{booking.client_name}</p>
                              <p className="text-sm text-gray-500">{booking.client_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{booking.service_name}</p>
                            <p className="text-sm text-gray-500">{booking.service_duration} mins</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-900">{formatDate(booking.booking_date)}</p>
                              <p className="text-sm text-gray-500">{booking.booking_time}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {booking.staff_name ? (
                            <span className="text-sm text-gray-700">{booking.staff_name}</span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={paymentInfo.color}>
                            {paymentInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900">{formatCurrency(booking.service_price)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === booking.id ? null : booking.id)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            {actionMenuId === booking.id && (
                              <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                                <button
                                  onClick={() => setSelectedBooking(booking)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                {booking.status === 'pending' && (
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Confirm
                                  </button>
                                )}
                                {booking.status === 'confirmed' && (
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'in_progress')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50"
                                  >
                                    <Clock className="w-4 h-4" />
                                    Start Session
                                  </button>
                                )}
                                {booking.status === 'in_progress' && (
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'completed')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Complete
                                  </button>
                                )}
                                {['pending', 'confirmed'].includes(booking.status) && (
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Cancel
                                  </button>
                                )}
                                <button
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Send className="w-4 h-4" />
                                  Send Reminder
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">Booking Details</h3>
                <p className="text-sm text-gray-500">ID: {selectedBooking.id}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Client Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Client Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-[#7B2D8E]">
                          {selectedBooking.client_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedBooking.client_name}</p>
                        <p className="text-sm text-gray-500">Client</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{selectedBooking.client_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedBooking.client_phone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Appointment Details</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{formatDate(selectedBooking.booking_date)} at {selectedBooking.booking_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{selectedBooking.service_duration} minutes</span>
                    </div>
                    {selectedBooking.staff_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Assigned to {selectedBooking.staff_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Service</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{selectedBooking.service_name}</p>
                    <p className="text-sm text-gray-500">{selectedBooking.service_category}</p>
                  </div>
                  <p className="text-xl font-bold text-[#7B2D8E]">{formatCurrency(selectedBooking.service_price)}</p>
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Booking Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateBookingStatus(selectedBooking.id, status)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                          selectedBooking.status === status
                            ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {statusConfig[status].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Payment Status</h4>
                  <Badge variant="outline" className={paymentStatusConfig[selectedBooking.payment_status].color + ' text-sm px-3 py-1'}>
                    {paymentStatusConfig[selectedBooking.payment_status].label}
                  </Badge>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
                <span>Created: {new Date(selectedBooking.created_at).toLocaleString()}</span>
                <span>Updated: {new Date(selectedBooking.updated_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                className="flex-1 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
