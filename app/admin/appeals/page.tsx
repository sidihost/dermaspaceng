'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Search,
  ShieldAlert,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import { markSurfaceSeen } from '@/components/admin/sidebar'
import { useNotify } from '@/components/shared/notify'

interface AppealItem {
  id: string
  user_id: string
  user_email: string
  user_name: string | null
  user_role: 'user' | 'staff' | 'admin'
  suspension_reason: string | null
  appeal_message: string
  contact_email: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  review_note: string | null
  reviewed_at: string | null
  created_at: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  user_is_active: boolean
  current_user_role: string | null
  reviewer_name: string | null
}

interface AppealCounts {
  total: number
  pending: number
  approved: number
  rejected: number
}

const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Declined' },
  { id: 'all', label: 'All' },
] as const

function initialsFrom(name: string | null | undefined, email: string): string {
  const cleaned = (name || '').trim()
  if (cleaned) {
    const parts = cleaned.split(/\s+/)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
    return (first + last).toUpperCase() || cleaned.slice(0, 2).toUpperCase()
  }
  return (email || '?').slice(0, 2).toUpperCase()
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminAppealsPage() {
  const notify = useNotify()
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [appeals, setAppeals] = useState<AppealItem[]>([])
  const [counts, setCounts] = useState<AppealCounts>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [actingId, setActingId] = useState<string | null>(null)

  const fetchAppeals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/admin/appeals?${params.toString()}`, {
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load appeals')
      }
      setAppeals(data.appeals ?? [])
      if (data.counts) {
        setCounts(data.counts)
        markSurfaceSeen('appeals', Number(data.counts.pending ?? 0))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appeals')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    fetchAppeals()
  }, [fetchAppeals])

  const handleDecision = async (appealId: string, decision: 'approved' | 'rejected') => {
    setActingId(appealId)
    try {
      const reviewNote = (notesById[appealId] || '').trim()
      const res = await fetch(`/api/admin/appeals/${encodeURIComponent(appealId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reviewNote: reviewNote || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify.error('Could not update appeal', data?.error || 'Please try again.')
        return
      }
      notify.success(
        decision === 'approved' ? 'Appeal approved' : 'Appeal declined',
        decision === 'approved'
          ? 'The account has been reinstated and notified by email.'
          : 'The user has been notified of the decision by email.',
      )
      setNotesById((prev) => {
        const next = { ...prev }
        delete next[appealId]
        return next
      })
      await fetchAppeals()
    } catch {
      notify.error('Network error', 'Could not submit decision.')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Suspension Appeals
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review reinstatement requests from suspended clients and staff members.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/20 bg-[#7B2D8E]/10 px-3 py-1 font-semibold text-[#7B2D8E]">
            <ShieldAlert className="w-3.5 h-3.5" />
            {counts.pending} pending review
          </span>
        </div>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.id === 'pending'
                  ? counts.pending
                  : tab.id === 'approved'
                    ? counts.approved
                    : tab.id === 'rejected'
                      ? counts.rejected
                      : counts.total
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#7B2D8E] text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200/80 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="relative w-full lg:max-w-xs min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or ID"
              className="w-full h-10 pl-9 pr-8 rounded-lg border border-gray-200 text-base sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-rose-600 mb-3">{error}</p>
            <button
              type="button"
              onClick={fetchAppeals}
              className="px-4 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
            >
              Try again
            </button>
          </div>
        ) : appeals.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-gray-900">No appeals found</p>
            <p className="mt-1 text-xs text-gray-500">
              {statusFilter === 'pending'
                ? 'There are no pending reinstatement appeals right now.'
                : 'No appeals match this filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appeals.map((appeal) => {
              const displayName =
                [appeal.first_name, appeal.last_name].filter(Boolean).join(' ').trim() ||
                appeal.user_name ||
                appeal.user_email
              const role = appeal.current_user_role || appeal.user_role
              const profileHref =
                role === 'staff' || role === 'admin'
                  ? `/admin/staff/${encodeURIComponent(appeal.user_id)}`
                  : `/admin/users/${encodeURIComponent(appeal.user_id)}`
              const busy = actingId === appeal.id
              const isPending = appeal.status === 'pending'

              return (
                <article key={appeal.id} className="p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {appeal.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={appeal.avatar_url}
                          alt=""
                          aria-hidden="true"
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-[#7B2D8E]/15 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initialsFrom(displayName, appeal.user_email)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={profileHref}
                            className="text-sm font-semibold text-gray-900 hover:text-[#7B2D8E] inline-flex items-center gap-1"
                          >
                            <span>{displayName}</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </Link>
                          <span className="inline-flex items-center rounded-full bg-[#7B2D8E] text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            {role}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                              appeal.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : appeal.status === 'approved'
                                  ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {appeal.status === 'pending' && <Clock className="w-3 h-3" />}
                            {appeal.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                            {appeal.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            {appeal.status === 'rejected' ? 'Declined' : appeal.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span className="font-mono text-[#7B2D8E] font-medium">
                            {appeal.id}
                          </span>
                          <span className="inline-flex items-center gap-1 min-w-0 break-all">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span>{appeal.user_email}</span>
                          </span>
                          {appeal.contact_email && appeal.contact_email !== appeal.user_email && (
                            <span className="break-all">Reply to: {appeal.contact_email}</span>
                          )}
                          <span>Submitted {formatDateTime(appeal.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={profileHref}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
                      >
                        View profile
                      </Link>
                    </div>
                  </div>

                  {appeal.suspension_reason && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-700 break-words">
                      <span className="font-semibold text-gray-900">Suspension reason: </span>
                      {appeal.suspension_reason}
                    </div>
                  )}

                  <div className="rounded-xl border border-[#7B2D8E]/15 bg-[#FBF9FC] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B2D8E] mb-1.5">
                      Appeal Explanation
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                      {appeal.appeal_message}
                    </p>
                  </div>

                  {isPending ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label
                          htmlFor={`appeal-note-${appeal.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1.5"
                        >
                          Decision note{' '}
                          <span className="font-normal text-gray-400">
                            (optional, included in decision email)
                          </span>
                        </label>
                        <textarea
                          id={`appeal-note-${appeal.id}`}
                          rows={2}
                          value={notesById[appeal.id] || ''}
                          onChange={(e) =>
                            setNotesById((prev) => ({
                              ...prev,
                              [appeal.id]: e.target.value,
                            }))
                          }
                          placeholder="Add an optional note for the decision email..."
                          maxLength={500}
                          className="block w-full min-h-[68px] rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-base sm:text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:ring-2 focus:ring-[#7B2D8E]/15 focus:outline-none resize-y"
                        />
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDecision(appeal.id, 'rejected')}
                          className="w-full sm:w-auto h-10 px-4 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {busy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          Decline
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDecision(appeal.id, 'approved')}
                          className="w-full sm:w-auto h-10 px-4 rounded-xl bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A] disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {busy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                          Approve &amp; Reinstate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 text-xs text-gray-500">
                      <p>
                        Reviewed {formatDateTime(appeal.reviewed_at)}
                        {appeal.reviewer_name ? ` by ${appeal.reviewer_name.trim()}` : ''}
                      </p>
                      {appeal.review_note && (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-700 whitespace-pre-wrap break-words">
                          <span className="font-semibold text-gray-900">Decision note: </span>
                          {appeal.review_note}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
