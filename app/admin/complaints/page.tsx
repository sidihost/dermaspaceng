'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, Eye, ChevronLeft, ChevronRight, X,
  Mail, Phone, Clock, Send, AlertTriangle, Ticket
} from 'lucide-react'

interface Complaint {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  status: string
  priority: string
  category: string | null
  assigned_to: string | null
  assigned_first_name: string | null
  assigned_last_name: string | null
  created_at: string
  resolved_at: string | null
  // Unified inbox fields — tells us whether this row is a Contact-form
  // "complaint" or a logged-in-user "ticket", and the public ticket code
  // (e.g. DS-2026-000123) so admins can reference it with customers.
  source?: 'complaint' | 'ticket'
  ticket_id?: string | null
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

// Status uses brand purple for "resolved" so the inbox stays on-brand instead
// of showing stray greens. Open/in-progress/closed keep neutral-but-distinct
// tones so admins can scan status at a glance.
const statusColors: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  resolved: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyMessage, setReplyMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const fetchComplaints = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
      })
      const res = await fetch(`/api/admin/complaints?${params}`)
      if (res.ok) {
        const data = await res.json()
        setComplaints(data.complaints)
        setPagination(data.pagination)
        setStatusCounts(data.statusCounts)
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const fetchReplies = async (complaint: Complaint) => {
    try {
      const type = complaint.source === 'ticket' ? 'ticket' : 'complaint'
      const res = await fetch(`/api/admin/reply?requestType=${type}&requestId=${complaint.id}`)
      if (res.ok) {
        const data = await res.json()
        setReplies(data.replies)
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error)
    }
  }

  const openComplaint = async (complaint: Complaint) => {
    setSelectedComplaint(complaint)
    setReplies([])
    await fetchReplies(complaint)
  }

  const handleStatusChange = async (complaint: Complaint, newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/complaints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: complaint.id,
          action: 'update_status',
          value: newStatus,
          source: complaint.source || 'complaint',
        }),
      })
      if (res.ok) {
        fetchComplaints()
        if (selectedComplaint?.id === complaint.id && selectedComplaint.source === complaint.source) {
          setSelectedComplaint({ ...selectedComplaint, status: newStatus })
        }
      }
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handlePriorityChange = async (complaint: Complaint, newPriority: string) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/complaints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: complaint.id,
          action: 'update_priority',
          value: newPriority,
          source: complaint.source || 'complaint',
        }),
      })
      if (res.ok) {
        fetchComplaints()
        if (selectedComplaint?.id === complaint.id && selectedComplaint.source === complaint.source) {
          setSelectedComplaint({ ...selectedComplaint, priority: newPriority })
        }
      }
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedComplaint) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: selectedComplaint.source === 'ticket' ? 'ticket' : 'complaint',
          requestId: selectedComplaint.id,
          ticketCode: selectedComplaint.ticket_id || undefined,
          userEmail: selectedComplaint.email,
          message: replyMessage,
          isInternal,
        }),
      })
      if (res.ok) {
        setReplyMessage('')
        setIsInternal(false)
        await fetchReplies(selectedComplaint)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Inbox</h1>
          <p className="text-sm text-gray-500 mt-1">
            All customer complaints and support tickets in one place
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
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
            <p className="text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Complaints</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No complaints found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((complaint) => (
                  <TableRow key={`${complaint.source || 'complaint'}-${complaint.id}`}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{complaint.name}</p>
                          {complaint.source === 'ticket' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#7B2D8E]">
                              <Ticket className="w-2.5 h-2.5" />
                              Ticket
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{complaint.email}</p>
                        {complaint.ticket_id && (
                          <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                            {complaint.ticket_id}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600 truncate max-w-[200px]">
                        {complaint.subject || complaint.message.substring(0, 50)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={priorityColors[complaint.priority] || priorityColors.normal}>
                        {complaint.priority === 'urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {complaint.priority || 'normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[complaint.status] || statusColors.open}>
                        {(complaint.status || 'open').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(complaint.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => openComplaint(complaint)}
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
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {selectedComplaint.source === 'ticket' ? (
                  <>
                    <Ticket className="w-4 h-4 text-[#7B2D8E]" />
                    Ticket
                    <span className="font-mono text-[#7B2D8E] text-sm">
                      {selectedComplaint.ticket_id || `#${selectedComplaint.id}`}
                    </span>
                  </>
                ) : (
                  <>Complaint #{selectedComplaint.id}</>
                )}
              </h3>
              <button onClick={() => setSelectedComplaint(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Customer Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-[#7B2D8E]">
                    {selectedComplaint.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{selectedComplaint.name}</h4>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedComplaint.email}
                    </span>
                    {selectedComplaint.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {selectedComplaint.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedComplaint.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(selectedComplaint, status)}
                        disabled={updating}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                          selectedComplaint.status === status
                            ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                            : 'border-gray-200 hover:border-gray-300'
                        } disabled:opacity-50`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {['low', 'normal', 'high', 'urgent'].map((priority) => (
                      <button
                        key={priority}
                        onClick={() => handlePriorityChange(selectedComplaint, priority)}
                        disabled={updating}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                          selectedComplaint.priority === priority
                            ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                            : 'border-gray-200 hover:border-gray-300'
                        } disabled:opacity-50`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Original Message */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  {selectedComplaint.subject || 'Message'}
                </h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedComplaint.message}</p>
                </div>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Conversation</h4>
                  <div className="space-y-3">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-lg ${
                          reply.is_internal 
                            ? 'bg-yellow-50 border border-yellow-200' 
                            : 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {reply.staff_first_name} {reply.staff_last_name}
                            {reply.is_internal && (
                              <span className="ml-2 text-xs text-yellow-600">(Internal Note)</span>
                            )}
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
              <div className="flex items-center gap-2 mb-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-600">Internal note (not visible to customer)</span>
                </label>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={isInternal ? "Add an internal note..." : "Type your reply..."}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyMessage.trim()}
                  className="px-4 py-2 bg-[#7B2D8E] text-white rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isInternal ? 'Add Note' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
