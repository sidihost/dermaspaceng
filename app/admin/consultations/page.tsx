'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ClipboardList,
  Clock,
  Hourglass,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  UserCheck,
  XCircle,
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
  // Customer-account fields, joined from `users` by email so the list
  // can show the customer's real avatar (same one rendered on
  // /admin/users) whenever a registered account exists.
  customer_avatar_url: string | null
  customer_user_id: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Status palette — strictly brand purple + neutrals.
 *
 *   pending    → amber tint (the only non-brand hue we keep, because
 *                "needs attention" must read instantly)
 *   confirmed  → brand-purple tint
 *   completed  → solid brand purple
 *   cancelled  → neutral gray
 *
 * Each entry also carries an icon so the cards/badges can show a glyph
 * that matches the meaning — no Sparkles, no Zap, per the brand rules.
 */
const STATUS_META: Record<
  string,
  {
    label: string
    chip: string
    dot: string
    icon: typeof Hourglass
    softCard: string
    accentText: string
  }
> = {
  pending: {
    label: 'Pending',
    chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-500',
    icon: Hourglass,
    softCard: 'bg-amber-50/60 ring-amber-200/70',
    accentText: 'text-amber-700',
  },
  confirmed: {
    label: 'Confirmed',
    chip: 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-1 ring-[#7B2D8E]/20',
    dot: 'bg-[#7B2D8E]',
    icon: CalendarClock,
    softCard: 'bg-[#7B2D8E]/5 ring-[#7B2D8E]/15',
    accentText: 'text-[#7B2D8E]',
  },
  completed: {
    label: 'Completed',
    chip: 'bg-[#7B2D8E] text-white ring-1 ring-[#7B2D8E]',
    dot: 'bg-[#7B2D8E]',
    icon: UserCheck,
    softCard: 'bg-[#7B2D8E]/[0.04] ring-[#7B2D8E]/10',
    accentText: 'text-[#7B2D8E]',
  },
  cancelled: {
    label: 'Cancelled',
    chip: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    dot: 'bg-gray-400',
    icon: XCircle,
    softCard: 'bg-gray-50 ring-gray-200',
    accentText: 'text-gray-600',
  },
}

const STATUS_ORDER: Array<keyof typeof STATUS_META> = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
]

/** Two-letter initials from "First Last" or an email local-part. */
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

/** Relative "x mins/hrs/days ago" stamp — keeps the list scannable. */
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

export default function ConsultationsPage() {
  const router = useRouter()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, statusFilter])

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  // Client-side search across the page we already have — keeps the
  // experience instant for the typical "I'm looking for Aisha" flow
  // without re-hitting the API on every keystroke.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return consultations
    return consultations.filter((c) => {
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        (c.concerns || []).some((x) => x.toLowerCase().includes(q))
      )
    })
  }, [consultations, search])

  const totalAll =
    (statusCounts.pending || 0) +
    (statusCounts.confirmed || 0) +
    (statusCounts.completed || 0) +
    (statusCounts.cancelled || 0)

  return (
    <div className="space-y-4">
      {/* ───────────────────────── Header ────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Consultations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Skincare consultation requests from clients and visitors.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span className="text-gray-600">{totalAll} total requests</span>
          </div>
          {(statusCounts.pending || 0) > 0 ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              <Hourglass className="h-3 w-3" aria-hidden="true" />
              {statusCounts.pending} awaiting action
            </div>
          ) : null}
        </div>
      </div>

      {/* ───────────── Status filter pills (scrollable on mobile) ────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* "All" pill — clears the filter. Pinned first so the admin
            can always escape a filter without scrolling. */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('')
            setPagination((p) => ({ ...p, page: 1 }))
          }}
          className={`group relative overflow-hidden rounded-xl border bg-white p-3 text-left transition-all ${
            statusFilter === ''
              ? 'border-[#7B2D8E] shadow-sm ring-2 ring-[#7B2D8E]/15'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              All
            </span>
            <ClipboardList
              className={`h-4 w-4 ${
                statusFilter === '' ? 'text-[#7B2D8E]' : 'text-gray-400'
              }`}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalAll}</p>
          <p className="text-xs text-gray-500">requests</p>
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
              className={`group relative overflow-hidden rounded-xl border bg-white p-3 text-left transition-all ${
                active
                  ? 'border-[#7B2D8E] shadow-sm ring-2 ring-[#7B2D8E]/15'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${
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
                  className={`h-4 w-4 ${
                    active ? 'text-[#7B2D8E]' : 'text-gray-400'
                  }`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">
                {status === 'pending'
                  ? 'awaiting reply'
                  : status === 'confirmed'
                    ? 'booked in'
                    : status === 'completed'
                      ? 'wrapped up'
                      : 'closed out'}
              </p>
            </button>
          )
        })}
      </div>

      {/* ───────────────────────── Search ────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search by name, email, phone, location, or concern…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────── Consultation list ─────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#7B2D8E] border-t-transparent" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#7B2D8E]/10">
                <Calendar
                  className="h-7 w-7 text-[#7B2D8E]"
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm font-medium text-gray-900">
                No consultations found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? 'Try a different search term.'
                  : statusFilter
                    ? `No ${STATUS_META[statusFilter]?.label.toLowerCase()} consultations right now.`
                    : 'New requests will show up here.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visible.map((c) => {
                const meta = STATUS_META[c.status] || STATUS_META.pending
                const StatusIcon = meta.icon
                const concerns = c.concerns || []
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/consultations/${c.id}`)
                      }
                      className="group flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-[#7B2D8E]/[0.04] sm:px-6"
                    >
                      {/* ─── Avatar (same visual language as /admin/users) ─── */}
                      <div className="relative flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#7B2D8E]/10 ring-2 ring-white">
                          {c.customer_avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.customer_avatar_url}
                              alt={c.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-[#7B2D8E]">
                              {initialsFrom(c.name, c.email)}
                            </span>
                          )}
                        </div>
                        {/* Tiny status dot in the corner — matches the
                            chip color so the row reads at a glance even
                            before you've reached the right-hand badge. */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white`}
                          aria-hidden="true"
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${meta.dot}`}
                          />
                        </span>
                      </div>

                      {/* ─── Main content ─── */}
                      <div className="min-w-0 flex-1">
                        {/* Row 1: name + status chip */}
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {c.name}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.chip}`}
                          >
                            <StatusIcon
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            {meta.label}
                          </span>
                          {c.customer_user_id ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-gray-200">
                              <UserCheck
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              Client
                            </span>
                          ) : null}
                        </div>

                        {/* Row 2: contact info */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="truncate">{c.email}</span>
                          </span>
                          {c.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {c.phone}
                            </span>
                          ) : null}
                          {c.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {c.location}
                            </span>
                          ) : null}
                        </div>

                        {/* Row 3: concerns */}
                        {concerns.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {concerns.slice(0, 3).map((concern, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="border-[#7B2D8E]/15 bg-[#7B2D8E]/5 text-[11px] font-medium text-[#7B2D8E] hover:bg-[#7B2D8E]/10"
                              >
                                {concern}
                              </Badge>
                            ))}
                            {concerns.length > 3 ? (
                              <Badge
                                variant="outline"
                                className="border-gray-200 bg-gray-50 text-[11px] font-medium text-gray-600"
                              >
                                +{concerns.length - 3} more
                              </Badge>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Row 4: message preview */}
                        {c.message ? (
                          <p className="mt-2 line-clamp-1 flex items-start gap-1.5 text-xs italic text-gray-500">
                            <MessageSquare
                              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400"
                              aria-hidden="true"
                            />
                            <span className="line-clamp-1">{c.message}</span>
                          </p>
                        ) : null}

                        {/* Row 5: meta footer */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {relativeTime(c.created_at)}
                          </span>
                          {c.scheduled_at ? (
                            <span className="inline-flex items-center gap-1 text-[#7B2D8E]">
                              <CalendarClock
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              Scheduled{' '}
                              {new Date(c.scheduled_at).toLocaleDateString(
                                'en-NG',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                },
                              )}
                            </span>
                          ) : null}
                          {c.assigned_first_name ? (
                            <span className="inline-flex items-center gap-1">
                              <UserCheck
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              Assigned to {c.assigned_first_name}{' '}
                              {c.assigned_last_name?.charAt(0) ?? ''}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* ─── Trailing chevron ─── */}
                      <ChevronRightIcon
                        className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-[#7B2D8E]"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {/* ─── Pagination ─── */}
          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4 sm:px-6">
              <p className="text-xs text-gray-500 sm:text-sm">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total,
                )}{' '}
                of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                  className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-600 sm:text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
