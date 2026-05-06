'use client'

/**
 * Admin live-chat oversight.
 *
 * Single page split into three tabs (kept on one route to avoid
 * churning the URL when switching context):
 *
 *   1. Live  — every waiting + active session right now, with the
 *              user, the staff member who picked it up (if any),
 *              waiting time, and a peek button that opens a
 *              read-only transcript drawer.
 *   2. History — closed sessions for the chosen window (7 / 30 / 90
 *              days) with rating and durations.
 *   3. Performance — per-staff scoreboard: handled count, avg
 *              response time, avg resolution time, avg rating.
 *
 * The transcript drawer is read-only — admin can observe but never
 * speak as a staff member, matching the "admin oversees, staff
 * communicates" rule the user described. Killing a stuck session is
 * the only mutating action exposed here.
 */

import { useState } from 'react'
import useSWR from 'swr'
import {
  Headphones,
  Activity,
  History,
  BarChart3,
  Clock,
  Star,
  X,
  AlertTriangle,
  Search,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json()
  })

type Tab = 'live' | 'history' | 'performance'

interface SessionRow {
  id: string
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  user_id: string
  user_first_name: string | null
  user_last_name: string | null
  user_email: string | null
  staff_id: string | null
  staff_first_name: string | null
  staff_last_name: string | null
  staff_avatar_url: string | null
  initial_topic: string | null
  rating: number | null
  rating_comment: string | null
  unread_for_staff: number
  created_at: string
  accepted_at: string | null
  closed_at: string | null
  last_message_at: string | null
  staff_response_seconds: number | null
  resolution_seconds: number | null
}

interface PerformanceRow {
  staff_id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  handled: number
  active_now: number
  avg_response_seconds: number | null
  avg_resolution_seconds: number | null
  avg_rating: number | null
  ratings_count: number
}

interface ListResponse {
  sessions: SessionRow[]
}

interface PerformanceResponse {
  performance: PerformanceRow[]
  range: { from: string; to: string; days: number }
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const min = Math.floor(seconds / 60)
  if (min < 60) return `${min}m ${Math.round(seconds % 60)}s`
  const hr = Math.floor(min / 60)
  return `${hr}h ${min % 60}m`
}

function StatusBadge({ status }: { status: SessionRow['status'] }) {
  const styles =
    status === 'waiting'
      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      : status === 'active'
        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
        : status === 'closed'
          ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        styles,
      )}
    >
      {status === 'active' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
      )}
      {status}
    </span>
  )
}

function fullName(first: string | null, last: string | null, fallback: string): string {
  const name = [first, last].filter(Boolean).join(' ').trim()
  return name || fallback
}

/**
 * Read-only transcript drawer. Slides in from the right; closing
 * removes the active session id from local state which unmounts
 * the drawer. Pulls all messages for the session, system events
 * included, so admins can see the entire flow including the
 * "Staff Adaeze joined the chat" handoff line.
 */
function TranscriptDrawer({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  const { data, isLoading } = useSWR<{
    session: SessionRow & {
      user_phone: string | null
    }
    messages: Array<{
      id: string
      sender_role: 'user' | 'staff' | 'admin' | 'system'
      sender_first_name: string | null
      sender_last_name: string | null
      body: string
      created_at: string
    }>
  }>(`/api/admin/live-chat/sessions/${sessionId}`, fetcher, {
    refreshInterval: 4000,
  })

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close transcript"
        className="flex-1 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="w-full max-w-md bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B2D8E]">
              Read-only transcript
            </p>
            {data?.session ? (
              <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                {fullName(
                  data.session.user_first_name,
                  data.session.user_last_name,
                  data.session.user_email || 'User',
                )}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {data?.session ? (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 text-[11px] text-gray-600 grid grid-cols-2 gap-y-1.5 gap-x-3">
            <span className="text-gray-400">Status</span>
            <StatusBadge status={data.session.status} />
            <span className="text-gray-400">Topic</span>
            <span className="text-gray-700 truncate">
              {data.session.initial_topic || '—'}
            </span>
            <span className="text-gray-400">Rep</span>
            <span className="text-gray-700 truncate">
              {data.session.staff_id
                ? fullName(
                    data.session.staff_first_name,
                    data.session.staff_last_name,
                    'Assigned',
                  )
                : 'Unassigned'}
            </span>
            <span className="text-gray-400">First reply</span>
            <span className="text-gray-700">
              {formatDuration(data.session.staff_response_seconds)}
            </span>
            <span className="text-gray-400">Resolution</span>
            <span className="text-gray-700">
              {formatDuration(data.session.resolution_seconds)}
            </span>
            {data.session.rating != null && (
              <>
                <span className="text-gray-400">Rating</span>
                <span className="text-gray-700 inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {data.session.rating}/5
                </span>
              </>
            )}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {isLoading && !data ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            </div>
          ) : null}

          {data?.messages.map((m) => {
            if (m.sender_role === 'system') {
              return (
                <div
                  key={m.id}
                  className="text-center text-[10.5px] uppercase tracking-wider text-gray-400 py-1"
                >
                  {m.body}
                </div>
              )
            }
            const mine = m.sender_role === 'user'
            return (
              <div
                key={m.id}
                className={cn('flex flex-col', mine ? 'items-start' : 'items-end')}
              >
                <span className="text-[10px] text-gray-400 px-1 mb-0.5">
                  {mine
                    ? fullName(
                        m.sender_first_name,
                        m.sender_last_name,
                        'Customer',
                      )
                    : fullName(
                        m.sender_first_name,
                        m.sender_last_name,
                        m.sender_role === 'admin' ? 'Admin' : 'Rep',
                      )}{' '}
                  · {formatRelative(m.created_at)}
                </span>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug whitespace-pre-wrap',
                    mine
                      ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      : 'bg-[#7B2D8E] text-white rounded-br-sm',
                  )}
                >
                  {m.body}
                </div>
              </div>
            )
          })}

          {data?.messages.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-8">
              No messages in this session yet.
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

/**
 * "Live" tab body. Polls every 4s — same cadence as the staff queue
 * — so admins see the same world-state staff do.
 */
function LiveTab({ onPeek }: { onPeek: (id: string) => void }) {
  const { data } = useSWR<ListResponse>(
    '/api/admin/live-chat/sessions?status=open',
    fetcher,
    { refreshInterval: 4000 },
  )
  const sessions = data?.sessions ?? []
  const waiting = sessions.filter((s) => s.status === 'waiting')
  const active = sessions.filter((s) => s.status === 'active')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard label="Waiting" value={waiting.length} hue="amber" />
        <SummaryCard label="Active" value={active.length} hue="emerald" />
        <SummaryCard
          label="Avg wait"
          value={
            waiting.length === 0
              ? '—'
              : formatDuration(
                  waiting.reduce(
                    (acc, s) =>
                      acc +
                      (Date.now() - new Date(s.created_at).getTime()) / 1000,
                    0,
                  ) / waiting.length,
                )
          }
          hue="purple"
        />
      </div>

      <SessionTable
        rows={sessions}
        emptyHint="Quiet right now — no waiting or active chats."
        onPeek={onPeek}
        showWait
      />
    </div>
  )
}

function HistoryTab({ onPeek }: { onPeek: (id: string) => void }) {
  const [days, setDays] = useState(7)
  const [search, setSearch] = useState('')
  const { data } = useSWR<ListResponse>(
    `/api/admin/live-chat/sessions?status=closed&days=${days}`,
    fetcher,
  )
  const sessions = data?.sessions ?? []
  const filtered = search.trim()
    ? sessions.filter((s) => {
        const q = search.toLowerCase()
        return (
          (s.user_first_name || '').toLowerCase().includes(q) ||
          (s.user_last_name || '').toLowerCase().includes(q) ||
          (s.user_email || '').toLowerCase().includes(q) ||
          (s.initial_topic || '').toLowerCase().includes(q) ||
          (s.staff_first_name || '').toLowerCase().includes(q)
        )
      })
    : sessions

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex bg-white rounded-full p-1 ring-1 ring-gray-200 self-start">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                days === d
                  ? 'bg-[#7B2D8E] text-white'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Last {d} days
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, rep, or topic"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-full ring-1 ring-gray-200 focus:ring-2 focus:ring-[#7B2D8E] focus:outline-none"
          />
        </div>
      </div>

      <SessionTable
        rows={filtered}
        emptyHint={
          search
            ? 'No history matched your search.'
            : 'No closed sessions in this window.'
        }
        onPeek={onPeek}
      />
    </div>
  )
}

function PerformanceTab() {
  const [days, setDays] = useState(30)
  const { data } = useSWR<PerformanceResponse>(
    `/api/admin/live-chat/performance?days=${days}`,
    fetcher,
  )
  const rows = data?.performance ?? []

  return (
    <div className="space-y-4">
      <div className="inline-flex bg-white rounded-full p-1 ring-1 ring-gray-200">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              days === d
                ? 'bg-[#7B2D8E] text-white'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {/* Mobile-first card layout. The table version was overflowing
          on small screens — labels truncated to "RESOLUT…" and the
          numeric columns squeezed to nothing. We render a stacked
          card per rep below md, then switch to the table from md
          and up where horizontal space is real. */}
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-gray-100 text-center text-xs text-gray-400 py-10">
            No staff activity in this window yet.
          </div>
        ) : (
          rows.map((r) => {
            const name = fullName(r.first_name, r.last_name, 'Rep')
            return (
              <div
                key={r.staff_id}
                className="bg-white rounded-2xl ring-1 ring-gray-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <StaffAvatar
                    url={r.avatar_url}
                    firstName={r.first_name}
                    lastName={r.last_name}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">
                      {name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate flex items-center gap-2">
                      <span>
                        {r.ratings_count} rating
                        {r.ratings_count === 1 ? '' : 's'}
                      </span>
                      {r.avg_rating != null ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {r.avg_rating.toFixed(1)}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {r.active_now > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {r.active_now} live
                    </span>
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <PerfStat label="Handled" value={String(r.handled)} />
                  <PerfStat
                    label="Avg reply"
                    value={formatDuration(r.avg_response_seconds)}
                  />
                  <PerfStat
                    label="Avg resolve"
                    value={formatDuration(r.avg_resolution_seconds)}
                  />
                </dl>
              </div>
            )
          })
        )}
      </div>

      {/* Desktop table — hidden below md so it never causes the page
          to scroll horizontally on a phone. */}
      <div className="hidden md:block bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-[10.5px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Rep</th>
                <th className="text-right font-semibold px-3 py-3">Handled</th>
                <th className="text-right font-semibold px-3 py-3">Active now</th>
                <th className="text-right font-semibold px-3 py-3">Avg first reply</th>
                <th className="text-right font-semibold px-3 py-3">Avg resolution</th>
                <th className="text-right font-semibold px-4 py-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-xs text-gray-400 py-10">
                    No staff activity in this window yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const name = fullName(r.first_name, r.last_name, 'Rep')
                  return (
                    <tr key={r.staff_id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <StaffAvatar
                            url={r.avatar_url}
                            firstName={r.first_name}
                            lastName={r.last_name}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {name}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {r.ratings_count} rating
                              {r.ratings_count === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums text-gray-900">
                        {r.handled}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums">
                        {r.active_now > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {r.active_now}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums text-gray-700">
                        {formatDuration(r.avg_response_seconds)}
                      </td>
                      <td className="text-right px-3 py-3 tabular-nums text-gray-700">
                        {formatDuration(r.avg_resolution_seconds)}
                      </td>
                      <td className="text-right px-4 py-3">
                        {r.avg_rating != null ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {r.avg_rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Tiny stat block used inside the mobile card view of the perf tab.
function PerfStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-2 py-2">
      <dt className="text-[9.5px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </dt>
      <dd className="text-[13px] font-semibold tabular-nums text-gray-900 mt-0.5">
        {value}
      </dd>
    </div>
  )
}

function StaffAvatar({
  url,
  firstName,
  lastName,
}: {
  url: string | null
  firstName: string | null
  lastName: string | null
}) {
  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'S'
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={fullName(firstName, lastName, 'Staff')}
        className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200"
      />
    )
  }
  return (
    <div className="h-9 w-9 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-semibold flex items-center justify-center ring-1 ring-[#7B2D8E]/20">
      {initials}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hue,
}: {
  label: string
  value: number | string
  hue: 'amber' | 'emerald' | 'purple'
}) {
  const tint =
    hue === 'amber'
      ? 'text-amber-600'
      : hue === 'emerald'
        ? 'text-emerald-600'
        : 'text-[#7B2D8E]'
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 px-5 py-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className={cn('text-2xl font-semibold mt-1 tabular-nums', tint)}>
        {value}
      </p>
    </div>
  )
}

function SessionTable({
  rows,
  emptyHint,
  onPeek,
  showWait = false,
}: {
  rows: SessionRow[]
  emptyHint: string
  onPeek: (id: string) => void
  showWait?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 text-[10.5px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Customer</th>
              <th className="text-left font-semibold px-3 py-3">Topic</th>
              <th className="text-left font-semibold px-3 py-3">Rep</th>
              <th className="text-left font-semibold px-3 py-3">Status</th>
              <th className="text-left font-semibold px-3 py-3">
                {showWait ? 'Waiting / Last activity' : 'Closed'}
              </th>
              <th className="text-left font-semibold px-3 py-3">Rating</th>
              <th className="text-right font-semibold px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-xs text-gray-400 py-10">
                  {emptyHint}
                </td>
              </tr>
            ) : (
              rows.map((s) => {
                const customer = fullName(
                  s.user_first_name,
                  s.user_last_name,
                  s.user_email || 'Customer',
                )
                const rep = s.staff_id
                  ? fullName(
                      s.staff_first_name,
                      s.staff_last_name,
                      'Assigned',
                    )
                  : null
                return (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {customer}
                        </p>
                        {s.user_email ? (
                          <p className="text-[11px] text-gray-500 truncate">
                            {s.user_email}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 max-w-xs">
                      <p className="text-gray-700 text-[13px] line-clamp-2">
                        {s.initial_topic || (
                          <span className="text-gray-400 italic">No topic</span>
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {rep ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <StaffAvatar
                            url={s.staff_avatar_url}
                            firstName={s.staff_first_name}
                            lastName={s.staff_last_name}
                          />
                          <p className="text-[13px] text-gray-700 truncate">
                            {rep}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 text-[12px]">
                          <AlertTriangle className="h-3 w-3" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-3 text-[12px] text-gray-600">
                      {showWait ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formatRelative(s.last_message_at || s.created_at)}
                        </span>
                      ) : (
                        formatRelative(s.closed_at)
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.rating != null ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-[13px]">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {s.rating}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[12px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onPeek(s.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E]/10 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Peek
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AdminLiveChatPage() {
  const [tab, setTab] = useState<Tab>('live')
  const [peekId, setPeekId] = useState<string | null>(null)

  const tabs: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
    { id: 'live', label: 'Live', icon: Activity },
    { id: 'history', label: 'History', icon: History },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-[#7B2D8E]">
            <Headphones className="h-5 w-5" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em]">
              Customer care oversight
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-1 text-balance">
            Live Chat
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-prose">
            Watch every conversation between customers and the front desk in
            real time, audit closed transcripts, and see how each rep is
            performing.
          </p>
        </div>
      </header>

      <nav className="inline-flex bg-white rounded-full p-1 ring-1 ring-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors',
                active
                  ? 'bg-[#7B2D8E] text-white'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </nav>

      {tab === 'live' && <LiveTab onPeek={(id) => setPeekId(id)} />}
      {tab === 'history' && <HistoryTab onPeek={(id) => setPeekId(id)} />}
      {tab === 'performance' && <PerformanceTab />}

      {peekId ? (
        <TranscriptDrawer sessionId={peekId} onClose={() => setPeekId(null)} />
      ) : null}
    </div>
  )
}
