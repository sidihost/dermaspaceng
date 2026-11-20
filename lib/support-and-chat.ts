// Pure helpers for Support Tickets status & Live Chat presentation.
// Strictly uses Dermaspace's brand palette (#7B2D8E, #5A1D6A, #3E104B,
// #FAF6FB, white and neutral grays) — zero green/emerald, amber, or rose.

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low'

export type LiveChatStatus = 'waiting' | 'active' | 'closed' | 'abandoned'

export interface TicketStatusMeta {
  key: TicketStatus
  label: string
  caption: string
  dotClass: string
  badgeClass: string
  chartColor: string
}

export interface TicketPriorityMeta {
  key: TicketPriority
  label: string
  badgeClass: string
}

export interface TicketBreakdownInput {
  open?: number
  inProgress?: number
  resolved?: number
  closed?: number
}

export interface TicketSummary {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  awaitingReply: number
  resolutionRate: number
  rows: Array<{
    status: TicketStatus
    label: string
    caption: string
    count: number
    percentage: number
    dotClass: string
    badgeClass: string
    chartColor: string
  }>
}

export interface LiveChatStatusMeta {
  key: LiveChatStatus
  label: string
  badgeClass: string
  dotClass: string
  pulse: boolean
}

export const TICKET_STATUS_ORDER: readonly TicketStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const

const TICKET_STATUS_MAP: Record<TicketStatus, TicketStatusMeta> = {
  open: {
    key: 'open',
    label: 'Open',
    caption: 'awaiting reply',
    dotClass: 'bg-[#3E104B]',
    badgeClass: 'bg-[#FAF6FB] text-[#3E104B] border-[#3E104B]/25',
    chartColor: '#3E104B',
  },
  in_progress: {
    key: 'in_progress',
    label: 'In progress',
    caption: 'being handled',
    dotClass: 'bg-[#7B2D8E]',
    badgeClass: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/25',
    chartColor: '#A966BC',
  },
  resolved: {
    key: 'resolved',
    label: 'Resolved',
    caption: 'wrapped up',
    dotClass: 'bg-[#5A1D6A]',
    badgeClass: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
    chartColor: '#7B2D8E',
  },
  closed: {
    key: 'closed',
    label: 'Closed',
    caption: 'archived',
    dotClass: 'bg-gray-400',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
    chartColor: '#D1D5DB',
  },
}

const TICKET_PRIORITY_MAP: Record<TicketPriority, TicketPriorityMeta> = {
  urgent: {
    key: 'urgent',
    label: 'Urgent',
    badgeClass: 'bg-[#3E104B] text-white border-[#3E104B]',
  },
  high: {
    key: 'high',
    label: 'High',
    badgeClass: 'bg-[#5A1D6A]/10 text-[#5A1D6A] border-[#5A1D6A]/25',
  },
  normal: {
    key: 'normal',
    label: 'Normal',
    badgeClass: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/20',
  },
  low: {
    key: 'low',
    label: 'Low',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
  },
}

const LIVE_CHAT_STATUS_MAP: Record<LiveChatStatus, LiveChatStatusMeta> = {
  waiting: {
    key: 'waiting',
    label: 'Waiting',
    badgeClass: 'bg-[#FAF6FB] text-[#5A1D6A] border-[#7B2D8E]/25',
    dotClass: 'bg-[#7B2D8E]',
    pulse: false,
  },
  active: {
    key: 'active',
    label: 'Active',
    badgeClass: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
    dotClass: 'bg-white',
    pulse: true,
  },
  closed: {
    key: 'closed',
    label: 'Closed',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
    dotClass: 'bg-gray-400',
    pulse: false,
  },
  abandoned: {
    key: 'abandoned',
    label: 'Abandoned',
    badgeClass: 'bg-[#3E104B]/10 text-[#3E104B] border-[#3E104B]/20',
    dotClass: 'bg-[#3E104B]',
    pulse: false,
  },
}

export function normalizeTicketStatus(
  raw: string | null | undefined,
): TicketStatus {
  const cleaned = (raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (cleaned === 'in_progress' || cleaned === 'inprogress' || cleaned === 'assigned') {
    return 'in_progress'
  }
  if (cleaned === 'resolved' || cleaned === 'completed') {
    return 'resolved'
  }
  if (cleaned === 'closed' || cleaned === 'archived') {
    return 'closed'
  }
  return 'open'
}

export function getTicketStatusMeta(
  raw: string | null | undefined,
): TicketStatusMeta {
  return TICKET_STATUS_MAP[normalizeTicketStatus(raw)]
}

export function normalizeTicketPriority(
  raw: string | null | undefined,
): TicketPriority {
  const cleaned = (raw ?? '').trim().toLowerCase()
  if (cleaned === 'urgent') return 'urgent'
  if (cleaned === 'high') return 'high'
  if (cleaned === 'low') return 'low'
  return 'normal'
}

export function getTicketPriorityMeta(
  raw: string | null | undefined,
): TicketPriorityMeta {
  return TICKET_PRIORITY_MAP[normalizeTicketPriority(raw)]
}

export function computeTicketSummary(
  input: TicketBreakdownInput | null | undefined,
): TicketSummary {
  const open = Math.max(0, Math.floor(Number(input?.open) || 0))
  const inProgress = Math.max(0, Math.floor(Number(input?.inProgress) || 0))
  const resolved = Math.max(0, Math.floor(Number(input?.resolved) || 0))
  const closed = Math.max(0, Math.floor(Number(input?.closed) || 0))
  const total = open + inProgress + resolved + closed
  const awaitingReply = open + inProgress
  const completed = resolved + closed
  const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const counts: Record<TicketStatus, number> = {
    open,
    in_progress: inProgress,
    resolved,
    closed,
  }

  const rows = TICKET_STATUS_ORDER.map((status) => {
    const meta = TICKET_STATUS_MAP[status]
    const count = counts[status]
    return {
      status,
      label: meta.label,
      caption: meta.caption,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      dotClass: meta.dotClass,
      badgeClass: meta.badgeClass,
      chartColor: meta.chartColor,
    }
  })

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    awaitingReply,
    resolutionRate,
    rows,
  }
}

export function getLiveChatStatusMeta(
  raw: string | null | undefined,
): LiveChatStatusMeta {
  const cleaned = (raw ?? '').trim().toLowerCase()
  if (cleaned === 'active') return LIVE_CHAT_STATUS_MAP.active
  if (cleaned === 'closed') return LIVE_CHAT_STATUS_MAP.closed
  if (cleaned === 'abandoned') return LIVE_CHAT_STATUS_MAP.abandoned
  return LIVE_CHAT_STATUS_MAP.waiting
}

export function formatWaitSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const rounded = Math.round(seconds)
  if (rounded < 60) return `${rounded}s`
  const mins = Math.floor(rounded / 60)
  const rem = rounded % 60
  if (mins < 60) return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
}

export function formatRelativeTimestamp(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMins = Math.max(0, Math.floor((nowMs - then) / 60000))
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(then).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  })
}

export type HandoffAutoState =
  | 'connecting'
  | 'waiting'
  | 'active'
  | 'guest_needed'
  | 'closed'

const TICKET_INTENT_EXCLUSION_RE =
  /\b(open|create|file|raise|submit|check|view|track|status\s+of|my)\b.{0,24}\btickets?\b/i

const CALLBACK_ONLY_EXCLUSION_RE =
  /\b(call\s?back|call\s+me|phone\s+me|ring\s+me)\b/i

const EXPLICIT_HANDOFF_RE =
  /\b(live\s?chat|live\s?support|live\s?agent|human\s?agent|human\s?support|human\s?representative|real\s?(person|human|agent|rep))\b/i

const VERB_TO_HUMAN_RE =
  /\b(talk|talt|speak|chat|connect|transfer|hand\s?over|put\s?me\s?through|switch)\b.{0,28}\b(human|agent|representative|rep|support|customer\s?(service|care|support)|front\s?desk|staff|someone|person)\b/i

const NEED_HUMAN_RE =
  /\b(need|want|get|give\s?me)\b.{0,24}\b(human|agent|representative|customer\s?(service|care|support)|live\s?support|support\s?(agent|rep|team|person))\b/i

const DIRECT_SUPPORT_PHRASE_RE =
  /^(please\s+)?(i\s+need\s+|can\s+i\s+get\s+)?(a\s+)?(human|agent|representative|customer\s?(service|care|support)|support|live\s?chat|front\s?desk|real\s?person)[.!?]*$/i

export function detectHumanHandoffIntent(raw: string | null | undefined): boolean {
  const text = (raw ?? '').trim()
  if (!text) return false

  // Do not hijack explicit ticket queries/creation flows.
  if (TICKET_INTENT_EXCLUSION_RE.test(text) && !EXPLICIT_HANDOFF_RE.test(text)) {
    return false
  }

  // Keep explicit phone callback requests on callback unless they also asked for live chat / human agent.
  if (
    CALLBACK_ONLY_EXCLUSION_RE.test(text) &&
    !EXPLICIT_HANDOFF_RE.test(text) &&
    !VERB_TO_HUMAN_RE.test(text)
  ) {
    return false
  }

  return (
    EXPLICIT_HANDOFF_RE.test(text) ||
    VERB_TO_HUMAN_RE.test(text) ||
    NEED_HUMAN_RE.test(text) ||
    DIRECT_SUPPORT_PHRASE_RE.test(text)
  )
}

export function getHandoffAutoMessage(
  state: HandoffAutoState,
  staffName?: string | null,
): string {
  switch (state) {
    case 'connecting':
    case 'waiting':
      return 'Connecting you to an agent — a customer representative will join shortly.'
    case 'active': {
      const cleanName = (staffName ?? '').trim()
      return cleanName
        ? `${cleanName} from Dermaspace Customer Care has joined the chat.`
        : 'A customer representative has joined the chat.'
    }
    case 'guest_needed':
      return 'Connecting you to an agent — share your name and email below and a customer representative will join shortly.'
    case 'closed':
      return 'This live support session has ended. I am right here whenever you need anything else.'
  }
}

// ---------------------------------------------------------------------------
// Live Chat Support ID & Staff Avatar resolution helpers
// ---------------------------------------------------------------------------

export const LIVE_CHAT_SUPPORT_ID_PREFIX = 'DS-LC-'

// Unambiguous uppercase alphanumeric alphabet (excludes 0/O and 1/I/L).
const SUPPORT_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export const VALID_AVATAR_SLUGS = new Set<string>([
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11',
  'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11',
  'staff-default', 'admin-default', 'admin-female-default', 'admin-male-default',
])

const FRONT_DESK_POOL = [
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11',
] as const

export function generateLiveChatSupportId(
  randomFn: () => number = Math.random,
): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    const raw = randomFn()
    const clamped = Number.isFinite(raw) ? Math.min(0.999999, Math.max(0, raw)) : 0
    const idx = Math.floor(clamped * SUPPORT_ID_ALPHABET.length)
    suffix += SUPPORT_ID_ALPHABET[idx]
  }
  return `${LIVE_CHAT_SUPPORT_ID_PREFIX}${suffix}`
}

export function formatFallbackSupportId(sessionId: string | null | undefined): string {
  const cleaned = (sessionId ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (!cleaned) return `${LIVE_CHAT_SUPPORT_ID_PREFIX}000000`
  const suffix = cleaned.slice(0, 6).padEnd(6, 'X')
  return `${LIVE_CHAT_SUPPORT_ID_PREFIX}${suffix}`
}

export function resolveSupportId(
  supportCode: string | null | undefined,
  sessionId: string | null | undefined,
): string {
  const trimmed = (supportCode ?? '').trim().toUpperCase()
  if (trimmed && /^DS-[A-Z0-9-]{4,24}$/.test(trimmed)) {
    return trimmed
  }
  return formatFallbackSupportId(sessionId)
}

export function normalizeSupportIdQuery(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '')
    .toUpperCase()
}

export function pickFrontDeskSlugForStaff(staffId: string | null | undefined): string {
  const id = (staffId ?? '').trim()
  if (!id) return 'f1'
  let acc = 0
  for (let i = 0; i < id.length; i++) {
    acc = (acc + id.charCodeAt(i)) % 997
  }
  return FRONT_DESK_POOL[acc % FRONT_DESK_POOL.length]
}

export function resolveStaffAvatarUrl(opts: {
  avatarUrl?: string | null
  avatarSlug?: string | null
  staffId?: string | null
}): string {
  const rawUrl = (opts.avatarUrl ?? '').trim()
  if (rawUrl && (rawUrl.startsWith('/') || /^https?:\/\//i.test(rawUrl))) {
    return rawUrl
  }
  const slug = (opts.avatarSlug ?? '').trim()
  if (slug && VALID_AVATAR_SLUGS.has(slug)) {
    return `/avatars/${slug}.jpg`
  }
  return `/avatars/${pickFrontDeskSlugForStaff(opts.staffId)}.jpg`
}


