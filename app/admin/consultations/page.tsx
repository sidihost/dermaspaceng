'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, Eye, ChevronLeft, ChevronRight, X,
  User, Mail, Phone, MapPin, Clock, Send
} from 'lucide-react'

interface Consultation {
  id: number
  name: string
  email: string
  phone: string
  location: string
  concerns: string[] | null
  message: string | null
  status: string
  assigned_to: string | null
  assigned_first_name: string | null
  assigned_last_name: string | null
  admin_notes: string | null
  scheduled_at: string | null
  created_at: string
}

interface Reply {
  id: string
  message: string
  is_internal: boolean
  created_at: string
  staff_first_name: string
  staff_last_name: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Brand-led status palette — "completed" uses the brand fill, in-flight
// states use a soft brand tint, and terminal/cancelled falls back to neutral
// so the list doesn't flip through four unrelated hues.
const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  completed: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyMessage, setReplyMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetchConsultations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
      })
      const res = await fetch(`/api/admin/consultations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setConsultations(data.consultations)
        setPagination(data.pagination)
        setStatusCounts(data.statusCounts)
      }
    } catch (error) {
      console.error('Failed to fetch consultations:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter])

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  const fetchReplies = async (consultationId: number) => {
    try {
      const res = await fetch(`/api/admin/reply?requestType=consultation&requestId=${consultationId}`)
      if (res.ok) {
        const data = await res.json()
        setReplies(data.replies)
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error)
    }
  }

  const openConsultation = async (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setReplies([])
    await fetchReplies(consultation.id)
  }

  const handleStatusChange = async (consultationId: number, newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId, action: 'update_status', value: newStatus }),
      })
      if (res.ok) {
        fetchConsultations()
        if (selectedConsultation?.id === consultationId) {
          setSelectedConsultation({ ...selectedConsultation, status: newStatus })
        }
      }
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedConsultation) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'consultation',
          requestId: selectedConsultation.id,
          userEmail: selectedConsultation.email,
          message: replyMessage,
          isInternal: false,
        }),
      })
      if (res.ok) {
        setReplyMessage('')
        await fetchReplies(selectedConsultation.id)
      }
    } catch (error) {
      console.error('Send reply failed:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Consultations</h1>
        <p className="text-sm text-gray-500 mt-1">Manage consultation requests and appointments</p>
      </div>

      {/* Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
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
        <CardHeader>
          <CardTitle className="text-base">All Consultations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No consultations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Concerns</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((consultation) => (
                  <TableRow key={consultation.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{consultation.name}</p>
                        <p className="text-sm text-gray-500">{consultation.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{consultation.location}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(consultation.concerns || []).slice(0, 2).map((concern, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {concern}
                          </Badge>
                        ))}
                        {(consultation.concerns || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(consultation.concerns || []).length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[consultation.status] || statusColors.pending}>
                        {consultation.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(consultation.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => openConsultation(consultation)}
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
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Consultation #{selectedConsultation.id}</h3>
              <button onClick={() => setSelectedConsultation(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{selectedConsultation.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedConsultation.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{selectedConsultation.phone}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{selectedConsultation.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{new Date(selectedConsultation.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedConsultation.id, status)}
                      disabled={updating}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                        selectedConsultation.status === status
                          ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                          : 'border-gray-200 hover:border-gray-300'
                      } disabled:opacity-50`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concerns */}
              {selectedConsultation.concerns && selectedConsultation.concerns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Concerns</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedConsultation.concerns.map((concern, i) => (
                      <Badge key={i} variant="outline" className="bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20">
                        {concern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              {selectedConsultation.message && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Notes</h4>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{selectedConsultation.message}</p>
                </div>
              )}

              {/* Replies */}
              {replies.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Conversation</h4>
                  <div className="space-y-3">
                    {replies.map((reply) => (
                      <div key={reply.id} className="p-3 rounded-lg bg-[#7B2D8E]/5 border border-[#7B2D8E]/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {reply.staff_first_name} {reply.staff_last_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(reply.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reply Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyMessage.trim()}
                  // Match the standard admin button size (h-9, 14px). Without
                  // `text-sm` this was rendering at 16px and looked oversized
                  // next to every other control in the admin UI.
                  className="h-9 px-4 text-sm font-medium bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {sending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
