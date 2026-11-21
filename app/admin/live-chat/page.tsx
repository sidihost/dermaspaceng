'use client'

/**
 * Admin Live Chat Command Center
 *
 * Responsive 3-pane workspace adhering strictly to Dermaspace's flat design
 * system (#7B2D8E, #5A1D6A, #FAF6FB, #FFFFFF, border-gray-200;
 * zero shadows, zero gradients, zero red buttons).
 *
 * Tabs:
 *   1. Live Desk   — 3-pane real-time inbox (Queue | Conversation | Profile Details)
 *   2. History     — Closed sessions (7 / 30 / 90 days) with full transcript + profile details
 *   3. Performance — Per-staff response, resolution, and rating scoreboard
 */

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { mutate as swrMutate } from 'swr'
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  History,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  PanelRight,
  Pencil,
  Phone,
  PhoneOff,
  Search,
  Send,
  Shield,
  Smartphone,
  Star,
  Tablet,
  Ticket,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { markSurfaceSeen } from '@/components/admin/sidebar'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { RepAvatar } from '@/components/shared/derma-inline-live-chat'
import { useNotify } from '@/components/shared/notify'
import {
  formatWaitSeconds,
  getLiveChatStatusMeta,
  resolveSupportId,
} from '@/lib/support-and-chat'
import {
  formatChatTimestamp,
  formatLiveChatTranscriptText,
  getVisitorPresence,
  type VisitorMetadata,
  type VisitorPresenceInfo,
} from '@/lib/visitor-telemetry'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('Request failed')
    return r.json()
  })

type Tab = 'live' | 'history' | 'performance'
type QueueFilter = 'all' | 'waiting' | 'active'

interface SessionRow {
  id: string
  support_code?: string | null
  status: 'waiting' | 'active' | 'closed' | 'abandoned'
  user_id: string | null
  user_first_name: string | null
  user_last_name: string | null
  user_email: string | null
  user_phone?: string | null
  user_avatar_url?: string | null
  is_guest?: boolean
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  visitor_location?: string | null
  visitor_browser?: string | null
  visitor_os?: string | null
  visitor_device?: string | null
  visitor_timezone?: string | null
  visitor_page_url?: string | null
  visitor_referrer?: string | null
  visitor_language?: string | null
  visitor_screen?: string | null
  visitor_ip?: string | null
  customer_last_seen_at?: string | null
  customer_typing_at?: string | null
  staff_id: string | null
  staff_first_name: string | null
  staff_last_name: string | null
  staff_display_name?: string | null
  staff_avatar_url: string | null
  initial_topic: string | null
  rating: number | null
  rating_comment: string | null
  unread_for_staff: number
  created_at: string
  escalated_at?: string
  accepted_at: string | null
  closed_at: string | null
  last_message_at: string | null
  last_activity_at?: string | null
  staff_response_seconds: number | null
  resolution_seconds: number | null
  message_count?: number
}

interface SessionMessage {
  id: string
  sender_role: 'user' | 'staff' | 'admin' | 'system'
  sender_id?: string | null
  sender_first_name: string | null
  sender_last_name: string | null
  sender_name?: string | null
  sender_avatar_url?: string | null
  body: string
  created_at: string
  _pending?: boolean
}

interface SessionDetailResponse {
  session: SessionRow
  messages: SessionMessage[]
  customerTyping?: boolean
  customerLastSeenAt?: string | null
  presence?: VisitorPresenceInfo
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

const ADMIN_DISPLAY_PRESETS = ['Admin', 'Franca', 'Itunu', 'Juwon'] as const

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  if (sec < 60) return 'now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

function formatDuration(seconds: number | null | undefined): string {
  return formatWaitSeconds(seconds ?? null)
}

function formatVisitorLocalTime(timezone: string | null | undefined): string | null {
  if (!timezone) return null
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())
  } catch {
    return null
  }
}

function fullName(
  first: string | null | undefined,
  last: string | null | undefined,
  fallback: string,
): string {
  const name = [first, last].filter(Boolean).join(' ').trim()
  return name || fallback
}

function getSessionCustomerLabel(session: SessionRow): string {
  const isGuest = Boolean(session.is_guest || !session.user_id)
  return isGuest
    ? session.guest_name?.trim() || 'Anonymous Visitor'
    : fullName(
        session.user_first_name,
        session.user_last_name,
        session.user_email || 'Customer',
      )
}

function getSessionCustomerInitials(session: SessionRow): string {
  const label = getSessionCustomerLabel(session)
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || '?'
  )
}

function isJoinMilestone(body: string): boolean {
  return /\b(joined the chat|took over the chat)\b/i.test(body)
}

function extractVisitorMetadata(session: SessionRow): Partial<VisitorMetadata> {
  return {
    location: session.visitor_location ?? null,
    ip: session.visitor_ip ?? null,
    browser: session.visitor_browser ?? null,
    os: session.visitor_os ?? null,
    device: session.visitor_device ?? null,
    timezone: session.visitor_timezone ?? null,
    pageUrl: session.visitor_page_url ?? null,
    referrer: session.visitor_referrer ?? null,
    language: session.visitor_language ?? null,
    screen: session.visitor_screen ?? null,
  }
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AdminLiveChatPage() {
  const [tab, setTab] = useState<Tab>('live')
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null)
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null)

  const openQuery = useSWR<ListResponse>(
    '/api/admin/live-chat/sessions?status=open',
    fetcher,
    { refreshInterval: 3500 },
  )

  const openSessions = useMemo(() => openQuery.data?.sessions ?? [], [openQuery.data?.sessions])
  const waitingSessions = useMemo(
    () => openSessions.filter((s) => s.status === 'waiting'),
    [openSessions],
  )
  const activeSessions = useMemo(
    () => openSessions.filter((s) => s.status === 'active'),
    [openSessions],
  )

  useEffect(() => {
    markSurfaceSeen('live-chat', waitingSessions.length)
  }, [waitingSessions.length])

  // Auto-select first open session on desktop when entering Live Desk
  useEffect(() => {
    if (tab !== 'live') return
    if (selectedLiveId && openSessions.some((s) => s.id === selectedLiveId)) return
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      if (selectedLiveId && !openSessions.some((s) => s.id === selectedLiveId)) {
        setSelectedLiveId(null)
      }
      return
    }
    const first = waitingSessions[0] || activeSessions[0] || openSessions[0]
    setSelectedLiveId(first ? first.id : null)
  }, [tab, openSessions, waitingSessions, activeSessions, selectedLiveId])

  const avgWait = useMemo(() => {
    if (waitingSessions.length === 0) return '—'
    const avgSec =
      waitingSessions.reduce(
        (acc, s) => acc + Math.max(0, (Date.now() - new Date(s.created_at).getTime()) / 1000),
        0,
      ) / waitingSessions.length
    return formatDuration(avgSec)
  }, [waitingSessions])

  return (
    <div className="space-y-4 min-w-0">
      {/* Top Command Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Live Chat
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2D8E]/20 bg-[#FAF6FB] px-2.5 py-0.5 text-[11px] font-semibold text-[#5A1D6A] tabular-nums">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  openSessions.length > 0 ? 'bg-[#7B2D8E]' : 'bg-gray-300',
                )}
              />
              {openSessions.length} open
            </span>
            {waitingSessions.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E] px-2.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                {waitingSessions.length} waiting
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-gray-500 mt-0.5">
            Monitor live conversations, inspect anonymous visitor details, reply directly, and review team performance.
          </p>
        </div>

        {/* Segmented Navigation */}
        <nav
          aria-label="Live chat views"
          className="flex w-full sm:w-auto sm:inline-flex bg-white rounded-full p-1 border border-gray-200 shrink-0"
        >
          {(
            [
              { id: 'live', label: 'Live Desk', icon: MessageSquare, count: openSessions.length },
              { id: 'history', label: 'History', icon: History, count: null },
              { id: 'performance', label: 'Performance', icon: BarChart3, count: null },
            ] as const
          ).map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
                  active
                    ? 'bg-[#7B2D8E] text-white'
                    : 'text-gray-600 hover:text-[#5A1D6A]',
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.count !== null && item.count > 0 && (
                  <span
                    className={cn(
                      'text-[10.5px] tabular-nums',
                      active ? 'text-white/85' : 'text-[#7B2D8E]',
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Compact Metric Strip (Live Desk) */}
      {tab === 'live' && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <MetricTile
            icon={Clock}
            label="Waiting queue"
            value={waitingSessions.length}
            highlight={waitingSessions.length > 0}
          />
          <MetricTile
            icon={MessageSquare}
            label="Active chats"
            value={activeSessions.length}
          />
          <MetricTile
            icon={Activity}
            label="Avg wait"
            value={avgWait}
          />
        </div>
      )}

      {/* TAB 1: LIVE DESK (3-PANE RESPONSIVE WORKSPACE) */}
      {tab === 'live' && (
        <LiveDeskWorkspace
          sessions={openSessions}
          isLoading={openQuery.isLoading}
          selectedId={selectedLiveId}
          onSelect={setSelectedLiveId}
          onSessionRemoved={(removedId) => {
            if (selectedLiveId === removedId) {
              const next = openSessions.find((s) => s.id !== removedId)
              setSelectedLiveId(next ? next.id : null)
            }
          }}
        />
      )}

      {/* TAB 2: HISTORY */}
      {tab === 'history' && (
        <HistoryTab onOpenSession={(id) => setHistoryDetailId(id)} />
      )}

      {/* TAB 3: PERFORMANCE */}
      {tab === 'performance' && <PerformanceTab />}

      {/* History Full Session Viewer Modal / Drawer */}
      {historyDetailId && (
        <HistorySessionOverlay
          sessionId={historyDetailId}
          onClose={() => setHistoryDetailId(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricTile
// ---------------------------------------------------------------------------

function MetricTile({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof Clock
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-3.5 py-3 flex items-center gap-3 min-w-0',
        highlight
          ? 'bg-[#FAF6FB] border-[#7B2D8E]/30'
          : 'bg-white border-gray-200',
      )}
    >
      <span
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
          highlight
            ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
            : 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/15',
        )}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-500 truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LiveDeskWorkspace — 3-Pane Responsive Command Center
// ---------------------------------------------------------------------------

function LiveDeskWorkspace({
  sessions,
  isLoading,
  selectedId,
  onSelect,
  onSessionRemoved,
}: {
  sessions: SessionRow[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSessionRemoved: (id: string) => void
}) {
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(true)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)

  const waitingCount = useMemo(
    () => sessions.filter((s) => s.status === 'waiting').length,
    [sessions],
  )
  const activeCount = useMemo(
    () => sessions.filter((s) => s.status === 'active').length,
    [sessions],
  )

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sessions.filter((s) => {
      if (queueFilter === 'waiting' && s.status !== 'waiting') return false
      if (queueFilter === 'active' && s.status !== 'active') return false
      if (!q) return true
      const code = resolveSupportId(s.support_code, s.id).toLowerCase()
      return (
        code.includes(q) ||
        getSessionCustomerLabel(s).toLowerCase().includes(q) ||
        (s.user_email || '').toLowerCase().includes(q) ||
        (s.guest_email || '').toLowerCase().includes(q) ||
        (s.visitor_location || '').toLowerCase().includes(q) ||
        (s.initial_topic || '').toLowerCase().includes(q) ||
        (s.staff_display_name || '').toLowerCase().includes(q)
      )
    })
  }, [sessions, queueFilter, search])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex min-h-[560px] h-[calc(100dvh-250px)] sm:h-[calc(100dvh-245px)] max-h-[820px]">
      {/* PANE 1: LEFT QUEUE RAIL */}
      <aside
        className={cn(
          'w-full lg:w-[290px] xl:w-[310px] shrink-0 flex flex-col border-r border-gray-200 bg-white min-h-0',
          selectedId ? 'hidden lg:flex' : 'flex',
        )}
      >
        <div className="p-3 border-b border-gray-200 space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, visitor, location…"
              className="w-full rounded-xl border border-gray-200 bg-[#FBF9FC] pl-8 pr-8 py-2 text-base sm:text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear queue search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filter open live chats"
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#FAF6FB] border border-gray-200/80"
          >
            {(
              [
                { id: 'all', label: 'All', count: sessions.length },
                { id: 'waiting', label: 'Waiting', count: waitingCount },
                { id: 'active', label: 'Active', count: activeCount },
              ] as const
            ).map((f) => {
              const active = queueFilter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setQueueFilter(f.id)}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer',
                    active
                      ? 'bg-[#7B2D8E] text-white'
                      : 'text-gray-600 hover:text-[#5A1D6A]',
                  )}
                >
                  <span>{f.label}</span>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      active ? 'text-white/85' : 'text-gray-400',
                    )}
                  >
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Queue Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {isLoading && sessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E] mx-auto mb-2" />
              Loading live sessions…
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-14 px-5 text-center">
              <div className="w-11 h-11 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/15 text-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-[13px] font-semibold text-gray-900">
                {search
                  ? 'No matching live chats'
                  : queueFilter === 'waiting'
                    ? 'No visitors waiting'
                    : queueFilter === 'active'
                      ? 'No active chats'
                      : 'Queue is quiet'}
              </p>
              <p className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">
                {search
                  ? 'Try another Support ID, name, or city.'
                  : 'Incoming live chats from Derma AI appear here automatically.'}
              </p>
            </div>
          ) : (
            filteredSessions.map((s) => (
              <QueueListRow
                key={s.id}
                session={s}
                selected={selectedId === s.id}
                onSelect={() => {
                  onSelect(s.id)
                  setMobileProfileOpen(false)
                }}
              />
            ))
          )}
        </div>
      </aside>

      {/* PANE 2 + PANE 3: CONVERSATION & PROFILE DETAILS */}
      <div
        className={cn(
          'flex-1 min-w-0 flex overflow-hidden bg-[#FBF9FC]',
          selectedId ? 'flex' : 'hidden lg:flex',
        )}
      >
        {selectedId ? (
          <AdminSessionWorkspace
            sessionId={selectedId}
            desktopProfileOpen={desktopProfileOpen}
            mobileProfileOpen={mobileProfileOpen}
            onToggleProfile={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                setMobileProfileOpen((v) => !v)
              } else {
                setDesktopProfileOpen((v) => !v)
              }
            }}
            onCloseMobileProfile={() => setMobileProfileOpen(false)}
            onBack={() => {
              onSelect(null)
              setMobileProfileOpen(false)
            }}
            onDeleted={() => {
              onSessionRemoved(selectedId)
              setMobileProfileOpen(false)
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 mx-auto rounded-full bg-white border border-gray-200 text-[#7B2D8E] flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h2 className="text-[15.5px] font-semibold text-gray-900">
                Select a live conversation
              </h2>
              <p className="text-[12.5px] text-gray-500 mt-1.5 leading-relaxed">
                Pick any waiting or active chat on the left to inspect anonymous visitor details, check online status, or jump in with a reply.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QueueListRow({
  session,
  selected,
  onSelect,
}: {
  session: SessionRow
  selected: boolean
  onSelect: () => void
}) {
  const name = getSessionCustomerLabel(session)
  const initials = getSessionCustomerInitials(session)
  const supportCode = resolveSupportId(session.support_code, session.id)
  const isGuest = Boolean(session.is_guest || !session.user_id)
  const isWaiting = session.status === 'waiting'
  const presence = getVisitorPresence({
    status: session.status,
    lastSeenAt: session.customer_last_seen_at,
    lastActivityAt: session.last_message_at || session.last_activity_at,
  })
  const repLabel = session.staff_id
    ? session.staff_display_name ||
      fullName(session.staff_first_name, session.staff_last_name, 'Rep')
    : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3.5 py-3 flex items-start gap-3 transition-colors cursor-pointer',
        selected ? 'bg-[#FAF6FB]' : 'bg-white hover:bg-[#FBF9FC]',
      )}
    >
      {/* Avatar with real-time online/offline dot */}
      <div className="relative shrink-0 mt-0.5">
        {session.user_avatar_url ? (
          <Image
            src={session.user_avatar_url}
            alt={name}
            width={40}
            height={40}
            referrerPolicy="no-referrer"
            className={cn(
              'w-10 h-10 rounded-full object-cover border',
              selected ? 'border-[#7B2D8E]/40' : 'border-gray-200',
            )}
          />
        ) : (
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold border',
              selected
                ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                : 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/20',
            )}
          >
            {initials}
          </div>
        )}
        <span
          aria-hidden="true"
          title={presence.label}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            presence.state === 'online'
              ? 'bg-[#7B2D8E]'
              : isWaiting
                ? 'bg-[#7B2D8E]/55'
                : 'bg-gray-300',
          )}
        />
      </div>

      {/* Main queue info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className={cn(
                'text-[13px] font-semibold truncate',
                selected ? 'text-[#5A1D6A]' : 'text-gray-900',
              )}
            >
              {name}
            </p>
            {isGuest && (
              <span className="text-[10px] font-medium text-[#7B2D8E] shrink-0">
                · Guest
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {session.unread_for_staff > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#7B2D8E] text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                {session.unread_for_staff}
              </span>
            )}
            <span className="text-[10.5px] text-gray-400 tabular-nums">
              {formatRelative(session.last_message_at || session.created_at)}
            </span>
          </div>
        </div>

        <p className="text-[12px] text-gray-600 line-clamp-1 mt-0.5 leading-snug">
          {session.initial_topic || 'Customer inquiry'}
        </p>

        <div className="flex items-center gap-1.5 mt-1 text-[10.5px] text-gray-400 truncate">
          <span className="font-mono font-medium text-[#7B2D8E] shrink-0">
            {supportCode}
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={cn(
              'font-medium shrink-0',
              presence.state === 'online' || isWaiting
                ? 'text-[#7B2D8E]'
                : 'text-gray-500',
            )}
          >
            {presence.state === 'online'
              ? 'Online'
              : isWaiting
                ? 'Waiting'
                : 'Offline'}
          </span>
          {session.visitor_location ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-gray-500">{session.visitor_location}</span>
            </>
          ) : repLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate text-gray-500">With {repLabel}</span>
            </>
          ) : null}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// AdminSessionWorkspace — Center Conversation + Docked/Slide-over Profile Details
// ---------------------------------------------------------------------------

function AdminSessionWorkspace({
  sessionId,
  desktopProfileOpen,
  mobileProfileOpen,
  onToggleProfile,
  onCloseMobileProfile,
  onBack,
  onDeleted,
  isOverlay = false,
}: {
  sessionId: string
  desktopProfileOpen: boolean
  mobileProfileOpen: boolean
  onToggleProfile: () => void
  onCloseMobileProfile: () => void
  onBack?: () => void
  onDeleted: () => void
  isOverlay?: boolean
}) {
  const notify = useNotify()
  const sessionUrl = `/api/admin/live-chat/sessions/${sessionId}`

  const { data, isLoading, mutate } = useSWR<SessionDetailResponse>(
    sessionUrl,
    fetcher,
    { refreshInterval: 2500 },
  )

  const [pending, setPending] = useState<SessionMessage[]>([])
  const [displayName, setDisplayName] = useState<string>('')
  const [editingDisplay, setEditingDisplay] = useState<boolean>(false)
  const [customDisplay, setCustomDisplay] = useState<string>('')
  const [savingAlias, setSavingAlias] = useState(false)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const typingSentAtRef = useRef<number>(0)
  const typingIdleTimerRef = useRef<number | null>(null)

  // Reset per-session UI state when switching sessions
  useEffect(() => {
    setDraft('')
    setPending([])
    setSendError(null)
    setEndDialogOpen(false)
    setDeleteDialogOpen(false)
    typingSentAtRef.current = 0
    if (typingIdleTimerRef.current) {
      window.clearTimeout(typingIdleTimerRef.current)
      typingIdleTimerRef.current = null
    }
  }, [sessionId])

  // Load saved admin front-desk display name
  useEffect(() => {
    let activeMount = true
    ;(async () => {
      try {
        const res = await fetch('/api/staff/profile', { credentials: 'include' })
        if (!activeMount) return
        if (res.ok) {
          const json = (await res.json().catch(() => null)) as {
            profile?: { displayName?: string | null }
          } | null
          const stored = json?.profile?.displayName?.trim()
          if (stored) {
            setDisplayName(stored)
            return
          }
        }
        setEditingDisplay(true)
      } catch {
        if (activeMount) setEditingDisplay(true)
      }
    })()
    return () => {
      activeMount = false
    }
  }, [])

  // Reconcile optimistic messages against polled server messages
  useEffect(() => {
    if (!data?.messages || pending.length === 0) return
    const serverBodies = new Set(
      data.messages
        .filter((m) => m.sender_role === 'staff' || m.sender_role === 'admin')
        .map((m) => `${m.body}|${new Date(m.created_at).getTime() >> 10}`),
    )
    setPending((prev) =>
      prev.filter((p) => {
        const key = `${p.body}|${new Date(p.created_at).getTime() >> 10}`
        if (serverBodies.has(key)) return false
        const age = Date.now() - new Date(p.created_at).getTime()
        return age < 60_000
      }),
    )
  }, [data?.messages, pending.length])

  // Auto-scroll when messages arrive or visitor starts typing
  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [data?.messages?.length, pending.length, data?.customerTyping])

  // Throttled admin typing heartbeat so the customer sees "[Name] is typing..."
  const postAdminTyping = useCallback(
    (isTyping: boolean) => {
      fetch(`/api/staff/live-chat/sessions/${sessionId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          isTyping,
          displayName: displayName || undefined,
        }),
      }).catch(() => {})
    },
    [sessionId, displayName],
  )

  const notifyAdminTyping = useCallback(
    (isTyping: boolean) => {
      if (typingIdleTimerRef.current) {
        window.clearTimeout(typingIdleTimerRef.current)
        typingIdleTimerRef.current = null
      }
      if (!isTyping) {
        typingSentAtRef.current = 0
        postAdminTyping(false)
        return
      }
      const now = Date.now()
      if (now - typingSentAtRef.current >= 2200) {
        typingSentAtRef.current = now
        postAdminTyping(true)
      }
      typingIdleTimerRef.current = window.setTimeout(() => {
        typingSentAtRef.current = 0
        postAdminTyping(false)
      }, 4500)
    },
    [postAdminTyping],
  )

  const persistDisplayName = async (value: string) => {
    const cleaned = value.trim()
    if (!cleaned || savingAlias) return
    setSavingAlias(true)
    try {
      const res = await fetch('/api/staff/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName: cleaned }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not save alias.')
      }
      setDisplayName(cleaned)
      setEditingDisplay(false)
      await mutate()
      notify.success('Alias updated', `Replies will appear as ${cleaned}.`)
    } catch (err) {
      notify.error(
        'Could not update alias',
        err instanceof Error ? err.message : 'Please try again.',
      )
    } finally {
      setSavingAlias(false)
    }
  }

  const session = data?.session ?? null
  const isLiveStatus = session?.status === 'waiting' || session?.status === 'active'
  const supportCode = session ? resolveSupportId(session.support_code, session.id) : ''
  const customerLabel = session ? getSessionCustomerLabel(session) : 'Visitor'
  const customerInitials = session ? getSessionCustomerInitials(session) : '?'
  const isGuest = Boolean(session && (session.is_guest || !session.user_id))
  const presence: VisitorPresenceInfo | null = useMemo(() => {
    if (data?.presence) return data.presence
    if (!session) return null
    return getVisitorPresence({
      status: session.status,
      lastSeenAt: session.customer_last_seen_at,
      lastActivityAt: session.last_message_at || session.last_activity_at,
    })
  }, [data?.presence, session])
  const customerTyping = Boolean(data?.customerTyping && isLiveStatus)

  const mergedMessages = useMemo(() => {
    return [...(data?.messages ?? []), ...pending].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }, [data?.messages, pending])

  const endSession = async () => {
    if (closing) return
    setClosing(true)
    setSendError(null)
    try {
      const res = await fetch(sessionUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not close session.')
      }
      notifyAdminTyping(false)
      await Promise.all([
        mutate(),
        swrMutate((key) => typeof key === 'string' && key.startsWith('/api/admin/live-chat/')),
      ])
      setEndDialogOpen(false)
      notify.info('Live chat ended', `${supportCode} was closed and moved to history.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to end session.'
      setSendError(msg)
      notify.error('Could not end chat', msg)
    } finally {
      setClosing(false)
    }
  }

  const deleteSession = async () => {
    if (deleting) return
    setDeleting(true)
    setSendError(null)
    try {
      const res = await fetch(sessionUrl, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not delete session.')
      }
      await mutate(undefined, { revalidate: false })
      setDeleteDialogOpen(false)
      notify.success(
        'Live chat deleted',
        `${customerLabel} (${supportCode}) was permanently removed.`,
      )
      onDeleted()
      void swrMutate(
        (key) =>
          typeof key === 'string' &&
          key.startsWith('/api/admin/live-chat/') &&
          key !== sessionUrl,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete session.'
      setSendError(msg)
      notify.error('Could not delete chat', msg)
    } finally {
      setDeleting(false)
    }
  }

  const sendMessage = async () => {
    const text = draft.trim()
    if (!text || sending) return
    if (!displayName) {
      setEditingDisplay(true)
      setSendError('Choose or enter your front-desk display name before replying.')
      return
    }
    setSending(true)
    setSendError(null)
    notifyAdminTyping(false)

    const optimistic: SessionMessage = {
      id: `optimistic-${Date.now()}`,
      sender_role: 'admin',
      sender_first_name: displayName,
      sender_last_name: null,
      body: text,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    setPending((prev) => [...prev, optimistic])
    setDraft('')

    try {
      const res = await fetch(`${sessionUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: text, displayName }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not send message.')
      }
      await Promise.all([
        mutate(),
        swrMutate('/api/admin/live-chat/sessions?status=open'),
      ])
    } catch (err) {
      setPending((prev) => prev.filter((p) => p.id !== optimistic.id))
      setDraft(text)
      setSendError(err instanceof Error ? err.message : 'Send failed.')
    } finally {
      setSending(false)
      requestAnimationFrame(() => composerRef.current?.focus())
    }
  }

  const copySupportCode = () => {
    if (!supportCode || typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(supportCode)
      .then(() => {
        setCopiedId(true)
        notify.info('Support ID copied', supportCode)
        window.setTimeout(() => setCopiedId(false), 1600)
      })
      .catch(() => {})
  }

  const downloadTranscript = () => {
    if (!session) return
    const text = formatLiveChatTranscriptText({
      supportCode,
      customerName: customerLabel,
      customerEmail: session.user_email || session.guest_email,
      topic: session.initial_topic,
      status: session.status,
      visitor: extractVisitorMetadata(session),
      messages: mergedMessages.map((m) => ({
        sender_role: m.sender_role === 'admin' ? 'staff' : m.sender_role,
        sender_name:
          m.sender_role === 'user'
            ? customerLabel
            : fullName(m.sender_first_name, m.sender_last_name, 'Dermaspace Care'),
        body: m.body,
        created_at: m.created_at,
      })),
    })
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dermaspace-chat-${supportCode.toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    notify.success('Transcript downloaded', `${supportCode} saved as .txt.`)
  }

  if (isLoading && !session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FBF9FC]">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E]" />
          Loading conversation…
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FBF9FC]">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-gray-900">Session unavailable</p>
          <p className="text-xs text-gray-500">
            This live chat may have been removed.
          </p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mt-1 px-4 py-1.5 rounded-full bg-[#7B2D8E] text-white text-xs font-semibold cursor-pointer"
            >
              Back to queue
            </button>
          )}
        </div>
      </div>
    )
  }

  const repName = session.staff_id
    ? session.staff_display_name ||
      fullName(session.staff_first_name, session.staff_last_name, 'Assigned rep')
    : null
  const envPreview = [
    session.visitor_location,
    session.visitor_browser,
    session.visitor_device,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      {/* CENTER CONVERSATION COLUMN */}
      <section className="flex-1 min-w-0 flex flex-col h-full bg-[#FBF9FC] overflow-hidden">
        {/* Clean Single Conversation Header */}
        <header className="h-[66px] shrink-0 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={isOverlay ? 'Close transcript' : 'Back to queue'}
                className={cn(
                  'w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 flex items-center justify-center shrink-0 cursor-pointer',
                  !isOverlay && 'lg:hidden',
                )}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="relative shrink-0">
              {session.user_avatar_url ? (
                <Image
                  src={session.user_avatar_url}
                  alt={customerLabel}
                  width={38}
                  height={38}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[12px] font-semibold">
                  {customerInitials}
                </div>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
                  presence?.state === 'online'
                    ? 'bg-[#7B2D8E]'
                    : session.status === 'waiting'
                      ? 'bg-[#7B2D8E]/55'
                      : 'bg-gray-300',
                )}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-[14px] sm:text-[15px] font-semibold text-gray-900 truncate">
                  {customerLabel}
                </h2>
                {isGuest && (
                  <span className="text-[10.5px] font-medium text-[#7B2D8E] shrink-0">
                    Anonymous
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] mt-0.5 truncate">
                <span
                  className={cn(
                    'font-medium shrink-0',
                    presence?.state === 'online' || session.status === 'waiting'
                      ? 'text-[#7B2D8E]'
                      : 'text-gray-500',
                  )}
                >
                  {presence?.label ||
                    (session.status === 'waiting' ? 'Waiting' : 'Ended')}
                </span>
                <span className="text-gray-300" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={copySupportCode}
                  title="Copy Support ID"
                  className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold text-[#5A1D6A] hover:text-[#7B2D8E] cursor-pointer shrink-0"
                >
                  <span>{supportCode}</span>
                  {copiedId && <Check className="w-3 h-3 text-[#7B2D8E]" />}
                </button>
                {envPreview && (
                  <>
                    <span className="hidden md:inline text-gray-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="hidden md:inline text-gray-500 truncate">
                      {envPreview}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={downloadTranscript}
              aria-label="Download transcript"
              title="Download transcript"
              className="hidden sm:flex w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] items-center justify-center transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {isLiveStatus && (
              <button
                type="button"
                onClick={() => setEndDialogOpen(true)}
                disabled={closing}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-[#7B2D8E]/30 bg-white text-[11.5px] font-semibold text-[#5A1D6A] hover:bg-[#FAF6FB] hover:border-[#7B2D8E]/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End chat</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              aria-label="Delete session"
              title="Delete session"
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleProfile}
              aria-label="Toggle profile details"
              title="Profile details"
              className={cn(
                'w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer',
                desktopProfileOpen || mobileProfileOpen
                  ? 'border-[#7B2D8E]/30 bg-[#FAF6FB] text-[#7B2D8E]'
                  : 'border-gray-200 bg-white text-gray-600 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40',
              )}
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Initial Topic Strip */}
        {session.initial_topic && (
          <div className="px-4 py-2 bg-white border-b border-gray-100 text-[12px] text-gray-600 flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-[#7B2D8E] shrink-0">
              Topic:
            </span>
            <span className="truncate">{session.initial_topic}</span>
          </div>
        )}

        {/* Messages Feed */}
        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-4 min-h-0"
        >
          <div className="max-w-2xl mx-auto space-y-1">
            {mergedMessages.map((m, idx) => {
              const prev = idx > 0 ? mergedMessages[idx - 1] : null
              const next =
                idx < mergedMessages.length - 1 ? mergedMessages[idx + 1] : null
              const sameAsPrev = Boolean(
                prev &&
                  prev.sender_role !== 'system' &&
                  m.sender_role !== 'system' &&
                  prev.sender_role === m.sender_role &&
                  (prev.sender_id || null) === (m.sender_id || null) &&
                  Math.abs(
                    new Date(m.created_at).getTime() -
                      new Date(prev.created_at).getTime(),
                  ) < 180_000,
              )
              const sameAsNext = Boolean(
                next &&
                  next.sender_role !== 'system' &&
                  m.sender_role !== 'system' &&
                  next.sender_role === m.sender_role &&
                  (next.sender_id || null) === (m.sender_id || null) &&
                  Math.abs(
                    new Date(next.created_at).getTime() -
                      new Date(m.created_at).getTime(),
                  ) < 180_000,
              )

              return (
                <div
                  key={m.id}
                  className={cn(sameAsPrev ? 'pt-0.5' : idx === 0 ? '' : 'pt-3.5')}
                >
                  <AdminMessageRow
                    message={m}
                    customerLabel={customerLabel}
                    customerInitials={customerInitials}
                    customerAvatarUrl={session.user_avatar_url ?? null}
                    staffAvatarFallback={session.staff_avatar_url}
                    staffNameFallback={repName}
                    isFirstInGroup={!sameAsPrev}
                    isLastInGroup={!sameAsNext}
                  />
                </div>
              )
            })}

            {mergedMessages.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-10">
                No messages in this session yet.
              </div>
            )}

            {/* Live Visitor Typing Indicator — 3-dot reply bubble */}
            {customerTyping && (
              <div
                className="flex items-end gap-2.5 pt-3"
                role="status"
                aria-live="polite"
                aria-label={`${customerLabel} is replying`}
              >
                <div className="w-7 h-7 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {customerInitials}
                </div>
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E]/70 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-[#7B2D8E]/45 animate-bounce" />
                  <span className="sr-only">{customerLabel} is replying</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Composer + Inline Alias Selector (Live sessions only) */}
        {isLiveStatus ? (
          <footer className="shrink-0 bg-white border-t border-gray-200 px-3.5 sm:px-5 py-3">
            <div className="max-w-2xl mx-auto space-y-2.5">
              {/* Compact Alias Bar */}
              {editingDisplay ? (
                <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11.5px] font-semibold text-[#5A1D6A]">
                      Choose front-desk display name
                    </p>
                    {displayName && (
                      <button
                        type="button"
                        onClick={() => setEditingDisplay(false)}
                        aria-label="Close alias editor"
                        className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ADMIN_DISPLAY_PRESETS.map((preset) => {
                      const active = preset === displayName
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => void persistDisplayName(preset)}
                          className={cn(
                            'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-medium border transition-colors cursor-pointer',
                            active
                              ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B2D8E]/50 hover:text-[#7B2D8E]',
                          )}
                        >
                          {active && <Check className="w-3 h-3" />}
                          {preset}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customDisplay}
                      onChange={(e) => setCustomDisplay(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customDisplay.trim()) {
                          e.preventDefault()
                          void persistDisplayName(customDisplay)
                        }
                      }}
                      placeholder="Custom alias (e.g. Adaeze)"
                      maxLength={30}
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-full text-base sm:text-[12px] bg-white border border-gray-200 focus:border-[#7B2D8E] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void persistDisplayName(customDisplay)}
                      disabled={!customDisplay.trim() || savingAlias}
                      className="px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                    >
                      {savingAlias ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-[11.5px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#7B2D8E] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {displayName.charAt(0).toUpperCase() || 'A'}
                    </span>
                    <span className="text-gray-500 truncate">
                      Replying as{' '}
                      <strong className="font-semibold text-[#5A1D6A]">
                        {displayName}
                      </strong>
                      {repName && (
                        <span className="hidden sm:inline text-gray-400">
                          {' '}
                          · Assigned to {repName}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {supportCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(
                            `Please keep your support reference ID ${supportCode} for future reference.`,
                          )
                          composerRef.current?.focus()
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-white border border-[#7B2D8E]/30 hover:bg-[#7B2D8E] hover:text-white px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E] transition-colors shrink-0 cursor-pointer"
                      >
                        <Ticket className="w-3 h-3" />
                        Share ref ID
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const isPreset = ADMIN_DISPLAY_PRESETS.includes(
                          displayName as (typeof ADMIN_DISPLAY_PRESETS)[number],
                        )
                        setCustomDisplay(isPreset ? '' : displayName)
                        setEditingDisplay(true)
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 hover:border-[#7B2D8E]/45 px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E] transition-colors shrink-0 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Switch alias
                    </button>
                  </div>
                </div>
              )}

              {sendError && (
                <p className="text-[11.5px] text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/25 rounded-xl px-3 py-2">
                  {sendError}
                </p>
              )}

              <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-[#FBF9FC] focus-within:bg-white focus-within:border-[#7B2D8E] px-3 py-2 transition-colors">
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => {
                    const val = e.target.value
                    setDraft(val)
                    notifyAdminTyping(val.trim().length > 0)
                  }}
                  onBlur={() => notifyAdminTyping(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendMessage()
                    }
                  }}
                  placeholder={`Reply to ${customerLabel}…`}
                  rows={1}
                  maxLength={2000}
                  className="flex-1 min-w-0 resize-none bg-transparent py-1 text-base sm:text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-28 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || sending}
                  aria-label="Send reply"
                  className="w-9 h-9 shrink-0 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 transition-colors cursor-pointer"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </footer>
        ) : (
          <footer className="shrink-0 bg-white border-t border-gray-200 px-4 py-3">
            <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2 text-[12px] text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#7B2D8E]" />
                <span>This conversation has ended.</span>
                {session.rating != null && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#7B2D8E] tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                    {session.rating}/5
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={downloadTranscript}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] px-3 py-1.5 text-[11.5px] font-semibold text-gray-700 hover:text-[#5A1D6A] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#7B2D8E]" />
                Download transcript
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* DOCKED RIGHT PROFILE DETAILS PANEL (xl+) */}
      {desktopProfileOpen && (
        <div className="hidden xl:block w-[308px] 2xl:w-[328px] shrink-0 border-l border-gray-200 h-full overflow-hidden">
          <AdminProfileDetailsPanel
            session={session}
            presence={presence}
            customerTyping={customerTyping}
            onDownloadTranscript={downloadTranscript}
          />
        </div>
      )}

      {/* SLIDE-OVER PROFILE DETAILS DRAWER (< xl) */}
      {mobileProfileOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-gray-900/35"
            onClick={onCloseMobileProfile}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-[360px] h-full bg-white border-l border-gray-200">
            <AdminProfileDetailsPanel
              session={session}
              presence={presence}
              customerTyping={customerTyping}
              onDownloadTranscript={downloadTranscript}
              onClose={onCloseMobileProfile}
            />
          </div>
        </div>
      )}

      {/* Brand-Purple End Chat Action Prompt */}
      <ConfirmDialog
        open={endDialogOpen}
        onCancel={() => setEndDialogOpen(false)}
        title={`End live chat with ${customerLabel}?`}
        description={
          <>
            Close{' '}
            <span className="font-mono font-semibold text-[#5A1D6A]">{supportCode}</span>{' '}
            and send the transcript if an email is on file.
          </>
        }
        confirmLabel="End chat"
        cancelLabel="Keep chatting"
        icon={<PhoneOff className="h-[18px] w-[18px]" />}
        loading={closing}
        onConfirm={() => void endSession()}
      />

      {/* Brand-Purple Delete Session Action Prompt */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        title="Delete this live chat?"
        description={
          <>
            Permanently removes{' '}
            <span className="font-semibold text-gray-900">{customerLabel}</span> (
            <span className="font-mono font-semibold text-[#5A1D6A]">{supportCode}</span>) and
            its messages. This cannot be undone.
          </>
        }
        confirmLabel="Delete chat"
        cancelLabel="Keep it"
        icon={<Trash2 className="h-[18px] w-[18px]" />}
        loading={deleting}
        onConfirm={() => void deleteSession()}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// AdminProfileDetailsPanel — Rich Anonymous Visitor & Member Profile Details
// ---------------------------------------------------------------------------

function AdminProfileDetailsPanel({
  session,
  presence,
  customerTyping,
  onDownloadTranscript,
  onClose,
}: {
  session: SessionRow
  presence: VisitorPresenceInfo | null
  customerTyping: boolean
  onDownloadTranscript: () => void
  onClose?: () => void
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const isGuest = Boolean(session.is_guest || !session.user_id)
  const customerName = getSessionCustomerLabel(session)
  const initials = getSessionCustomerInitials(session)
  const supportCode = resolveSupportId(session.support_code, session.id)
  const email = session.user_email || session.guest_email || null
  const phone = session.user_phone || session.guest_phone || null
  const repName = session.staff_id
    ? session.staff_display_name ||
      fullName(session.staff_first_name, session.staff_last_name, 'Assigned rep')
    : 'Waiting in queue'

  const localTime = useMemo(
    () => formatVisitorLocalTime(session.visitor_timezone),
    [session.visitor_timezone],
  )
  const timezoneSummary = session.visitor_timezone
    ? localTime
      ? `${session.visitor_timezone} (${localTime})`
      : session.visitor_timezone
    : null
  const deviceSummary = [session.visitor_device, session.visitor_screen]
    .filter(Boolean)
    .join(' · ')

  const DeviceIcon =
    session.visitor_device === 'Mobile'
      ? Smartphone
      : session.visitor_device === 'Tablet'
        ? Tablet
        : Laptop

  const copyValue = (key: string, value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedField(key)
        window.setTimeout(() => setCopiedField(null), 1600)
      })
      .catch(() => {})
  }

  return (
    <aside className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="h-[66px] shrink-0 px-4 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-gray-900 truncate">
            Profile Details
          </h3>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {isGuest
              ? 'Anonymous visitor · Not signed in'
              : 'Registered Dermaspace member'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile details"
            className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {/* Identity + Real-Time Online / Offline Status */}
        <section className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {session.user_avatar_url ? (
                <Image
                  src={session.user_avatar_url}
                  alt={customerName}
                  width={44}
                  height={44}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[13px] font-semibold">
                  {initials}
                </div>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                  presence?.state === 'online'
                    ? 'bg-[#7B2D8E]'
                    : presence?.state === 'away'
                      ? 'bg-[#7B2D8E]/45'
                      : 'bg-gray-300',
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-gray-900 truncate">
                {customerName}
              </p>
              <p className="text-[11px] font-medium text-[#7B2D8E] truncate mt-0.5">
                {isGuest ? 'Anonymous Visitor (Guest)' : 'Signed-in Account'}
              </p>
            </div>
          </div>

          {/* Real-time Online / Away / Offline Banner */}
          {presence && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-[#FBF9FC] px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    presence.state === 'online'
                      ? 'bg-[#7B2D8E]'
                      : presence.state === 'away'
                        ? 'bg-[#7B2D8E]/45'
                        : 'bg-gray-300',
                  )}
                />
                <span
                  className={cn(
                    'text-[12px] font-semibold truncate',
                    presence.state === 'online'
                      ? 'text-[#7B2D8E]'
                      : presence.state === 'away'
                        ? 'text-[#5A1D6A]'
                        : 'text-gray-500',
                  )}
                >
                  {presence.label}
                </span>
              </div>
              <span className="text-[10.5px] text-gray-400 shrink-0">
                {presence.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          )}

          {/* Contact & Support ID */}
          <div className="space-y-2 pt-0.5">
            <ProfileDetailRow
              icon={<Mail className="w-3.5 h-3.5" />}
              label="Email"
              value={email || 'Not provided'}
              muted={!email}
              onCopy={email ? () => copyValue('email', email) : undefined}
              copied={copiedField === 'email'}
            />
            <ProfileDetailRow
              icon={<Phone className="w-3.5 h-3.5" />}
              label="Phone"
              value={phone || 'Not provided'}
              muted={!phone}
              onCopy={phone ? () => copyValue('phone', phone) : undefined}
              copied={copiedField === 'phone'}
            />
            <ProfileDetailRow
              icon={<Ticket className="w-3.5 h-3.5" />}
              label="Support ID"
              value={supportCode}
              mono
              onCopy={() => copyValue('support', supportCode)}
              copied={copiedField === 'support'}
            />
          </div>
        </section>

        {/* Visitor Environment — Highlighted for Anonymous Users */}
        <section className="p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-semibold text-gray-900 tracking-wide">
              Visitor Environment
            </h4>
            {isGuest && (
              <span className="text-[10px] font-semibold text-[#7B2D8E]">
                Anonymous telemetry
              </span>
            )}
          </div>

          <ProfileDetailRow
            icon={<MapPin className="w-3.5 h-3.5" />}
            label="Location"
            value={session.visitor_location || 'Not detected'}
            muted={!session.visitor_location}
          />
          <ProfileDetailRow
            icon={<Globe className="w-3.5 h-3.5" />}
            label="Browser"
            value={session.visitor_browser || 'Not captured'}
            muted={!session.visitor_browser}
          />
          <ProfileDetailRow
            icon={<Monitor className="w-3.5 h-3.5" />}
            label="Operating system"
            value={session.visitor_os || 'Not captured'}
            muted={!session.visitor_os}
          />
          <ProfileDetailRow
            icon={<DeviceIcon className="w-3.5 h-3.5" />}
            label="Device & screen"
            value={deviceSummary || 'Not captured'}
            muted={!deviceSummary}
          />
          <ProfileDetailRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Timezone & local time"
            value={timezoneSummary || 'Not captured'}
            muted={!timezoneSummary}
          />
          {session.visitor_page_url && (
            <div className="flex items-start gap-2.5 text-[12px]">
              <span className="mt-0.5 text-[#7B2D8E] shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] text-gray-400">Started on page</p>
                {session.visitor_page_url.startsWith('/') ? (
                  <Link
                    href={session.visitor_page_url}
                    className="text-[12px] font-medium text-[#7B2D8E] hover:underline break-all block mt-0.5"
                  >
                    {session.visitor_page_url}
                  </Link>
                ) : (
                  <p className="text-[12px] font-medium text-gray-800 break-all mt-0.5">
                    {session.visitor_page_url}
                  </p>
                )}
              </div>
            </div>
          )}
          {session.visitor_referrer && (
            <ProfileDetailRow
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              label="Referrer"
              value={session.visitor_referrer}
            />
          )}
          <ProfileDetailRow
            icon={<Shield className="w-3.5 h-3.5" />}
            label="IP address"
            value={session.visitor_ip || 'Not captured'}
            mono
            muted={!session.visitor_ip}
            onCopy={
              session.visitor_ip
                ? () => copyValue('ip', session.visitor_ip!)
                : undefined
            }
            copied={copiedField === 'ip'}
          />
          {session.visitor_language && (
            <ProfileDetailRow
              icon={<Globe className="w-3.5 h-3.5" />}
              label="Language"
              value={session.visitor_language}
            />
          )}
        </section>

        {/* Session Metrics & Representative */}
        <section className="p-4 space-y-2.5">
          <h4 className="text-[11px] font-semibold text-gray-900 tracking-wide">
            Session Details
          </h4>
          <ProfileDetailRow
            icon={<UserRound className="w-3.5 h-3.5" />}
            label="Representative"
            value={repName}
          />
          <ProfileDetailRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Started"
            value={formatChatTimestamp(session.escalated_at || session.created_at) || 'Just now'}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 px-2.5 py-2">
              <p className="text-[10px] font-medium text-gray-500">First reply</p>
              <p className="text-[12.5px] font-semibold text-gray-900 tabular-nums mt-0.5">
                {formatDuration(session.staff_response_seconds)}
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/15 px-2.5 py-2">
              <p className="text-[10px] font-medium text-gray-500">Resolution</p>
              <p className="text-[12.5px] font-semibold text-gray-900 tabular-nums mt-0.5">
                {formatDuration(session.resolution_seconds)}
              </p>
            </div>
          </div>

          {session.rating != null && (
            <div className="rounded-xl bg-[#FAF6FB] border border-[#7B2D8E]/20 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#5A1D6A]">
                  Customer feedback
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                  {session.rating}/5
                </span>
              </div>
              {session.rating_comment && (
                <p className="text-[11.5px] text-gray-700 mt-1 leading-relaxed">
                  &ldquo;{session.rating_comment}&rdquo;
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onDownloadTranscript}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] px-3 py-2.5 text-[12px] font-medium text-gray-800 hover:text-[#5A1D6A] transition-colors cursor-pointer mt-1"
          >
            <span className="inline-flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-[#7B2D8E]" />
              Download transcript
            </span>
            <span className="text-[10.5px] text-gray-400">.txt</span>
          </button>
        </section>
      </div>
    </aside>
  )
}

function ProfileDetailRow({
  icon,
  label,
  value,
  mono = false,
  muted = false,
  onCopy,
  copied = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  muted?: boolean
  onCopy?: () => void
  copied?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 text-[12px]">
      <span className="mt-0.5 text-[#7B2D8E] shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] text-gray-400 leading-none">{label}</p>
        <div className="flex items-center justify-between gap-1.5 mt-1">
          <p
            className={cn(
              'text-[12px] truncate',
              mono && 'font-mono tabular-nums',
              muted ? 'text-gray-400' : 'font-medium text-gray-900',
            )}
            title={value}
          >
            {value}
          </p>
          {onCopy && !muted && (
            <button
              type="button"
              onClick={onCopy}
              aria-label={`Copy ${label}`}
              className="p-1 rounded-md text-gray-400 hover:text-[#7B2D8E] hover:bg-[#FAF6FB] transition-colors shrink-0 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3 h-3 text-[#7B2D8E]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AdminMessageRow — Join Avatar Milestones + Clean Grouped Bubbles
// ---------------------------------------------------------------------------

function AdminMessageRow({
  message,
  customerLabel,
  customerInitials,
  customerAvatarUrl,
  staffAvatarFallback,
  staffNameFallback,
  isFirstInGroup,
  isLastInGroup,
}: {
  message: SessionMessage
  customerLabel: string
  customerInitials: string
  customerAvatarUrl: string | null
  staffAvatarFallback: string | null
  staffNameFallback: string | null
  isFirstInGroup: boolean
  isLastInGroup: boolean
}) {
  const stamp = useMemo(
    () => formatChatTimestamp(message.created_at),
    [message.created_at],
  )

  if (message.sender_role === 'system') {
    if (isJoinMilestone(message.body)) {
      const actionMatch = message.body.match(/\b(joined the chat|took over the chat)\b/i)
      const milestoneAction = actionMatch ? actionMatch[1].toLowerCase() : 'joined the chat'
      const milestoneName =
        message.body.replace(/\s+(joined|took over)\b.*$/i, '').trim() ||
        staffNameFallback ||
        'Customer Care'
      return (
        <div className="py-4 text-center" role="status">
          <div className="flex justify-center mb-2.5">
            <RepAvatar
              src={message.sender_avatar_url || staffAvatarFallback}
              name={milestoneName}
              size={64}
              className="border border-gray-200"
            />
          </div>
          <p className="text-[15px] font-semibold text-gray-800 leading-snug">
            {milestoneName}
          </p>
          <p className="text-[15px] font-semibold text-gray-800 leading-snug">
            {milestoneAction}
          </p>
          {stamp && (
            <p className="text-[11.5px] text-gray-500 mt-1 tabular-nums">
              {stamp}
            </p>
          )}
        </div>
      )
    }

    return (
      <div className="py-2.5" role="status">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
          <span className="text-[11px] font-medium text-gray-500 text-center">
            {message.body}
          </span>
          <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />
        </div>
        {stamp && (
          <p className="text-center text-[10.5px] text-gray-400 mt-1 tabular-nums">
            {stamp}
          </p>
        )}
      </div>
    )
  }

  // Visitor / customer bubble (left)
  if (message.sender_role === 'user') {
    return (
      <div className="flex items-end gap-2">
        <div className="w-7 shrink-0">
          {isLastInGroup &&
            (customerAvatarUrl ? (
              <Image
                src={customerAvatarUrl}
                alt={customerLabel}
                width={28}
                height={28}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/20 text-[#7B2D8E] flex items-center justify-center text-[10px] font-semibold">
                {customerInitials}
              </div>
            ))}
        </div>
        <div className="max-w-[80%] sm:max-w-[74%]">
          <div
            className={cn(
              'bg-white border border-gray-200 px-3.5 py-2.5 rounded-2xl',
              isLastInGroup && 'rounded-bl-md',
            )}
          >
            <p className="text-[13px] text-gray-900 whitespace-pre-wrap leading-relaxed break-words">
              {message.body}
            </p>
          </div>
          {isLastInGroup && stamp && (
            <p className="text-[10.5px] text-gray-400 mt-1 ml-1 tabular-nums">
              {stamp}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Staff / admin bubble (right)
  const senderLabel =
    message.sender_name ||
    fullName(
      message.sender_first_name,
      message.sender_last_name,
      message.sender_role === 'admin' ? 'Admin' : 'Rep',
    )

  return (
    <div className="flex items-end justify-end gap-2">
      <div className="max-w-[80%] sm:max-w-[74%] flex flex-col items-end">
        {isFirstInGroup && (
          <p className="text-[10.5px] font-medium text-[#5A1D6A] mr-1 mb-1">
            {senderLabel}
            {message._pending && <span className="ml-1.5 text-gray-400">Sending…</span>}
          </p>
        )}
        <div
          className={cn(
            'bg-[#7B2D8E] text-white px-3.5 py-2.5 rounded-2xl',
            isLastInGroup && 'rounded-br-md',
            message._pending && 'opacity-70',
          )}
        >
          <p className="text-[13px] whitespace-pre-wrap leading-relaxed break-words">
            {message.body}
          </p>
        </div>
        {isLastInGroup && stamp && (
          <p className="text-[10.5px] text-gray-400 mt-1 mr-1 tabular-nums">
            {stamp}
          </p>
        )}
      </div>
      <div className="w-7 shrink-0">
        {isLastInGroup && (
          <RepAvatar
            src={message.sender_avatar_url || staffAvatarFallback}
            name={senderLabel}
            size={28}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HistorySessionOverlay — Full 2-Pane Transcript + Profile Details Modal
// ---------------------------------------------------------------------------

function HistorySessionOverlay({
  sessionId,
  onClose,
}: {
  sessionId: string
  onClose: () => void
}) {
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(true)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      <button
        type="button"
        aria-label="Close session viewer"
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/35"
      />
      <div className="relative z-10 w-full max-w-5xl h-[100dvh] sm:h-[86dvh] bg-white sm:rounded-2xl sm:border sm:border-gray-200 overflow-hidden flex">
        <AdminSessionWorkspace
          sessionId={sessionId}
          desktopProfileOpen={desktopProfileOpen}
          mobileProfileOpen={mobileProfileOpen}
          onToggleProfile={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1280) {
              setMobileProfileOpen((v) => !v)
            } else {
              setDesktopProfileOpen((v) => !v)
            }
          }}
          onCloseMobileProfile={() => setMobileProfileOpen(false)}
          onBack={onClose}
          onDeleted={onClose}
          isOverlay
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HistoryTab — Searchable Closed Sessions (Responsive Cards + Table)
// ---------------------------------------------------------------------------

function HistoryTab({ onOpenSession }: { onOpenSession: (id: string) => void }) {
  const notify = useAdminNotify()
  const { mutate: swrMutate } = useSWRConfig()
  const [days, setDays] = useState(7)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SessionRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { data, isLoading, mutate } = useSWR<ListResponse>(
    `/api/admin/live-chat/sessions?status=closed&days=${days}`,
    fetcher,
  )

  const handleDeleteHistorySession = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    const target = deleteTarget
    const targetCode = resolveSupportId(target.support_code, target.id)
    const targetName = getSessionCustomerLabel(target)
    try {
      const res = await fetch(`/api/admin/live-chat/sessions/${target.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not delete session.')
      }
      setDeleteTarget(null)
      await mutate()
      void swrMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/admin/live-chat/'),
      )
      notify.success(
        'Live chat deleted',
        `${targetName} (${targetCode}) was permanently removed.`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete session.'
      notify.error('Could not delete chat', msg)
    } finally {
      setDeleting(false)
    }
  }

  const sessions = data?.sessions ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) => {
      const code = resolveSupportId(s.support_code, s.id).toLowerCase()
      return (
        code.includes(q) ||
        getSessionCustomerLabel(s).toLowerCase().includes(q) ||
        (s.user_email || '').toLowerCase().includes(q) ||
        (s.guest_email || '').toLowerCase().includes(q) ||
        (s.visitor_location || '').toLowerCase().includes(q) ||
        (s.initial_topic || '').toLowerCase().includes(q) ||
        (s.staff_display_name || '').toLowerCase().includes(q) ||
        (s.staff_first_name || '').toLowerCase().includes(q)
      )
    })
  }, [sessions, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex w-full sm:w-auto sm:inline-flex bg-white rounded-full p-1 border border-gray-200 shrink-0">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
                days === d
                  ? 'bg-[#7B2D8E] text-white'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              Last {d}d
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Support ID, visitor, location, rep, or topic"
            className="w-full pl-9 pr-3 py-2 text-base sm:text-sm bg-white rounded-full border border-gray-200 focus:border-[#7B2D8E] focus:outline-none"
          />
        </div>
      </div>

      {isLoading && sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E] mx-auto mb-2" />
          Loading chat history…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-12 px-4 text-center text-xs text-gray-500">
          {search
            ? 'No closed chats matched your search.'
            : 'No closed live chats in this window.'}
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Cards */}
          <div className="lg:hidden space-y-2.5">
            {filtered.map((s) => {
              const code = resolveSupportId(s.support_code, s.id)
              const name = getSessionCustomerLabel(s)
              const isGuest = Boolean(s.is_guest || !s.user_id)
              const rep = s.staff_id
                ? s.staff_display_name ||
                  fullName(s.staff_first_name, s.staff_last_name, 'Rep')
                : 'Unassigned'
              return (
                <div
                  key={s.id}
                  className="w-full bg-white rounded-2xl border border-gray-200 hover:border-[#7B2D8E]/40 p-4 space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenSession(s.id)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13.5px] font-semibold text-gray-900 truncate">
                          {name}
                        </p>
                        {isGuest && (
                          <span className="text-[10.5px] font-medium text-[#7B2D8E]">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-[#5A1D6A] mt-0.5">
                        {code}
                      </p>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusPill status={s.status} />
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        aria-label={`Delete live chat ${code}`}
                        title="Delete chat"
                        className="w-7 h-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenSession(s.id)}
                    className="w-full text-left space-y-2.5 cursor-pointer"
                  >
                    <p className="text-[12px] text-gray-600 line-clamp-1">
                      {s.initial_topic || 'Customer inquiry'}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                      <span className="truncate">
                        Rep: <strong className="font-medium text-gray-800">{rep}</strong>
                        {s.visitor_location ? ` · ${s.visitor_location}` : ''}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {s.rating != null && (
                          <span className="inline-flex items-center gap-0.5 font-semibold text-[#7B2D8E] tabular-nums">
                            <Star className="w-3 h-3 fill-[#7B2D8E] text-[#7B2D8E]" />
                            {s.rating}/5
                          </span>
                        )}
                        <span className="tabular-nums text-gray-400">
                          {formatRelative(s.closed_at || s.last_message_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#FAF6FB] text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4">Visitor</th>
                    <th className="py-3 px-4">Environment</th>
                    <th className="py-3 px-4">Topic</th>
                    <th className="py-3 px-4">Representative</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Closed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s) => {
                    const code = resolveSupportId(s.support_code, s.id)
                    const name = getSessionCustomerLabel(s)
                    const isGuest = Boolean(s.is_guest || !s.user_id)
                    const rep = s.staff_id
                      ? s.staff_display_name ||
                        fullName(s.staff_first_name, s.staff_last_name, 'Rep')
                      : '—'
                    return (
                      <tr
                        key={s.id}
                        onClick={() => onOpenSession(s.id)}
                        className="hover:bg-[#FAF6FB]/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900 text-[13px] truncate max-w-[180px]">
                                {name}
                              </span>
                              {isGuest && (
                                <span className="text-[10px] font-semibold text-[#7B2D8E]">
                                  Guest
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-[#5A1D6A]">
                              {code}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[12px] text-gray-600">
                          <div className="truncate max-w-[180px]">
                            {s.visitor_location || '—'}
                          </div>
                          {(s.visitor_browser || s.visitor_device) && (
                            <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                              {[s.visitor_browser, s.visitor_device]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[12.5px] text-gray-700 max-w-[220px] truncate">
                          {s.initial_topic || 'Customer inquiry'}
                        </td>
                        <td className="py-3 px-4 text-[12.5px] font-medium text-gray-800 whitespace-nowrap">
                          {rep}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {s.rating != null ? (
                            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] tabular-nums">
                              <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                              {s.rating}/5
                            </span>
                          ) : (
                            <span className="text-[12px] text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[12px] text-gray-500 whitespace-nowrap tabular-nums">
                          {formatRelative(s.closed_at || s.last_message_at)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenSession(s.id)
                              }}
                              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] hover:text-[#5A1D6A] cursor-pointer"
                            >
                              Open
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(s)
                              }}
                              aria-label={`Delete live chat ${code}`}
                              title="Delete chat"
                              className="w-7 h-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-[#7B2D8E] hover:border-[#7B2D8E]/40 hover:bg-[#FAF6FB] inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Brand-Purple Delete History Session Prompt */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        title="Delete this live chat?"
        description={
          deleteTarget ? (
            <>
              Permanently removes{' '}
              <span className="font-semibold text-gray-900">
                {getSessionCustomerLabel(deleteTarget)}
              </span>{' '}
              (
              <span className="font-mono font-semibold text-[#5A1D6A]">
                {resolveSupportId(deleteTarget.support_code, deleteTarget.id)}
              </span>
              ) and its messages.
            </>
          ) : undefined
        }
        confirmLabel="Delete chat"
        cancelLabel="Keep it"
        icon={<Trash2 className="h-[18px] w-[18px]" />}
        loading={deleting}
        onConfirm={() => void handleDeleteHistorySession()}
      />
    </div>
  )
}

function StatusPill({ status }: { status: SessionRow['status'] }) {
  const meta = getLiveChatStatusMeta(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
        meta.badgeClass,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          meta.pulse ? 'bg-white' : meta.dotClass,
        )}
      />
      {meta.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// PerformanceTab — Per-Staff Response, Resolution & Rating Scoreboard
// ---------------------------------------------------------------------------

function PerformanceTab() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useSWR<PerformanceResponse>(
    `/api/admin/live-chat/performance?days=${days}`,
    fetcher,
  )
  const rows = data?.performance ?? []

  return (
    <div className="space-y-4">
      <div className="flex w-full sm:w-auto sm:inline-flex bg-white rounded-full p-1 border border-gray-200">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={cn(
              'flex-1 sm:flex-initial px-3 py-1.5 sm:py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer',
              days === d
                ? 'bg-[#7B2D8E] text-white'
                : 'text-gray-600 hover:text-gray-900',
            )}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-12 text-center text-xs text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E] mx-auto mb-2" />
          Loading performance…
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center text-xs text-gray-500 py-10">
          No staff activity in this window yet.
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Cards */}
          <div className="lg:hidden space-y-2.5">
            {rows.map((r) => {
              const name = fullName(r.first_name, r.last_name, 'Rep')
              return (
                <div
                  key={r.staff_id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <RepAvatar src={r.avatar_url} name={name} size={38} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {r.ratings_count} rating{r.ratings_count === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.active_now > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[11px] font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          {r.active_now} live
                        </span>
                      )}
                      {r.avg_rating != null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B2D8E] bg-[#FAF6FB] border border-[#7B2D8E]/20 rounded-full px-2 py-0.5 tabular-nums">
                          <Star className="h-3 w-3 fill-[#7B2D8E] text-[#7B2D8E]" />
                          {r.avg_rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                    <div className="rounded-xl bg-[#FAF6FB] px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Handled
                      </p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
                        {r.handled}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF6FB] px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        First reply
                      </p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatDuration(r.avg_response_seconds)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF6FB] px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Resolution
                      </p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
                        {formatDuration(r.avg_resolution_seconds)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#FAF6FB] text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4">Representative</th>
                    <th className="py-3 px-4">Live now</th>
                    <th className="py-3 px-4">Handled</th>
                    <th className="py-3 px-4">Avg first reply</th>
                    <th className="py-3 px-4">Avg resolution</th>
                    <th className="py-3 px-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => {
                    const name = fullName(r.first_name, r.last_name, 'Rep')
                    return (
                      <tr key={r.staff_id} className="hover:bg-[#FAF6FB]/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <RepAvatar src={r.avatar_url} name={name} size={34} />
                            <span className="font-semibold text-gray-900 text-[13px]">
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          {r.active_now > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] text-white px-2.5 py-0.5 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              {r.active_now} live
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900 tabular-nums">
                          {r.handled}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {formatDuration(r.avg_response_seconds)}
                        </td>
                        <td className="py-3 px-4 text-gray-700 tabular-nums">
                          {formatDuration(r.avg_resolution_seconds)}
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          {r.avg_rating != null ? (
                            <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#7B2D8E]">
                              <Star className="w-3.5 h-3.5 fill-[#7B2D8E] text-[#7B2D8E]" />
                              {r.avg_rating.toFixed(1)}
                              <span className="text-gray-400 font-normal text-[11px]">
                                ({r.ratings_count})
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
