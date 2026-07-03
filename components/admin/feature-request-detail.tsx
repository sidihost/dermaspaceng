'use client'

/**
 * Admin/staff triage detail for a single feature request.
 *
 * A focused workspace to move an idea through the pipeline, publish a
 * team response, pin/feature it, and see who's backing it — all on one
 * page rather than an inline card. Reads the public detail endpoint and
 * writes through the admin-guarded PATCH/DELETE routes.
 *
 * House style: flat white cards, hairline borders, brand purple, no
 * gradients or shadows.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  ChevronUp,
  ArrowLeft,
  Loader2,
  Pin,
  PinOff,
  Trash2,
  CalendarDays,
  Tag,
  User as UserIcon,
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
  updated_at: string
  first_name: string | null
  last_name: string | null
  username: string | null
  avatar_url: string | null
  vote_count: number
}

type Voter = {
  first_name: string | null
  last_name: string | null
  username: string | null
  avatar_url: string | null
}

type DetailResponse = {
  request: FeatureRequest
  voters: Voter[]
  error?: string
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

const CATEGORIES: Record<string, string> = {
  general: 'General',
  booking: 'Booking',
  account: 'Account',
  payments: 'Payments',
  services: 'Services',
  mobile: 'Mobile',
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function AdminFeatureRequestDetail({ id }: { id: string }) {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR<DetailResponse>(
    `/api/feature-requests/${id}`,
    fetcher,
    { revalidateOnFocus: false },
  )
  const req = data?.request

  const [note, setNote] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const noteValue = note ?? req?.admin_note ?? ''

  const patch = async (body: Record<string, unknown>) => {
    if (data && req) {
      mutate({ ...data, request: { ...req, ...normalize(body) } }, false)
    }
    await fetch(`/api/admin/feature-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
    mutate()
  }

  const saveNote = async () => {
    setSavingNote(true)
    await patch({ adminNote: noteValue })
    setSavingNote(false)
    setNote(null)
  }

  const remove = async () => {
    if (!confirm('Delete this request? This cannot be undone.')) return
    await fetch(`/api/admin/feature-requests/${id}`, { method: 'DELETE' }).catch(
      () => {},
    )
    router.push('/admin/feature-requests')
  }

  const author = req
    ? [req.first_name, req.last_name].filter(Boolean).join(' ') ||
      req.username ||
      'Client'
    : ''

  return (
    <div className="space-y-5">
      <Link
        href="/admin/feature-requests"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Back to all requests
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
        </div>
      ) : !req ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">This request could not be found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
          {/* Main */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium',
                      'bg-[#7B2D8E]/[0.06] text-[#7B2D8E]',
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[req.status])} aria-hidden />
                    {STATUS_OPTIONS.find((s) => s.value === req.status)?.label ?? req.status}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-500">
                    <Tag className="w-3 h-3" aria-hidden />
                    {CATEGORIES[req.category] ?? 'General'}
                  </span>
                  {req.pinned && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-[#7B2D8E]/20 text-[#7B2D8E]">
                      Featured
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => patch({ pinned: !req.pinned })}
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
                    onClick={remove}
                    title="Delete"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </div>

              <h1 className="mt-4 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight text-balance leading-snug">
                {req.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" aria-hidden />
                  <span className="font-medium text-gray-600">{author}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" aria-hidden />
                  {new Date(req.created_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="mt-5 h-px bg-gray-100" />

              <p className="mt-5 text-sm sm:text-[15px] text-gray-700 leading-relaxed whitespace-pre-line text-pretty">
                {req.description}
              </p>
            </div>

            {/* Status pipeline */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-900">Status</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Move this idea through the pipeline. The client sees the change on
                the roadmap.
              </p>
              <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => patch({ status: s.value })}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors',
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
            </div>

            {/* Team response */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-900">Team response</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                A public reply shown on the idea so people know it&apos;s been heard.
              </p>
              <textarea
                value={noteValue}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Write a public response the client will see…"
                className="mt-3 w-full px-3 py-2.5 text-[13px] rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none resize-none leading-relaxed"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={savingNote || noteValue === (req.admin_note ?? '')}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#6a2679] transition-colors disabled:opacity-50"
                >
                  {savingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                  Save response
                </button>
                {note !== null && note !== (req.admin_note ?? '') && (
                  <button
                    type="button"
                    onClick={() => setNote(null)}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Discard
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center gap-0.5 w-14 h-16 shrink-0 rounded-xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/5 text-[#7B2D8E]">
                  <ChevronUp className="w-5 h-5" aria-hidden />
                  <span className="text-lg font-bold leading-none tabular-nums">
                    {req.vote_count}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {req.vote_count} {req.vote_count === 1 ? 'vote' : 'votes'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Demand for this idea
                  </p>
                </div>
              </div>
            </div>

            {(data?.voters?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Supporters
                </p>
                <ul className="mt-3 space-y-2.5">
                  {data!.voters.slice(0, 10).map((v, i) => {
                    const name =
                      [v.first_name, v.last_name].filter(Boolean).join(' ') ||
                      v.username ||
                      'Client'
                    return (
                      <li key={i} className="flex items-center gap-2.5">
                        <Avatar name={name} src={v.avatar_url} />
                        <span className="text-[13px] text-gray-700 truncate">
                          {name}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {req.vote_count > (data?.voters?.length ?? 0) && (
                  <p className="mt-3 text-[11.5px] text-gray-400">
                    + {req.vote_count - (data?.voters?.length ?? 0)} more
                  </p>
                )}
              </div>
            )}

            <Link
              href={`/feature-requests/${req.id}`}
              target="_blank"
              className="flex items-center justify-center gap-1.5 h-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
            >
              View public page
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src || '/placeholder.svg'}
        alt={name}
        className="w-7 h-7 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#7B2D8E]/10 text-[11px] font-semibold text-[#7B2D8E] shrink-0"
      aria-hidden
    >
      {initials || 'C'}
    </span>
  )
}

function normalize(body: Record<string, unknown>): Partial<FeatureRequest> {
  const out: Partial<FeatureRequest> = {}
  if (typeof body.status === 'string') out.status = body.status
  if (typeof body.adminNote === 'string') out.admin_note = body.adminNote || null
  if (typeof body.pinned === 'boolean') out.pinned = body.pinned
  return out
}
