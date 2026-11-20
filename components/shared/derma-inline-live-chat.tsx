'use client'

// ---------------------------------------------------------------------------
// Inline Live Representative Handoff (runs seamlessly INSIDE Derma AI)
// ---------------------------------------------------------------------------
// Replaces the separate floating LiveChatOverlay popup. Whenever a customer
// asks to talk to a human, representative, agent, or support inside Derma AI
// (or clicks a Support/Help CTA), the SAME chat panel smoothly transitions
// into live representative mode:
//   - Signed-in users: auto-escalates to /api/live-chat/request immediately.
//   - Guest visitors: shows an inline quick contact card inside the thread
//     (name + email + optional phone), then connects right in place.
//   - Displays a persistent Support ID (DS-LC-XXXXXX) with copy button so
//     another representative can look up and take over the chat with full
//     previous conversation history.
//   - Displays the representative's real avatar in the header, joined card,
//     and every staff message bubble (preserving each rep's avatar & name
//     across handovers).
//   - Strict Dermaspace palette (#7B2D8E, #5A1D6A, #3E104B, #FAF6FB, white,
//     neutral grays) — zero green/amber/rose, zero shadows, zero gradients.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, Copy, Headphones, Loader2, Star, Ticket, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getHandoffAutoMessage, resolveSupportId } from '@/lib/support-and-chat'

export type InlineLiveStatus = 'waiting' | 'active' | 'closed' | 'abandoned'

export interface InlineLiveSession {
  id: string
  supportCode?: string | null
  status: InlineLiveStatus
  escalatedAt: string
  acceptedAt: string | null
  closedAt: string | null
  ratedAt: string | null
}

export interface InlineLiveStaff {
  id?: string
  displayName: string
  avatarUrl: string
}

export interface InlineLivePayload {
  session: InlineLiveSession | null
  staff: InlineLiveStaff | null
}

export interface InlineLiveMessage {
  id: string
  session_id: string
  sender_role: 'user' | 'staff' | 'system'
  sender_id?: string | null
  sender_name?: string | null
  sender_avatar_url?: string | null
  body: string
  created_at: string
}

export interface TranscriptEntry {
  role: string
  content: string
}

export interface UseInlineLiveChatOptions {
  isOpen: boolean
  enabled?: boolean
  onSessionChange?: () => void
}

// ---------------------------------------------------------------------------
// RepAvatar — resilient staff portrait with graceful fallback to default
// front-desk avatar and brand monogram so a broken URL never shows an empty box.
// ---------------------------------------------------------------------------

export function RepAvatar({
  src,
  name,
  size = 36,
  className,
}: {
  src?: string | null
  name?: string | null
  size?: number
  className?: string
}) {
  const cleanSrc = (src ?? '').trim()
  const [stage, setStage] = useState<'primary' | 'fallback' | 'monogram'>(
    cleanSrc ? 'primary' : 'fallback',
  )

  useEffect(() => {
    setStage(cleanSrc ? 'primary' : 'fallback')
  }, [cleanSrc])

  const label = (name ?? '').trim() || 'Representative'
  const initial = label.charAt(0).toUpperCase() || 'D'

  if (stage === 'monogram') {
    return (
      <div
        aria-label={label}
        style={{ width: size, height: size }}
        className={cn(
          'rounded-full bg-[#7B2D8E] text-white font-semibold flex items-center justify-center shrink-0 select-none',
          size <= 28 ? 'text-[11px]' : 'text-[13px]',
          className,
        )}
      >
        {initial}
      </div>
    )
  }

  const activeSrc = stage === 'primary' ? cleanSrc : '/avatars/f1.jpg'
  return (
    <Image
      src={activeSrc}
      alt={label}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => {
        setStage((prev) => (prev === 'primary' && activeSrc !== '/avatars/f1.jpg' ? 'fallback' : 'monogram'))
      }}
      style={{ width: size, height: size }}
      className={cn(
        'rounded-full object-cover shrink-0 border border-[#7B2D8E]/20 bg-[#FAF6FB]',
        className,
      )}
    />
  )
}

export function useInlineLiveChat({
  isOpen,
  enabled = true,
  onSessionChange,
}: UseInlineLiveChatOptions) {
  const [active, setActive] = useState<InlineLivePayload | null>(null)
  const [messages, setMessages] = useState<InlineLiveMessage[]>([])
  const [connecting, setConnecting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline guest pre-chat state (rendered right inside the chat feed)
  const [guestFormOpen, setGuestFormOpen] = useState(false)
  const [guestTopic, setGuestTopic] = useState<string | null>(null)
  const [guestTranscript, setGuestTranscript] = useState<TranscriptEntry[]>([])
  const [guestSubmitting, setGuestSubmitting] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  // Inline post-chat rating state
  const [showRating, setShowRating] = useState(false)
  const [ratingSessionId, setRatingSessionId] = useState<string | null>(null)
  const [ratingStaffName, setRatingStaffName] = useState<string | undefined>(undefined)
  const [serviceRating, setServiceRating] = useState(0)
  const [staffRating, setStaffRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [savingRating, setSavingRating] = useState(false)
  const [ratingDone, setRatingDone] = useState(false)

  const lastFetchedRef = useRef<string | null>(null)
  const prevStatusRef = useRef<InlineLiveStatus | null>(null)
  const prevStaffKeyRef = useRef<string | null>(null)
  const [justConnected, setJustConnected] = useState(false)

  const session = active?.session ?? null
  const staff = active?.staff ?? null
  const sessionId = session?.id ?? null
  const status = session?.status ?? null
  const isLiveMode = status === 'waiting' || status === 'active'
  const staffKey = staff ? `${staff.id || ''}:${staff.displayName}` : null

  // Detect waiting -> active OR staff handover for brief inline notice
  useEffect(() => {
    const prevStatus = prevStatusRef.current
    const prevStaffKey = prevStaffKeyRef.current
    prevStatusRef.current = status
    prevStaffKeyRef.current = staffKey

    const newlyJoined = prevStatus === 'waiting' && status === 'active'
    const handedOver =
      status === 'active' &&
      Boolean(prevStaffKey) &&
      Boolean(staffKey) &&
      prevStaffKey !== staffKey

    if (newlyJoined || handedOver) {
      setJustConnected(true)
      const t = window.setTimeout(() => setJustConnected(false), 5000)
      return () => window.clearTimeout(t)
    }
  }, [status, staffKey])

  const fetchActive = useCallback(async (): Promise<InlineLivePayload | null> => {
    try {
      const res = await fetch('/api/live-chat/active', { credentials: 'include' })
      if (!res.ok) return null
      const json = (await res.json()) as InlineLivePayload
      setActive(json)
      if (json.session?.status === 'closed' && !json.session.ratedAt) {
        setRatingSessionId(json.session.id)
        setRatingStaffName(json.staff?.displayName)
        setShowRating(true)
      }
      return json
    } catch {
      return null
    }
  }, [])

  // Poll /api/live-chat/active while chat is open (or once on mount to resume an open session)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      await fetchActive()
    }
    run()
    if (!isOpen && !isLiveMode) return
    const ms = isOpen && isLiveMode ? 3000 : isOpen ? 8000 : 12000
    const id = window.setInterval(run, ms)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, isOpen, isLiveMode, fetchActive])

  // Poll messages while live session is open & panel is visible
  useEffect(() => {
    if (!enabled || !sessionId || !isLiveMode || !isOpen) return
    let cancelled = false
    const pollMessages = async () => {
      try {
        const since = lastFetchedRef.current
          ? `?since=${encodeURIComponent(lastFetchedRef.current)}`
          : ''
        const res = await fetch(
          `/api/live-chat/sessions/${sessionId}/messages${since}`,
          { credentials: 'include' },
        )
        if (!res.ok) return
        const json = (await res.json()) as { messages?: InlineLiveMessage[] }
        const incoming = json.messages ?? []
        if (cancelled || incoming.length === 0) return
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const merged = [...prev]
          for (const m of incoming) {
            if (!seen.has(m.id)) merged.push(m)
          }
          merged.sort((a, b) => a.created_at.localeCompare(b.created_at))
          return merged
        })
        lastFetchedRef.current = incoming[incoming.length - 1].created_at
        onSessionChange?.()
      } catch {
        /* transient */
      }
    }
    pollMessages()
    const id = window.setInterval(pollMessages, 2500)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [enabled, sessionId, isLiveMode, isOpen, onSessionChange])

  // Trigger live representative handoff (auto-called from user message or AI tool)
  const triggerHandoff = useCallback(
    async (
      topic?: string | null,
      transcript?: TranscriptEntry[],
    ): Promise<'started' | 'already_active' | 'guest_form' | 'error'> => {
      setError(null)
      setGuestError(null)

      if (session && (session.status === 'waiting' || session.status === 'active')) {
        return 'already_active'
      }

      setConnecting(true)
      try {
        const res = await fetch('/api/live-chat/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            topic: topic ? topic.slice(0, 500) : 'Customer support',
            transcript: transcript?.slice(-20) ?? null,
          }),
        })

        if (res.ok) {
          const created = (await res.json().catch(() => null)) as {
            sessionId?: string
            supportCode?: string
            status?: InlineLiveStatus
          } | null
          setShowRating(false)
          setRatingDone(false)
          setRatingSessionId(null)
          setGuestFormOpen(false)
          setMessages([])
          lastFetchedRef.current = null
          const updated = await fetchActive()
          if (!updated?.session && created?.sessionId) {
            setActive({
              session: {
                id: created.sessionId,
                supportCode: resolveSupportId(created.supportCode, created.sessionId),
                status: created.status || 'waiting',
                escalatedAt: new Date().toISOString(),
                acceptedAt: null,
                closedAt: null,
                ratedAt: null,
              },
              staff: null,
            })
          }
          onSessionChange?.()
          return 'started'
        }

        const data = (await res.json().catch(() => ({}))) as {
          guestFormRequired?: boolean
          signinRequired?: boolean
          error?: string
        }

        if (res.status === 401 || data.guestFormRequired || data.signinRequired) {
          setGuestTopic(topic || 'Customer support')
          setGuestTranscript(transcript?.slice(-20) ?? [])
          setGuestFormOpen(true)
          onSessionChange?.()
          return 'guest_form'
        }

        setError(data.error || 'Could not reach our front desk right now. Please try again.')
        return 'error'
      } catch {
        setError('Connection hiccup while reaching support. Please try again.')
        return 'error'
      } finally {
        setConnecting(false)
      }
    },
    [session, fetchActive, onSessionChange],
  )

  const submitGuestHandoff = useCallback(
    async (input: { name: string; email: string; phone?: string }) => {
      const name = input.name.trim()
      const email = input.email.trim()
      const phone = input.phone?.trim() || ''

      if (name.length < 2) {
        setGuestError('Please enter your name.')
        return false
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setGuestError('Please enter a valid email address.')
        return false
      }

      setGuestSubmitting(true)
      setGuestError(null)
      try {
        const res = await fetch('/api/live-chat/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            topic: guestTopic || 'Customer support',
            transcript: guestTranscript.length > 0 ? guestTranscript : null,
            guest: { name, email, phone: phone || undefined },
          }),
        })
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string }
          setGuestError(json.error || 'Could not start live support. Please try again.')
          return false
        }
        const created = (await res.json().catch(() => null)) as {
          sessionId?: string
          supportCode?: string
          status?: InlineLiveStatus
        } | null

        setGuestFormOpen(false)
        setShowRating(false)
        setRatingDone(false)
        setMessages([])
        lastFetchedRef.current = null
        const updated = await fetchActive()
        if (!updated?.session && created?.sessionId) {
          setActive({
            session: {
              id: created.sessionId,
              supportCode: resolveSupportId(created.supportCode, created.sessionId),
              status: created.status || 'waiting',
              escalatedAt: new Date().toISOString(),
              acceptedAt: null,
              closedAt: null,
              ratedAt: null,
            },
            staff: null,
          })
        }
        onSessionChange?.()
        return true
      } catch {
        setGuestError('Network error. Please try again.')
        return false
      } finally {
        setGuestSubmitting(false)
      }
    },
    [guestTopic, guestTranscript, fetchActive, onSessionChange],
  )

  const cancelGuestHandoff = useCallback(() => {
    setGuestFormOpen(false)
    setGuestError(null)
  }, [])

  const sendLiveMessage = useCallback(
    async (rawBody: string): Promise<boolean> => {
      const body = rawBody.trim()
      if (!body || !sessionId || sending) return false
      setSending(true)
      setError(null)
      try {
        const res = await fetch(`/api/live-chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ body }),
        })
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string }
          setError(json.error || 'Could not send message. Please try again.')
          return false
        }
        const { message } = (await res.json()) as { message: InlineLiveMessage }
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message],
        )
        lastFetchedRef.current = message.created_at
        onSessionChange?.()
        return true
      } catch {
        setError('Connection hiccup — please try sending again.')
        return false
      } finally {
        setSending(false)
      }
    },
    [sessionId, sending, onSessionChange],
  )

  const endLiveChat = useCallback(async () => {
    if (!sessionId) return
    setError(null)
    try {
      await fetch(`/api/live-chat/sessions/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'close' }),
      })
      setRatingSessionId(sessionId)
      setRatingStaffName(staff?.displayName)
      setShowRating(true)
      setActive((prev) =>
        prev?.session
          ? {
              ...prev,
              session: {
                ...prev.session,
                status: 'closed',
                closedAt: new Date().toISOString(),
              },
            }
          : null,
      )
      onSessionChange?.()
    } catch {
      setError('Could not end live session right now.')
    }
  }, [sessionId, staff?.displayName, onSessionChange])

  const submitRating = useCallback(async () => {
    if (!ratingSessionId || serviceRating < 1 || staffRating < 1) return
    setSavingRating(true)
    setError(null)
    try {
      const res = await fetch(`/api/live-chat/sessions/${ratingSessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'rate',
          serviceRating,
          staffRating,
          comment: ratingComment.trim() || undefined,
        }),
      })
      if (!res.ok) {
        setError('Could not save your rating. Please try again.')
        return
      }
      setRatingDone(true)
      window.setTimeout(() => {
        setShowRating(false)
        setRatingDone(false)
        setRatingSessionId(null)
        setServiceRating(0)
        setStaffRating(0)
        setRatingComment('')
        setActive(null)
        setMessages([])
        lastFetchedRef.current = null
      }, 1500)
    } finally {
      setSavingRating(false)
    }
  }, [ratingSessionId, serviceRating, staffRating, ratingComment])

  const skipRating = useCallback(async () => {
    const id = ratingSessionId
    setShowRating(false)
    setRatingSessionId(null)
    setServiceRating(0)
    setStaffRating(0)
    setRatingComment('')
    setActive(null)
    setMessages([])
    lastFetchedRef.current = null
    if (id) {
      fetch(`/api/live-chat/sessions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'skip_rating' }),
      }).catch(() => {})
    }
  }, [ratingSessionId])

  return {
    active,
    session,
    staff,
    status,
    messages,
    isLiveMode,
    connecting,
    sending,
    justConnected,
    error,
    clearError: () => setError(null),
    guestFormOpen,
    guestSubmitting,
    guestError,
    showRating,
    ratingStaffName,
    serviceRating,
    staffRating,
    ratingComment,
    savingRating,
    ratingDone,
    setServiceRating,
    setStaffRating,
    setRatingComment,
    triggerHandoff,
    submitGuestHandoff,
    cancelGuestHandoff,
    sendLiveMessage,
    endLiveChat,
    submitRating,
    skipRating,
    refreshActive: fetchActive,
  }
}

// ---------------------------------------------------------------------------
// InlineLiveHeaderControls — safe 2-step End live chat controls in header
// ---------------------------------------------------------------------------

export function InlineLiveHeaderControls({
  onEndLiveChat,
}: {
  onEndLiveChat: () => void
}) {
  const [confirmEnd, setConfirmEnd] = useState(false)

  if (confirmEnd) {
    return (
      <div className="flex items-center gap-1 mr-1">
        <button
          type="button"
          onClick={() => {
            setConfirmEnd(false)
            onEndLiveChat()
          }}
          className="text-[11px] font-semibold text-white bg-[#3E104B] hover:bg-[#5A1D6A] px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setConfirmEnd(false)}
          className="text-[11px] font-medium text-gray-600 px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-50 whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmEnd(true)}
      className="mr-1 text-[11px] font-semibold text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/25 hover:border-[#7B2D8E]/45 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
    >
      End chat
    </button>
  )
}

// ---------------------------------------------------------------------------
// InlineLiveFeed — renders live handoff status (with Support ID & rep avatar),
// guest form, live thread (with per-message staff avatars), and post-chat
// rating cleanly INSIDE the unified Derma AI message stream.
// ---------------------------------------------------------------------------

export function InlineLiveFeed({
  session,
  staff,
  messages,
  connecting,
  justConnected,
  error,
  onClearError,
  guestFormOpen,
  guestSubmitting,
  guestError,
  onSubmitGuest,
  onCancelGuest,
  showRating,
  ratingStaffName,
  serviceRating,
  staffRating,
  ratingComment,
  savingRating,
  ratingDone,
  onServiceRatingChange,
  onStaffRatingChange,
  onRatingCommentChange,
  onSubmitRating,
  onSkipRating,
}: {
  session: InlineLiveSession | null
  staff: InlineLiveStaff | null
  messages: InlineLiveMessage[]
  connecting: boolean
  justConnected: boolean
  error: string | null
  onClearError: () => void
  guestFormOpen: boolean
  guestSubmitting: boolean
  guestError: string | null
  onSubmitGuest: (input: { name: string; email: string; phone?: string }) => Promise<boolean>
  onCancelGuest: () => void
  showRating: boolean
  ratingStaffName?: string
  serviceRating: number
  staffRating: number
  ratingComment: string
  savingRating: boolean
  ratingDone: boolean
  onServiceRatingChange: (n: number) => void
  onStaffRatingChange: (n: number) => void
  onRatingCommentChange: (v: string) => void
  onSubmitRating: () => void
  onSkipRating: () => void
}) {
  const [copiedId, setCopiedId] = useState(false)
  const isWaiting = session?.status === 'waiting'
  const isActive = session?.status === 'active'
  const isLive = isWaiting || isActive
  const supportCode = session ? resolveSupportId(session.supportCode, session.id) : null

  const copySupportCode = useCallback(() => {
    if (!supportCode || typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard
      .writeText(supportCode)
      .then(() => {
        setCopiedId(true)
        window.setTimeout(() => setCopiedId(false), 2000)
      })
      .catch(() => {})
  }, [supportCode])

  if (!connecting && !isLive && !guestFormOpen && !showRating && !error) {
    return null
  }

  return (
    <div className="space-y-3 pt-1" data-testid="inline-live-chat-feed">
      {/* Live status divider card — displays staff avatar + Support ID */}
      {(connecting || isLive) && (
        <div className="rounded-2xl bg-[#FAF6FB] border border-[#7B2D8E]/20 px-3.5 py-3 space-y-2.5">
          <div className="flex items-center gap-3">
            {staff ? (
              <RepAvatar
                src={staff.avatarUrl}
                name={staff.displayName}
                size={40}
                className="ring-2 ring-[#7B2D8E]/15"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center shrink-0">
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Headphones className="w-4 h-4" />
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7B2D8E] opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7B2D8E]" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B2D8E] truncate">
                  {isActive
                    ? justConnected
                      ? 'Representative joined'
                      : 'Live Customer Care'
                    : 'Connecting to an agent'}
                </p>
              </div>
              <p className="text-[12.5px] text-gray-700 leading-snug mt-0.5">
                {isActive
                  ? getHandoffAutoMessage('active', staff?.displayName)
                  : 'You are in the queue — feel free to add any details below while we connect you.'}
              </p>
            </div>
          </div>

          {supportCode && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#7B2D8E]/12">
              <div className="inline-flex items-center gap-1.5 min-w-0">
                <Ticket className="w-3.5 h-3.5 text-[#7B2D8E] shrink-0" />
                <span className="text-[11px] text-gray-500 whitespace-nowrap">Support ID</span>
                <span
                  data-testid="live-chat-support-id"
                  className="font-mono text-[11.5px] font-semibold text-[#3E104B] tracking-wide truncate"
                >
                  {supportCode}
                </span>
              </div>
              <button
                type="button"
                onClick={copySupportCode}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-[#7B2D8E]/20 hover:border-[#7B2D8E]/45 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#5A1D6A] transition-colors shrink-0"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3 h-3 text-[#7B2D8E]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[#7B2D8E]" />
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline guest details form (anonymous visitors only) */}
      {guestFormOpen && (
        <GuestHandoffCard
          submitting={guestSubmitting}
          error={guestError}
          onSubmit={onSubmitGuest}
          onCancel={onCancelGuest}
        />
      )}

      {/* Live messages from the representative & customer */}
      {isLive && messages.length > 0 && (
        <div className="space-y-2.5">
          {messages
            .filter(
              (m) =>
                !(
                  m.sender_role === 'system' &&
                  /will be with you shortly/i.test(m.body)
                ),
            )
            .map((m) => (
              <InlineLiveBubble key={m.id} message={m} staff={staff} />
            ))}
        </div>
      )}

      {/* Error banner (brand plum, zero red/rose) */}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#FAF6FB] border border-[#3E104B]/25 px-3 py-2 text-[12px] text-[#3E104B]">
          <span>{error}</span>
          <button
            type="button"
            onClick={onClearError}
            aria-label="Dismiss notice"
            className="p-0.5 rounded-full hover:bg-[#3E104B]/10 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Post-chat rating card right inside the chat */}
      {showRating && (
        <InlineRatingCard
          done={ratingDone}
          saving={savingRating}
          staffName={ratingStaffName}
          serviceRating={serviceRating}
          staffRating={staffRating}
          comment={ratingComment}
          onServiceRatingChange={onServiceRatingChange}
          onStaffRatingChange={onStaffRatingChange}
          onCommentChange={onRatingCommentChange}
          onSubmit={onSubmitRating}
          onSkip={onSkipRating}
        />
      )}
    </div>
  )
}

function InlineLiveBubble({
  message,
  staff,
}: {
  message: InlineLiveMessage
  staff: InlineLiveStaff | null
}) {
  const time = useMemo(() => {
    try {
      return new Date(message.created_at).toLocaleTimeString('en-NG', {
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }, [message.created_at])

  if (message.sender_role === 'system') {
    return (
      <div className="flex justify-center py-0.5">
        <div className="text-[11.5px] text-[#5A1D6A] bg-[#FAF6FB] border border-[#7B2D8E]/15 px-3 py-1.5 rounded-2xl max-w-[90%] text-center leading-relaxed">
          {message.body}
        </div>
      </div>
    )
  }

  if (message.sender_role === 'staff') {
    // Prefer the sender's own avatar & name stored on the message so previous
    // representatives stay accurately attributed even after a chat handover.
    const senderName = message.sender_name || staff?.displayName || 'Customer Care'
    const senderAvatarUrl = message.sender_avatar_url || staff?.avatarUrl || null

    return (
      <div className="flex items-end gap-2" data-testid="live-chat-staff-bubble">
        <RepAvatar src={senderAvatarUrl} name={senderName} size={28} />
        <div className="max-w-[82%] min-w-0">
          <p className="text-[10px] font-medium text-[#7B2D8E] ml-2 mb-0.5">
            {senderName}
          </p>
          <div className="bg-white border border-gray-200 px-3.5 py-2 rounded-2xl rounded-bl-sm">
            <p className="text-[13.5px] text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
              {message.body}
            </p>
          </div>
          {time && <p className="text-[10px] text-gray-400 mt-1 ml-2">{time}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] min-w-0">
        <div className="bg-[#7B2D8E] text-white px-3.5 py-2 rounded-2xl rounded-br-sm">
          <p className="text-[13.5px] whitespace-pre-wrap break-words leading-relaxed">
            {message.body}
          </p>
        </div>
        {time && (
          <p className="text-[10px] text-gray-400 mt-1 mr-2 text-right">{time}</p>
        )}
      </div>
    </div>
  )
}

function GuestHandoffCard({
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  submitting: boolean
  error: string | null
  onSubmit: (input: { name: string; email: string; phone?: string }) => Promise<boolean>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ name, email, phone })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-[#7B2D8E]/25 p-3.5 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B2D8E]">
            Connect with a representative
          </p>
          <p className="text-[12px] text-gray-600 mt-0.5">
            Share your name and email so our team can join you right here.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel live handoff"
          className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          autoComplete="name"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-base sm:text-[13px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-base sm:text-[13px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          autoComplete="tel"
          className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-base sm:text-[13px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none"
        />
      </div>

      {error && (
        <p className="text-[12px] text-[#3E104B] bg-[#FAF6FB] border border-[#3E104B]/20 rounded-xl px-2.5 py-1.5">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-[12.5px] font-semibold px-4 py-2 transition-colors disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {submitting ? 'Connecting…' : 'Connect to an agent'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gray-200 px-3.5 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50"
        >
          Not now
        </button>
      </div>
    </form>
  )
}

function InlineRatingCard({
  done,
  saving,
  staffName,
  serviceRating,
  staffRating,
  comment,
  onServiceRatingChange,
  onStaffRatingChange,
  onCommentChange,
  onSubmit,
  onSkip,
}: {
  done: boolean
  saving: boolean
  staffName?: string
  serviceRating: number
  staffRating: number
  comment: string
  onServiceRatingChange: (n: number) => void
  onStaffRatingChange: (n: number) => void
  onCommentChange: (v: string) => void
  onSubmit: () => void
  onSkip: () => void
}) {
  if (done) {
    return (
      <div className="rounded-2xl bg-[#FAF6FB] border border-[#7B2D8E]/20 p-4 text-center">
        <p className="text-[13px] font-semibold text-[#5A1D6A]">
          Thank you for your feedback
        </p>
        <p className="text-[11.5px] text-gray-600 mt-0.5">
          You are back with Derma AI whenever you need help.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-[#7B2D8E]/25 p-4 space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7B2D8E]">
          Live chat ended
        </p>
        <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
          How was your conversation{staffName ? ` with ${staffName}` : ''}?
        </p>
      </div>

      <StarRow
        label="Overall support"
        value={serviceRating}
        onChange={onServiceRatingChange}
      />
      <StarRow
        label={staffName ? `Helpfulness (${staffName})` : 'Representative'}
        value={staffRating}
        onChange={onStaffRatingChange}
      />

      <textarea
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        rows={2}
        placeholder="Optional note for our team…"
        className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-base sm:text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-[#7B2D8E] focus:outline-none resize-none"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || serviceRating < 1 || staffRating < 1}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white text-[12.5px] font-semibold px-4 py-2 transition-colors disabled:opacity-40"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Submit rating
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full border border-gray-200 px-3.5 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50"
        >
          Skip
        </button>
      </div>
    </div>
  )
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label}: ${n} out of 5`}
            className="p-0.5 rounded transition-transform active:scale-90"
          >
            <Star
              className={cn(
                'w-4 h-4 transition-colors',
                n <= value
                  ? 'fill-[#7B2D8E] text-[#7B2D8E]'
                  : 'text-gray-300 hover:text-[#7B2D8E]/60',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
