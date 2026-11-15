'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSm,
  AlertTriangle,
  Ticket,
  CheckCheck,
  Mail,
  Phone,
  Inbox,
  CircleDashed,
  CircleDot,
  CheckCircle2,
  Archive,
  Search,
  X,
} from 'lucide-react'
import { markSurfaceSeen } from '@/components/admin/sidebar'

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
  source?: 'complaint' | 'ticket'
  ticket_id?: string | null
  ticket_source?: 'app' | 'email' | null
  last_activity_at?: string
  reply_count?: number
  customer_avatar_url?: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_META: Record<
  string,
  {
    label: string
    caption: string
    dot: string
    chip: string
    icon: typeof Inbox
  }
> = {
  open: {
    label: 'Open',
    caption: 'awaiting reply',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: CircleDashed,
  },
  in_progress: {
    label: 'In progress',
    caption: 'being handled',
    dot: 'bg-[#7B2D8E]',
    chip: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
    icon: CircleDot,
  },
  resolved: {
    label: 'Resolved',
    caption: 'wrapped up',
    dot: 'bg-[#7B2D8E]',
    chip: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    caption: 'archived',
    dot: 'bg-gray-400',
    chip: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: Archive,
  },
}

const PRIORITY_META: Record<string, { label: string; chip: string }> = {
  urgent: {
    label: 'Urgent',
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  high: {
    label: 'High',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  normal: {
    label: 'Normal',
    chip: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  },
  low: {
    label: 'Low',
    chip: 'bg-gray-100 text-gray-600 border-gray-200',
  },
}

const STATUS_ORDER = ['open', 'in_progress', 'resolved', 'closed'] as const
const SOURCE_TABS = [
  { id: '', label: 'All messages' },
  { id: 'ticket', label: 'Tickets' },
  { id: 'complaint', label: 'Contact form' },
] as const

function initialsFrom(name: string, email: string): string {
  const cleaned = (name || '').trim()
  if (cleaned) {
    const parts = cleaned.split(/\s+/)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
    return (first + last).toUpperCase() || cleaned.slice(0, 2).toUpperCase()
  }
  return (email || '?').slice(0, 2).toUpperCase()
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  })
}

export default function ComplaintsPage() {
  const router = useRouter()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [sourceCounts, setSourceCounts] = useState<{ complaints: number; tickets: number }>({
    complaints: 0,
    tickets: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchComplaints = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
        source: sourceFilter,
        q: search.trim(),
      })
      const res = await fetch(`/api/admin/complaints?${params}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setComplaints(data.complaints || [])
        if (data.pagination) setPagination(data.pagination)
        if (data.statusCounts) setStatusCounts(data.statusCounts)
        if (data.sourceCounts) setSourceCounts(data.sourceCounts)
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter, sourceFilter, search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchComplaints()
    }, search ? 200 : 0)
    return () => window.clearTimeout(timer)
  }, [fetchComplaints, search])

  useEffect(() => {
    const open = (statusCounts.open || 0) + (statusCounts.in_progress || 0)
    if (open >= 0) markSurfaceSeen('tickets', open)
  }, [statusCounts])

  const openComplaint = (complaint: Complaint) => {
    const source = complaint.source || 'complaint'
    router.push(`/admin/complaints/${complaint.id}?source=${source}`)
  }

  const totalAll = useMemo(
    () =>
      (statusCounts.open || 0) +
      (statusCounts.in_progress || 0) +
      (statusCounts.resolved || 0) +
      (statusCounts.closed || 0),
    [statusCounts],
  )
  const awaiting = (statusCounts.open || 0) + (statusCounts.in_progress || 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Support</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every support ticket and contact-form message in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <Inbox className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>{totalAll} total messages</span>
          </div>
          {awaiting > 0 ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              <CircleDashed className="h-3 w-3" aria-hidden="true" />
              {awaiting} awaiting reply
            </div>
          ) : null}
        </div>
      </div>

      {/* Status filter tiles — flat border-first cards, zero shadows or gradients */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => {
            setStatusFilter('')
            setPagination((p) => ({ ...p, page: 1 }))
          }}
          className={`rounded-xl border bg-white p-3.5 text-left transition-colors ${
            statusFilter === ''
              ? 'border-[#7B2D8E] ring-1 ring-[#7B2D8E]/20'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wide ${
                statusFilter === '' ? 'text-[#7B2D8E]' : 'text-gray-500'
              }`}
            >
              All
            </span>
            <Inbox
              className={`h-4 w-4 ${statusFilter === '' ? 'text-[#7B2D8E]' : 'text-gray-400'}`}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalAll}</p>
          <p className="text-xs text-gray-500">messages</p>
        </button>

        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status]
          const Icon = meta.icon
          const active = statusFilter === status
          const count = statusCounts[status] || 0
          return (
            <button
              key={status}
              type="button"
              onClick={() => {
                setStatusFilter(active ? '' : status)
                setPagination((p) => ({ ...p, page: 1 }))
              }}
              className={`rounded-xl border bg-white p-3.5 text-left transition-colors ${
                active
                  ? 'border-[#7B2D8E] ring-1 ring-[#7B2D8E]/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                    active ? 'text-[#7B2D8E]' : 'text-gray-500'
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`}
                    aria-hidden="true"
                  />
                  {meta.label}
                </span>
                <Icon
                  className={`h-4 w-4 ${active ? 'text-[#7B2D8E]' : 'text-gray-400'}`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{meta.caption}</p>
            </button>
          )
        })}
      </div>

      {/* Search + Source filter bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination((p) => ({ ...p, page: 1 }))
              }}
              placeholder="Search by ticket ID, customer name, email, or subject…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none focus:ring-1 focus:ring-[#7B2D8E]/20"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPagination((p) => ({ ...p, page: 1 }))
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {SOURCE_TABS.map((tab) => {
              const active = sourceFilter === tab.id
              const count =
                tab.id === 'ticket'
                  ? sourceCounts.tickets
                  : tab.id === 'complaint'
                    ? sourceCounts.complaints
                    : sourceCounts.tickets + sourceCounts.complaints
              return (
                <button
                  key={tab.id || 'all'}
                  type="button"
                  onClick={() => {
                    setSourceFilter(tab.id)
                    setPagination((p) => ({ ...p, page: 1 }))
                  }}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.25 text-[10px] ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Unified Support List — flat container, hairline dividers, zero shadows */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#7B2D8E] border-t-transparent" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#7B2D8E]/10">
              <MessageSquare className="h-6 w-6 text-[#7B2D8E]" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              No support messages found
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {search
                ? 'Try a different search term or clear filters.'
                : statusFilter
                  ? `No ${STATUS_META[statusFilter]?.label.toLowerCase()} messages right now.`
                  : 'New customer tickets and contact-form requests will appear here.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {complaints.map((complaint) => {
              const sMeta = STATUS_META[complaint.status] || STATUS_META.open
              const StatusIcon = sMeta.icon
              const pMeta =
                PRIORITY_META[complaint.priority] || PRIORITY_META.normal
              const activityAt =
                complaint.last_activity_at || complaint.created_at
              const snippet = (complaint.message || '')
                .replace(/\s+/g, ' ')
                .trim()

              return (
                <li key={`${complaint.source || 'complaint'}-${complaint.id}`}>
                  <button
                    type="button"
                    onClick={() => openComplaint(complaint)}
                    className="group flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-[#7B2D8E]/[0.035] sm:px-6"
                  >
                    {/* Customer Avatar / Initials + Status Dot */}
                    <div className="relative flex-shrink-0 pt-0.5">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#7B2D8E]/10 border border-[#7B2D8E]/15">
                        {complaint.customer_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={complaint.customer_avatar_url}
                            alt={complaint.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-[#7B2D8E]">
                            {initialsFrom(complaint.name, complaint.email)}
                          </span>
                        )}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white"
                        aria-hidden="true"
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${sMeta.dot}`}
                        />
                      </span>
                    </div>

                    {/* Row Body */}
                    <div className="min-w-0 flex-1">
                      {/* Top line: Name + source/status chips + timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {complaint.name || 'Customer'}
                          </span>
                          {complaint.ticket_id ? (
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-gray-700 border border-gray-200">
                              {complaint.ticket_id}
                            </span>
                          ) : null}
                          {complaint.source === 'ticket' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7B2D8E]">
                              <Ticket className="h-2.5 w-2.5" aria-hidden="true" />
                              Ticket
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              Contact
                            </span>
                          )}
                          {complaint.source === 'ticket' &&
                          complaint.ticket_source === 'email' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                              <Mail className="h-2.5 w-2.5" aria-hidden="true" />
                              Email
                            </span>
                          ) : null}
                          {complaint.reply_count && complaint.reply_count > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E] px-2 py-0.5 text-[10px] font-semibold text-white">
                              <CheckCheck className="h-2.5 w-2.5" aria-hidden="true" />
                              Attended
                              {complaint.reply_count > 1 ? (
                                <span className="opacity-80">
                                  · {complaint.reply_count}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {relativeTime(activityAt)}
                          </span>
                          <ChevronRightSm
                            className="h-4 w-4 text-gray-300 group-hover:text-[#7B2D8E] transition-colors"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      {/* Subject + preview */}
                      <p className="mt-1.5 text-sm font-medium text-gray-900 line-clamp-1">
                        {complaint.subject || snippet.slice(0, 90) || 'Support request'}
                      </p>
                      {snippet ? (
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                          {snippet}
                        </p>
                      ) : null}

                      {/* Footer metadata + Status & Priority pills */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 min-w-0">
                          <span className="inline-flex items-center gap-1 truncate max-w-[260px]">
                            <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{complaint.email}</span>
                          </span>
                          {complaint.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" aria-hidden="true" />
                              <span>{complaint.phone}</span>
                            </span>
                          ) : null}
                          {complaint.category ? (
                            <span className="text-[11px] text-gray-400 capitalize">
                              · {complaint.category.replace(/_/g, ' ')}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pMeta.chip}`}
                          >
                            {complaint.priority === 'urgent' ? (
                              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            ) : null}
                            {pMeta.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${sMeta.chip}`}
                          >
                            <StatusIcon className="h-3 w-3" aria-hidden="true" />
                            {sMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3.5 sm:px-6">
            <p className="text-xs sm:text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                }
                disabled={pagination.page === 1}
                aria-label="Previous page"
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs sm:text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.min(p.totalPages, p.page + 1),
                  }))
                }
                disabled={pagination.page === pagination.totalPages}
                aria-label="Next page"
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
