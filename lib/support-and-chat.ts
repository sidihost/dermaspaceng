// Pure helpers for Support Tickets status & Live Chat presentation.
// Strictly uses Dermaspace's main brand palette (#7B2D8E, #FAF6FB, white
// and neutral grays) — zero dark plum, green/emerald, amber, or rose.

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
    dotClass: 'bg-[#7B2D8E]',
    badgeClass: 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/25',
    chartColor: '#7B2D8E',
  },
  in_progress: {
    key: 'in_progress',
    label: 'In progress',
    caption: 'being handled',
    dotClass: 'bg-[#A966BC]',
    badgeClass: 'bg-[#7B2D8E]/10 text-[#7B2D8E] border-[#7B2D8E]/25',
    chartColor: '#A966BC',
  },
  resolved: {
    key: 'resolved',
    label: 'Resolved',
    caption: 'wrapped up',
    dotClass: 'bg-[#C89ED3]',
    badgeClass: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
    chartColor: '#C89ED3',
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
    badgeClass: 'bg-[#7B2D8E] text-white border-[#7B2D8E]',
  },
  high: {
    key: 'high',
    label: 'High',
    badgeClass: 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/30',
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
    badgeClass: 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/25',
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
    badgeClass: 'bg-[#FAF6FB] text-[#7B2D8E] border-[#7B2D8E]/20',
    dotClass: 'bg-[#7B2D8E]/60',
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
      return "Please allow me a minute, I'll transfer you to a live support representative for further assistance."
    case 'active': {
      const cleanName = (staffName ?? '').trim()
      return cleanName
        ? `${cleanName} from Dermaspace Customer Care has joined the chat.`
        : 'A customer representative has joined the chat.'
    }
    case 'guest_needed':
      return "Please allow me a minute — share your name and email below so I can transfer you to a live support representative."
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

// ---------------------------------------------------------------------------
// Live Chat Continuity & Transcript Helpers
// ---------------------------------------------------------------------------

export interface SerializableLiveChatMessage {
  id: string
  sender_role: 'user' | 'staff' | 'system'
  sender_name?: string | null
  body: string
  created_at: string
}

export interface SerializedLiveChatEntry {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  aiContent: string
  timestampIso: string
  liveChatMeta: {
    sessionId: string
    supportCode: string
    kind: 'user' | 'staff' | 'divider'
    senderName?: string
  }
}

export function buildLiveChatTranscriptDownloadText(input: {
  supportCode: string
  topic?: string | null
  messages: SerializableLiveChatMessage[]
}): string {
  const code = (input.supportCode || '').trim() || 'DS-LC'
  const lines: string[] = [
    'Dermaspace Live Support Transcript',
    `Support ID: ${code}`,
    ...(input.topic?.trim() ? [`Topic: ${input.topic.trim()}`] : []),
    '----------------------------------------',
    '',
  ]

  for (const m of input.messages) {
    if (
      m.sender_role === 'system' &&
      /will be with you shortly/i.test(m.body)
    ) {
      continue
    }
    let time = ''
    try {
      const d = new Date(m.created_at)
      if (!Number.isNaN(d.getTime())) {
        time = d.toLocaleTimeString('en-NG', {
          hour: 'numeric',
          minute: '2-digit',
        })
      }
    } catch {
      time = ''
    }
    const prefix = time ? `[${time}] ` : ''
    if (m.sender_role === 'system') {
      lines.push(`${prefix}--- ${m.body} ---`)
    } else if (m.sender_role === 'staff') {
      const sender = (m.sender_name || '').trim() || 'Customer Care'
      lines.push(`${prefix}${sender}: ${m.body}`)
    } else {
      lines.push(`${prefix}You: ${m.body}`)
    }
  }

  return lines.join('\n')
}

export function convertLiveChatMessagesToThreadEntries(input: {
  sessionId: string
  supportCode: string
  staffName?: string | null
  messages: SerializableLiveChatMessage[]
}): SerializedLiveChatEntry[] {
  const code = resolveSupportId(input.supportCode, input.sessionId)
  const fallbackStaff = (input.staffName ?? '').trim() || 'Customer Care'
  const entries: SerializedLiveChatEntry[] = []

  for (const m of input.messages) {
    if (
      m.sender_role === 'system' &&
      /will be with you shortly/i.test(m.body)
    ) {
      continue
    }
    if (!m.body || !m.body.trim()) continue

    if (m.sender_role === 'user') {
      entries.push({
        id: `lc-${input.sessionId}-${m.id}`,
        role: 'user',
        content: m.body,
        aiContent: m.body,
        timestampIso: m.created_at,
        liveChatMeta: {
          sessionId: input.sessionId,
          supportCode: code,
          kind: 'user',
        },
      })
    } else if (m.sender_role === 'staff') {
      const sender = (m.sender_name || '').trim() || fallbackStaff
      entries.push({
        id: `lc-${input.sessionId}-${m.id}`,
        role: 'assistant',
        content: m.body,
        aiContent: `[Live Support (${code}) · ${sender}]: ${m.body}`,
        timestampIso: m.created_at,
        liveChatMeta: {
          sessionId: input.sessionId,
          supportCode: code,
          kind: 'staff',
          senderName: sender,
        },
      })
    } else {
      entries.push({
        id: `lc-${input.sessionId}-${m.id}`,
        role: 'assistant',
        content: m.body,
        aiContent: `[Live Support (${code}) Event]: ${m.body}`,
        timestampIso: m.created_at,
        liveChatMeta: {
          sessionId: input.sessionId,
          supportCode: code,
          kind: 'divider',
        },
      })
    }
  }

  return entries
}

export interface ChatTurnForAi {
  role: 'user' | 'assistant' | 'system'
  content: string
  isError?: boolean
  aiContent?: string
  liveChatMeta?: {
    sessionId: string
    supportCode: string
    kind: 'user' | 'staff' | 'divider'
    senderName?: string
  }
  attachments?: Array<{ url: string; contentType: string }>
}

export function formatThreadMessagesForAiApi(messages: ChatTurnForAi[]): Array<{
  role: 'user' | 'assistant'
  content: string
  attachments?: Array<{ url: string; contentType: string }>
}> {
  return messages
    .filter((m) => !m.isError)
    .filter(
      (m) =>
        m.role === 'user' ||
        m.role === 'assistant' ||
        Boolean(m.liveChatMeta),
    )
    .map((m) => {
      const normalizedRole: 'user' | 'assistant' =
        m.role === 'user' ? 'user' : 'assistant'
      let serialized = m.aiContent || m.content
      if (!m.aiContent && m.liveChatMeta) {
        if (m.liveChatMeta.kind === 'staff') {
          const rep = m.liveChatMeta.senderName || 'Customer Care'
          serialized = `[Live Support (${m.liveChatMeta.supportCode}) · ${rep}]: ${m.content}`
        } else if (m.liveChatMeta.kind === 'divider') {
          serialized = `[Live Support (${m.liveChatMeta.supportCode}) Event]: ${m.content}`
        }
      }
      return {
        role: normalizedRole,
        content: serialized,
        attachments: m.attachments
          ? m.attachments.map((a) => ({
              url: a.url,
              contentType: a.contentType,
            }))
          : undefined,
      }
    })
}

// ---------------------------------------------------------------------------
// Agent Console Helpers: Waiting Notice Filtering, Fast Incremental Merge,
// Presence Status Banner Coherence, and Network Error Copy
// ---------------------------------------------------------------------------

const CUSTOMER_WAITING_NOTICE_RE = /will be with you shortly/i

/**
 * Returns true if a system message is the customer-facing waiting notice
 * ("One of our customer care reps will be with you shortly. Stay tuned!").
 * Customer transcripts hide or replace this automatically; Staff & Admin
 * consoles must NEVER display it because agents need an agent-centric
 * waiting prompt + "Accept & join" CTA instead.
 */
export function isCustomerWaitingNotice(
  msg: { sender_role?: string | null; body?: string | null } | null | undefined,
): boolean {
  if (!msg) return false
  if (msg.sender_role !== 'system') return false
  return CUSTOMER_WAITING_NOTICE_RE.test(msg.body ?? '')
}

export function filterAgentTimelineMessages<
  T extends { sender_role?: string | null; body?: string | null },
>(messages: T[]): T[] {
  return messages.filter((m) => !isCustomerWaitingNotice(m))
}

/**
 * Merges an existing ordered message list with newly polled messages from
 * incremental `?since=` fetches without creating duplicates or unstable ordering.
 */
export function mergeIncrementalMessages<
  T extends { id: string; created_at: string },
>(existing: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return existing
  const byId = new Map<string, T>()
  for (const m of existing) {
    byId.set(m.id, m)
  }
  for (const m of incoming) {
    byId.set(m.id, m)
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
      return ta - tb
    }
    return a.id.localeCompare(b.id)
  })
}

export interface CoherentPresenceBanner {
  leftLabel: string
  rightLabel: string
  dotClass: string
  containerClass: string
  textClass: string
}

/**
 * Produces coherent, non-contradictory status banner copy for Profile Details
 * across Staff & Admin consoles. Never emits duplicated labels like
 * "Offline ... Offline" or conflicting "Away ... Offline".
 */
export function getPresenceStatusMeta(
  presence: {
    state: 'online' | 'away' | 'offline'
    label: string
  },
  sessionStatus?: string | null,
): CoherentPresenceBanner {
  const cleanStatus = (sessionStatus ?? '').trim().toLowerCase()

  if (cleanStatus === 'closed' || cleanStatus === 'abandoned') {
    return {
      leftLabel: cleanStatus === 'abandoned' ? 'Visitor left' : 'Conversation closed',
      rightLabel: 'Ended',
      dotClass: 'bg-gray-400',
      containerClass: 'border-gray-200 bg-gray-50',
      textClass: 'text-gray-600',
    }
  }

  if (presence.state === 'online') {
    return {
      leftLabel: presence.label || 'Online now',
      rightLabel: cleanStatus === 'waiting' ? 'Waiting on site' : 'Active on site',
      dotClass: 'bg-[#7B2D8E] animate-pulse',
      containerClass: 'border-[#7B2D8E]/25 bg-[#FAF6FB]',
      textClass: 'text-[#7B2D8E]',
    }
  }

  if (presence.state === 'away') {
    return {
      leftLabel: 'Tab inactive',
      rightLabel: 'Idle',
      dotClass: 'bg-[#A966BC]',
      containerClass: 'border-[#7B2D8E]/20 bg-[#FAF6FB]',
      textClass: 'text-[#7B2D8E]',
    }
  }

  // Offline while session is still waiting/active
  const left =
    presence.label && presence.label.toLowerCase() !== 'offline'
      ? presence.label
      : 'Not active on page'
  return {
    leftLabel: left,
    rightLabel: 'Away from chat',
    dotClass: 'bg-gray-400',
    containerClass: 'border-gray-200 bg-gray-50',
    textClass: 'text-gray-600',
  }
}

/**
 * Replaces raw browser network errors ("Failed to fetch", "Load failed", etc.)
 * with clear actionable copy for Admin & Staff agents.
 */
export function sanitizeNetworkErrorMessage(
  err: unknown,
  fallback = 'Could not send message. Check your connection and try again.',
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : ''
  const trimmed = raw.trim()
  if (!trimmed) return fallback
  if (
    /^(failed to fetch|load failed|network\s?error|fetch failed|the internet connection appears to be offline)/i.test(
      trimmed,
    ) ||
    /abort|timeout/i.test(trimmed)
  ) {
    return fallback
  }
  return trimmed
}




