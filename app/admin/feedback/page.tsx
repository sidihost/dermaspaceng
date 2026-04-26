'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  ClipboardList,
  Search,
  Star,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Loader2,
  Mail,
  User as UserIcon,
  Filter,
  AlertCircle,
} from 'lucide-react'

/**
 * Admin feedback inbox.
 *
 * Filters: status, category, experience, free-text search.
 * Each row is expandable into a panel with the full message + a
 * status-changing action set (new → in_review → actioned → closed).
 *
 * The page intentionally mirrors the visual language of /admin/complaints
 * so the admin doesn't have to context-switch between two inboxes.
 */

type FeedbackRow = {
  id: number
  user_id: string | null
  name: string | null
  email: string | null
  category: string
  experience: 'positive' | 'neutral' | 'negative'
  rating: number
  message: string
  status: 'new' | 'in_review' | 'actioned' | 'closed'
  source: string
  created_at: string
  reviewed_at: string | null
  account_first_name: string | null
  account_last_name: string | null
  account_avatar_url: string | null
  account_email: string | null
}

type FeedbackResponse = {
  submissions: FeedbackRow[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  statusCounts: Record<string, number>
  stats: { avgRating: number | null; positive: number; neutral: number; negative: number }
}

const STATUS_OPTIONS: Array<{ value: '' | FeedbackRow['status']; label: string }> = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'in_review', label: 'In review' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'closed', label: 'Closed' },
]
const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'service', label: 'Service Quality' },
  { value: 'staff', label: 'Staff & Support' },
  { value: 'facility', label: 'Facility & Ambiance' },
  { value: 'booking', label: 'Booking Experience' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'complaint', label: 'Issue / Complaint' },
]
const EXPERIENCES = [
  { value: '', label: 'Any experience' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
]

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || `HTTP ${r.status}`)
    return r.json()
  })

function ExperiencePill({ value }: { value: FeedbackRow['experience'] }) {
  const map = {
    positive: { Icon: ThumbsUp, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    neutral: { Icon: Meh, cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    negative: { Icon: ThumbsDown, cls: 'bg-red-50 text-red-700 border-red-200' },
  } as const
  const { Icon, cls } = map[value]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}
    >
      <Icon className="w-3 h-3" />
      {value}
    </span>
  )
}

function StatusPill({ value }: { value: FeedbackRow['status'] }) {
  const map = {
    new: 'bg-[#7B2D8E]/10 text-[#7B2D8E]',
    in_review: 'bg-amber-50 text-amber-700',
    actioned: 'bg-emerald-50 text-emerald-700',
    closed: 'bg-gray-100 text-gray-600',
  } as const
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${map[value]}`}>
      {value.replace('_', ' ')}
    </span>
  )
}

export default function AdminFeedbackPage() {
  const [status, setStatus] = useState<'' | FeedbackRow['status']>('')
  const [category, setCategory] = useState('')
  const [experience, setExperience] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const queryString = useMemo(() => {
    const sp = new URLSearchParams()
    if (status) sp.set('status', status)
    if (category) sp.set('category', category)
    if (experience) sp.set('experience', experience)
    if (q.trim()) sp.set('q', q.trim())
    sp.set('page', String(page))
    return sp.toString()
  }, [status, category, experience, q, page])

  const { data, error, isLoading, mutate } = useSWR<FeedbackResponse>(
    `/api/admin/feedback?${queryString}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  const updateStatus = async (id: number, next: FeedbackRow['status']) => {
    // Optimistic — flip the row's status locally, then confirm with
    // the server. On failure SWR revalidates back to truth.
    await mutate(
      (curr) =>
        curr
          ? {
              ...curr,
              submissions: curr.submissions.map((s) =>
                s.id === id ? { ...s, status: next } : s,
              ),
            }
          : curr,
      false,
    )
    const res = await fetch('/api/admin/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id, status: next }),
    })
    if (!res.ok) {
      // Revalidate to roll back the optimistic update.
      await mutate()
    } else {
      // Re-pull the badge counts.
      await mutate()
    }
  }

  const total = data?.pagination?.total ?? 0
  const stats = data?.stats

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 text-[#7B2D8E] mb-1">
            <ClipboardList className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Admin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            User Feedback
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All submissions from the public feedback form and shake-to-feedback gesture.
          </p>
        </div>

        {/* Headline stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Total
            </p>
            <p className="text-lg font-bold text-gray-900 leading-none mt-1">{total}</p>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Avg rating
            </p>
            <p className="text-lg font-bold text-gray-900 leading-none mt-1 flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {stats?.avgRating ? stats.avgRating.toFixed(1) : '—'}
            </p>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white border border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Sentiment
            </p>
            <p className="text-xs font-semibold text-gray-700 mt-1 flex items-center gap-2">
              <span className="text-emerald-600">{stats?.positive ?? 0}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{stats?.neutral ?? 0}</span>
              <span className="text-gray-400">·</span>
              <span className="text-red-600">{stats?.negative ?? 0}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter rail */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Search message, name, or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | FeedbackRow['status'])
              setPage(1)
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
                {o.value && data?.statusCounts?.[o.value]
                  ? ` (${data.statusCounts[o.value]})`
                  : ''}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
          >
            {CATEGORIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={experience}
            onChange={(e) => {
              setExperience(e.target.value)
              setPage(1)
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
          >
            {EXPERIENCES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(status || category || experience || q) && (
            <button
              type="button"
              onClick={() => {
                setStatus('')
                setCategory('')
                setExperience('')
                setQ('')
                setPage(1)
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:underline px-2 py-1"
            >
              <Filter className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table / list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-gray-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading feedback…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-sm text-red-600 gap-2">
            <AlertCircle className="w-4 h-4" />
            {(error as Error).message}
          </div>
        ) : !data?.submissions.length ? (
          <div className="text-center py-20 text-sm text-gray-500">
            No feedback matches these filters yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.submissions.map((row) => {
              const isOpen = expandedId === row.id
              const displayName =
                row.name ||
                [row.account_first_name, row.account_last_name].filter(Boolean).join(' ') ||
                'Anonymous'
              const displayEmail = row.email || row.account_email || ''
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : row.id)}
                    className="w-full text-left px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                        {row.account_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.account_avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (displayName.charAt(0) || 'A').toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {displayName}
                          </p>
                          {row.user_id ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 px-1.5 py-0.5 rounded">
                              <UserIcon className="w-2.5 h-2.5" />
                              account
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              guest
                            </span>
                          )}
                          <ExperiencePill value={row.experience} />
                          <StatusPill value={row.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {displayEmail || 'no email'} · {row.category} ·{' '}
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                        <p
                          className={`text-sm text-gray-700 mt-1 ${
                            isOpen ? '' : 'line-clamp-2'
                          }`}
                        >
                          {row.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 text-xs text-gray-700">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-semibold">{row.rating}</span>
                        <span className="text-gray-400">/10</span>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 -mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500 mr-2">Set status:</span>
                      {(['new', 'in_review', 'actioned', 'closed'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void updateStatus(row.id, s)
                          }}
                          disabled={row.status === s}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                            row.status === s
                              ? 'bg-[#7B2D8E] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                      {displayEmail && (
                        <a
                          href={`mailto:${displayEmail}?subject=Re%3A%20Your%20Dermaspace%20feedback`}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] hover:underline"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Reply by email
                        </a>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page >= data.pagination.totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
