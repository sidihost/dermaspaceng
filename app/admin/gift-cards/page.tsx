'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Gift, Search, Filter, Eye, ChevronLeft, ChevronRight,
  User, Mail, Phone, Calendar, Clock, MessageSquare, X
} from 'lucide-react'

interface GiftCardRequest {
  id: number
  user_id: string | null
  amount: number
  design: string
  design_name: string
  occasion: string
  recipient_name: string
  recipient_email: string
  recipient_phone: string
  sender_name: string
  sender_email: string
  personal_message: string
  delivery_method: string
  delivery_date: string
  status: string
  assigned_to: string | null
  assigned_first_name: string | null
  assigned_last_name: string | null
  notes: string | null
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Brand-aligned, muted status colors. Uses the Dermaspace purple as the
// primary "done" signal, soft emerald for approved, amber for pending,
// sky for in-progress, and neutral gray for rejected — avoiding loud
// red/green/bright-purple badges.
const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-sky-50 text-sky-700 border-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-gray-100 text-gray-600 border-gray-200',
  completed: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
}

export default function GiftCardsPage() {
  const [requests, setRequests] = useState<GiftCardRequest[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<GiftCardRequest | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
      })
      const res = await fetch(`/api/admin/gift-cards?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests)
        setPagination(data.pagination)
        setStatusCounts(data.statusCounts)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleStatusChange = async (requestId: number, newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/gift-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'update_status', value: newStatus }),
      })
      if (res.ok) {
        fetchRequests()
        if (selectedRequest?.id === requestId) {
          setSelectedRequest({ ...selectedRequest, status: newStatus })
        }
      }
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setUpdating(false)
    }
  }

  const totalValue = requests.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gift card requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and process gift card requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {['pending', 'processing', 'approved', 'rejected', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(statusFilter === status ? '' : status)
              setPagination(p => ({ ...p, page: 1 }))
            }}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === status 
                ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-xl font-bold text-gray-900">{statusCounts[status] || 0}</p>
            <p className="text-xs text-gray-500 capitalize">{status}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All Requests</CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Gift className="w-4 h-4" />
            <span>Total Value: N{totalValue.toLocaleString()}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No gift card requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Occasion</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{request.recipient_name}</p>
                        <p className="text-sm text-gray-500">From: {request.sender_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-[#7B2D8E]">
                        N{request.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{request.occasion}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[request.status] || statusColors.pending}>
                        {request.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">Gift Card Request #{selectedRequest.id}</h3>
              <button onClick={() => setSelectedRequest(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Gift Card Preview */}
              {/* Solid brand fill instead of a purple->pink gradient — keeps the
                  gift-card preview on-brand and avoids the off-palette drift. */}
              <div className="bg-[#7B2D8E] rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium opacity-80">Dermaspace Gift Card</span>
                  <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                    {selectedRequest.occasion}
                  </Badge>
                </div>
                <p className="text-3xl font-bold">N{selectedRequest.amount.toLocaleString()}</p>
                <p className="text-sm opacity-80 mt-2">For: {selectedRequest.recipient_name}</p>
                <p className="text-xs opacity-60">From: {selectedRequest.sender_name}</p>
              </div>

              {/* Status Update */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'processing', 'approved', 'rejected', 'completed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedRequest.id, status)}
                      disabled={updating || selectedRequest.status === status}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedRequest.status === status
                          ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      } disabled:opacity-50`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Recipient</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{selectedRequest.recipient_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{selectedRequest.recipient_email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{selectedRequest.recipient_phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Sender</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{selectedRequest.sender_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{selectedRequest.sender_email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Delivery</h4>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="capitalize">{selectedRequest.delivery_method}</span>
                  </div>
                  {selectedRequest.delivery_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(selectedRequest.delivery_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Message */}
              {selectedRequest.personal_message && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Personal Message</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 italic">&quot;{selectedRequest.personal_message}&quot;</p>
                  </div>
                </div>
              )}

              {/* Request Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Submitted: {new Date(selectedRequest.created_at).toLocaleString()}</span>
                  </div>
                  {selectedRequest.assigned_first_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Assigned to: {selectedRequest.assigned_first_name} {selectedRequest.assigned_last_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
