'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare, ChevronLeft, ChevronRight, AlertTriangle, Ticket,
  ChevronRight as ChevronRightSm, CheckCheck,
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
  // Activity surface fields. `last_activity_at` is the timestamp of
  // the newest event on the row (creation, status change, or reply)
  // and drives the inbox sort. `reply_count` is the number of
  // customer-facing staff replies — > 0 lights up the "Attended"
  // pill so admins can scan which rows have already been answered.
  last_activity_at?: string
  reply_count?: number
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

// Priority stays on semantic signals (amber/red for attention, neutral for
// low-priority) — but we replace the out-of-palette blue "normal" with a soft
// brand tint so the badge row reads as Dermaspace rather than generic.
const priorityColors: Record<string, string> = {
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  normal: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function ComplaintsPage() {
  const router = useRouter()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

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

  // Tapping a row navigates to the dedicated detail page instead of
  // opening a modal. The URL carries `source` so the detail route knows
  // whether to read from `contact_messages` or `support_tickets`.
  const openComplaint = (complaint: Complaint) => {
    const source = complaint.source || 'complaint'
    router.push(`/admin/complaints/${complaint.id}?source=${source}`)
  }

  return (
    <div className="space-y-6">
      {/* Header — renamed from "Support Inbox" to just "Support" per the
          admin request. The subtitle already tells the full story. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Support</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every support ticket and contact-form message in one place
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
          <CardTitle className="text-base">All messages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-[#7B2D8E] border-t-transparent rounded-full" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No support messages yet</p>
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
                  <TableHead className="w-[36px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((complaint) => (
                  // The whole row is a tap target now — no modal, no
                  // dedicated Eye button. Tapping navigates to the
                  // detail page at /admin/complaints/[id]?source=…
                  <TableRow
                    key={`${complaint.source || 'complaint'}-${complaint.id}`}
                    onClick={() => openComplaint(complaint)}
                    className="cursor-pointer hover:bg-[#7B2D8E]/5 transition-colors"
                  >
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{complaint.name}</p>
                          {complaint.source === 'ticket' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#7B2D8E]">
                              <Ticket className="w-2.5 h-2.5" />
                              Ticket
                            </span>
                          )}
                          {/* "Attended" pill — lights up when at least
                              one customer-facing staff reply exists on
                              the row. Helps admins scan the inbox for
                              "have we replied to this yet?" without
                              opening every row. */}
                          {complaint.reply_count && complaint.reply_count > 0 ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-[#9A4DAF] to-[#5A1D6A] px-1.5 py-0.5 text-[10px] font-semibold text-white"
                              title={`${complaint.reply_count} ${
                                complaint.reply_count === 1 ? 'reply' : 'replies'
                              } sent`}
                            >
                              <CheckCheck className="w-2.5 h-2.5" />
                              Attended
                              {complaint.reply_count > 1 && (
                                <span className="opacity-80">· {complaint.reply_count}</span>
                              )}
                            </span>
                          ) : null}
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
                      {/* Show the most recent activity timestamp,
                          not the creation date — so a row that just
                          received a reply reads as "active today"
                          rather than "10 days ago". Falls back to
                          created_at when the API didn't compute
                          last_activity_at (older deployments). */}
                      <span className="text-sm text-gray-500">
                        {new Date(
                          complaint.last_activity_at || complaint.created_at,
                        ).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <ChevronRightSm className="w-4 h-4 text-gray-300 ml-auto" />
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
    </div>
  )
}
