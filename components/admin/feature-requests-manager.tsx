'use client'

/**
 * Shared triage board for feature requests, used by both the admin
 * (/admin/feature-requests) and staff (/staff/feature-requests)
 * surfaces. Reads the same public board endpoint (which returns every
 * status when `status=all`) and writes through the admin-guarded
 * PATCH/DELETE endpoints.
 *
 * House style: flat white cards, hairline borders, brand purple, no
 * gradients or shadows.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ChevronUp,
  Loader2,
  Search,
  Pin,
  PinOff,
  Trash2,
  MessageSquare,
  ListTodo,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type FeatureRequest = {
  id: string
  title: string
  description: string
  category: string
  status: string
  admin_note: string | null
  pinned: boolean
  created_at: string
  first_name: string | null
  last_name: string | null
  username: string | null
  vote_count: number
}

type BoardResponse = {
  requests: FeatureRequest[]
  counts: { status: string; n: number }[]
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'declined', label: 'Declined' },
]

const STATUS_DOT: Record<string, string> = {
  open: 'bg-gray-400',
  under_review: 'bg-[#7B2D8E]',
  planned: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  shipped: 'bg-emerald-500',
  declined: 'bg-rose-400',
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function FeatureRequestsManager() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const { data, isLoading, mutate } = useSWR<BoardResponse>(
    `/api/feature-requests?sort=top&status=all`,
    fetcher,
    { revalidateOnFocus: false },
  )

  const requests = useMemo(() => {
    let list = data?.requests ?? []
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      )
    }
    return list
  }, [data, statusFilter, search])

  const totals = useMemo(() => {
    const counts = data?.counts ?? []
    const sum = counts.reduce((a, c) => a + c.n, 0)
    const shipped = counts.find((c) => c.status === 'shipped')?.n ?? 0
    const open = counts.find((c) => c.status === 'open')?.n ?? 0
    return { sum, shipped, open }
  }, [data])

  const patch = async (id: string, body: Record<string, unknown>) => {
    // Optimistic: reflect the change immediately, reconcile after.
    if (data) {
      mutate(
        {
          ...data,
          requests: data.requests.map((r) =>
            r.id === id ? { ...r, ...normalize(body) } : r,
          ),
        },
        false,
      )
    }
    await fetch(`/api/admin/feature-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
    mutate()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this request? This cannot be undone.')) return
    if (data) {
      mutate(
        { ...data, requests: data.requests.filter((r) => r.id !== id) },
        false,
      )
    }
    await fetch(`/api/admin/feature-requests/${id}`, {
      method: 'DELETE',
    }).catch(() => {})
    mutate()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <ListTodo className="w-4 h-4 text-[#7B2D8E]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-none tracking-tight">
              Feature Requests
            </h1>
            <p className="text-xs text-gray-500 mt-1.5 max-w-xl leading-relaxed">
              Ideas submitted by clients. Triage them through the pipeline and
              reply so people see their voice matters.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Stat label="Total" value={totals.sum} />
          <span className="h-6 w-px bg-gray-200" aria-hidden />
          <Stat label="Open" value={totals.open} accent />
          <span className="h-6 w-px bg-gray-200" aria-hidden />
          <Stat label="Shipped" value={totals.shipped} muted />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests…"
            className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto max-w-full">
          {['all', ...STATUS_OPTIONS.map((s) => s.value)].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'text-xs font-medium px-3 h-8 rounded-md transition-colors whitespace-nowrap',
                statusFilter === s
                  ? 'bg-white text-[#7B2D8E]'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              {s === 'all' ? 'All' : STATUS_OPTIONS.find((o) => o.value === s)?.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No requests match your filters.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((req) => (
            <li key={req.id}>
              <AdminRequestCard
                req={req}
                onStatus={(status) => patch(req.id, { status })}
                onNote={(adminNote) => patch(req.id, { adminNote })}
                onPin={() => patch(req.id, { pinned: !req.pinned })}
                onDelete={() => remove(req.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AdminRequestCard({
  req,
  onStatus,
  onNote,
  onPin,
  onDelete,
}: {
  req: FeatureRequest
  onStatus: (status: string) => void
  onNote: (note: string) => void
  onPin: () => void
  onDelete: () => void
}) {
  const [note, setNote] = useState(req.admin_note ?? '')
  const [editing, setEditing] = useState(false)
  const author =
    [req.first_name, req.last_name].filter(Boolean).join(' ') ||
    req.username ||
    'Client'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center justify-center gap-0.5 w-12 h-14 shrink-0 rounded-xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/5 text-[#7B2D8E]">
          <ChevronUp className="w-4 h-4" aria-hidden />
          <span className="text-sm font-bold leading-none tabular-nums">{req.vote_count}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/admin/feature-requests/${req.id}`}
              className="group text-sm font-semibold text-gray-900 leading-snug hover:text-[#7B2D8E] transition-colors"
            >
              {req.title}
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={`/admin/feature-requests/${req.id}`}
                title="Open detail"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-[#7B2D8E] transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={onPin}
                title={req.pinned ? 'Unpin' : 'Pin to top'}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  req.pinned
                    ? 'text-[#7B2D8E] bg-[#7B2D8E]/10'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                )}
              >
                {req.pinned ? <Pin className="w-4 h-4" aria-hidden /> : <PinOff className="w-4 h-4" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={onDelete}
                title="Delete"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>

          <p className="mt-1.5 text-[13px] text-gray-600 leading-relaxed">
            {req.description}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px] text-gray-400">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium',
                'bg-[#7B2D8E]/[0.06] text-[#7B2D8E]',
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[req.status])} aria-hidden />
              {STATUS_OPTIONS.find((s) => s.value === req.status)?.label ?? req.status}
            </span>
            <span aria-hidden>·</span>
            <span className="font-medium text-gray-500">{author}</span>
            <span aria-hidden>·</span>
            <span className="capitalize">{req.category}</span>
            <span aria-hidden>·</span>
            <span>{new Date(req.created_at).toLocaleDateString()}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {req.vote_count} {req.vote_count === 1 ? 'vote' : 'votes'}
            </span>
          </div>

          {/* Status pipeline */}
          <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Move to status
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onStatus(s.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors',
                  req.status === s.value
                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 text-[#7B2D8E]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[s.value])} aria-hidden />
                {s.label}
              </button>
            ))}
          </div>

          {/* Team response */}
          <div className="mt-3">
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Write a public response the client will see…"
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none resize-none leading-relaxed"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onNote(note)
                      setEditing(false)
                    }}
                    className="h-8 px-3 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#6a2679] transition-colors"
                  >
                    Save response
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNote(req.admin_note ?? '')
                      setEditing(false)
                    }}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : req.admin_note ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="w-full text-left rounded-lg border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.04] px-3 py-2 hover:border-[#7B2D8E]/30 transition-colors"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7B2D8E]">
                  Team response · tap to edit
                </p>
                <p className="mt-0.5 text-[13px] text-gray-700 leading-relaxed">
                  {req.admin_note}
                </p>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B2D8E] hover:text-[#5A1D6A] transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden />
                Add a public response
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
  muted,
}: {
  label: string
  value: number
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div className="leading-tight">
      <div
        className={cn(
          'text-base font-semibold tabular-nums',
          accent ? 'text-[#7B2D8E]' : muted ? 'text-gray-500' : 'text-gray-900',
        )}
      >
        {value}
      </div>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}

// Map the PATCH body back onto the local row shape for optimistic UI.
function normalize(body: Record<string, unknown>): Partial<FeatureRequest> {
  const out: Partial<FeatureRequest> = {}
  if (typeof body.status === 'string') out.status = body.status
  if (typeof body.adminNote === 'string') out.admin_note = body.adminNote || null
  if (typeof body.pinned === 'boolean') out.pinned = body.pinned
  return out
}
