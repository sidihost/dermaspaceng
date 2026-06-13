'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  ArrowLeft, Send, Loader2, Clock, Tag,
  AlertCircle, CheckCircle2, MessageCircle, Lock,
} from 'lucide-react'
import { playSound } from '@/lib/notification-sound'
import { resolveAdminAvatar, STAFF_DEFAULT_AVATAR } from '@/lib/admin-avatars'
import { TicketReviewPrompt } from '@/components/support/ticket-review-prompt'
import { AttachmentList } from '@/components/shared/attachment-list'
import { AttachmentComposer } from '@/components/shared/attachment-composer'
import type { ReplyAttachment } from '@/lib/attachments'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string | null
}

// Reusable "user avatar" bubble. Prefers the uploaded picture when
// available and falls back to the coloured initials tile the page
// used to render unconditionally. Previously the ticket thread never
// showed the user's chosen avatar which felt disconnected from the
// rest of the dashboard.
function UserAvatar({ user, size = 36 }: { user: UserData | null; size?: number }) {
  const dim = `${size}px`
  return (
    <div
      className="rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-medium shrink-0 overflow-hidden"
      style={{ width: dim, height: dim }}
    >
      {user?.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={user.avatarUrl}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      ) : (
        <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
      )}
    </div>
  )
}

// Staff avatar bubble used in the ticket replies list.
//
// We deliberately don't render a Headphones glyph here even as a
// fallback — the user said the music-icon-looking placeholder felt
// like an unrelated thing pasted into their conversation. Instead:
//
//   1. uploaded portrait wins,
//   2. role-specific default ("/avatars/staff-default.jpg" or admin
//      equivalent) covers anyone who hasn't picked a portrait yet,
//   3. as a last-resort visual we show the staff member's initials
//      on the brand pill — same shape the customer-side avatar uses
//      so the thread reads as two real people talking.
function StaffAvatar({
  name,
  avatarUrl,
  role,
  size = 36,
}: {
  name?: string | null
  avatarUrl?: string | null
  role?: string | null
  size?: number
}) {
  const dim = `${size}px`
  // resolveAdminAvatar handles the upload→role-default precedence;
  // STAFF_DEFAULT_AVATAR keeps a sensible visual when role isn't set
  // (legacy ticket_responses rows where responder_type was bare
  // 'staff' but the joined users row was missing entirely).
  const resolved =
    resolveAdminAvatar(avatarUrl, role) ?? STAFF_DEFAULT_AVATAR
  const initials = (() => {
    if (!name) return ''
    const parts = name.trim().split(/\s+/)
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
  })().toUpperCase()
  return (
    <div
      className="rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-medium shrink-0 overflow-hidden ring-1 ring-[#7B2D8E]/15"
      style={{ width: dim, height: dim }}
    >
      {resolved ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolved}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials || 'DS'}</span>
      )}
    </div>
  )
}

interface TicketResponse {
  id: number
  message: string
  is_staff: boolean
  created_at: string
  staff_name?: string
  // Surfaced by `/api/tickets/[ticketId]` so the thread can render
  // the actual admin/staff portrait instead of a Headphones icon.
  // `staff_avatar_url` is whatever the admin uploaded (or chose from
  // the team avatar picker); `staff_role` lets us pick the right
  // role-specific default when no upload exists.
  staff_avatar_url?: string | null
  staff_role?: string | null
  /** File attachments uploaded with this response (images / PDFs). */
  attachments?: ReplyAttachment[] | null
}

interface TicketDetail {
  id: number
  ticket_id: string
  category: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  attachments?: ReplyAttachment[] | null
  responses: TicketResponse[]
}

// STATUS_CONFIG drives both the inline pill in the header and the new
// status "hero" card that sits above the conversation. Keeping them in
// one place means the colour story can never drift between the two.
//
//   • pillClass — short tag used next to the ticket id.
//   • hero      — full status banner: gradient swatch, icon, headline
//                 and supporting copy that reads like a status page
//                 update (Open → "We've got it." Resolved → "All sorted.").
//   • Icon      — lucide icon used inside the hero's circular badge.
const STATUS_CONFIG = {
  open: {
    label: 'Open',
    pillClass: 'bg-[#7B2D8E]/10 text-[#7B2D8E]',
    hero: {
      Icon: MessageCircle,
      headline: "We've got your ticket",
      detail:
        'Our team has been alerted and will be back to you shortly. Replies arrive in this thread and by email.',
      tone: 'brand' as const,
    },
  },
  in_progress: {
    label: 'In Progress',
    pillClass: 'bg-amber-100 text-amber-700',
    hero: {
      Icon: Clock,
      headline: 'Working on it now',
      detail:
        "An agent has picked this up and is putting together your reply. You'll see it land below the moment it's sent.",
      tone: 'amber' as const,
    },
  },
  resolved: {
    label: 'Resolved',
    // The resolved pill used to ship in emerald — out of step with the
    // rest of the ticket page (the badge, hero icon, response bubbles
    // and CSAT card all read in brand purple). Aligning it on
    // #7B2D8E makes "Resolved" feel like a Dermaspace state, not a
    // generic success colour borrowed from another product.
    pillClass: 'bg-[#7B2D8E]/10 text-[#7B2D8E]',
    hero: {
      Icon: CheckCircle2,
      headline: 'All sorted',
      detail:
        "We've marked this ticket as resolved. If anything still feels off, leave a star rating below or reach back out and we'll reopen it.",
      tone: 'brand' as const,
    },
  },
  closed: {
    label: 'Closed',
    pillClass: 'bg-gray-200 text-gray-700',
    hero: {
      Icon: Lock,
      headline: 'This ticket is closed',
      detail:
        "It's wrapped up and locked, but we'd still love to know how we did. Your feedback shapes the next visit.",
      tone: 'slate' as const,
    },
  },
} as const

// Tailwind tone palette for the hero card. Pulled out so each tone is
// declared explicitly instead of building class strings with template
// strings that Tailwind's JIT can't see.
const TONE_STYLES = {
  brand: {
    card: 'bg-[#7B2D8E]/[0.06] border-[#7B2D8E]/15',
    badge: 'bg-[#7B2D8E] text-white',
    heading: 'text-[#7B2D8E]',
    accentBar: 'bg-[#7B2D8E]',
  },
  amber: {
    card: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-500 text-white',
    heading: 'text-amber-800',
    accentBar: 'bg-amber-500',
  },
  // The "emerald" tone slot kept the original key for backwards
  // compatibility with any STATUS_CONFIG.hero.tone consumer, but it
  // now resolves to brand purple — green felt out of place against
  // the rest of the ticket page (badge, hero icon, response bubbles
  // and CSAT card all read in #7B2D8E). Aligning here means
  // "Resolved" lands as a Dermaspace state rather than a generic
  // success colour borrowed from another product.
  emerald: {
    card: 'bg-[#7B2D8E]/[0.06] border-[#7B2D8E]/15',
    badge: 'bg-[#7B2D8E] text-white',
    heading: 'text-[#7B2D8E]',
    accentBar: 'bg-[#7B2D8E]',
  },
  slate: {
    card: 'bg-gray-50 border-gray-200',
    badge: 'bg-gray-700 text-white',
    heading: 'text-gray-900',
    accentBar: 'bg-gray-700',
  },
} as const

const PRIORITY_CONFIG = {
  low: { label: 'Low Priority', color: 'text-gray-500 bg-gray-50' },
  medium: { label: 'Medium Priority', color: 'text-[#7B2D8E] bg-[#7B2D8E]/5' },
  high: { label: 'High Priority', color: 'text-amber-600 bg-amber-50' },
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50' }
}

const CATEGORY_LABELS: Record<string, string> = {
  booking: 'Booking Inquiry',
  treatment: 'Treatment Questions',
  account: 'Account Help',
  payment: 'Payment/Billing',
  feedback: 'Feedback',
  other: 'Other'
}

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string
  
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [replyAttachments, setReplyAttachments] = useState<ReplyAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Track the highest-seen staff response id so we only chime on genuinely new ones
  const lastStaffResponseIdRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        // Check auth
        const authRes = await fetch('/api/auth/me')
        if (!authRes.ok) {
          router.push('/signin?redirect=/dashboard/support')
          return
        }
        const authData = await authRes.json()
        if (cancelled) return
        setUser(authData.user)

        // Fetch ticket details
        const ticketRes = await fetch(`/api/tickets/${ticketId}`)
        if (!ticketRes.ok) {
          router.push('/dashboard/support')
          return
        }
        const ticketData = await ticketRes.json()
        if (cancelled) return
        setTicket(ticketData.ticket)

        // Seed the baseline so initial load doesn't chime
        const staffResponses = (ticketData.ticket.responses as TicketResponse[]).filter(r => r.is_staff)
        if (staffResponses.length > 0) {
          lastStaffResponseIdRef.current = Math.max(...staffResponses.map(r => r.id))
        }

        // Mark any unread "new admin reply" notifications for this ticket
        // as read now that the user has opened the thread. This clears the
        // badge on /dashboard/support and the dashboard sidebar.
        try {
          await fetch('/api/user/activity', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referenceType: 'ticket',
              referenceId: ticketData.ticket.id,
            }),
          })
        } catch {
          /* non-blocking */
        }
      } catch {
        router.push('/dashboard/support')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    init()

    // Poll every 15s for new staff replies while the tab is visible
    const pollForStaffReply = async () => {
      if (cancelled || typeof document === 'undefined' || document.hidden) return
      try {
        const res = await fetch(`/api/tickets/${ticketId}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const responses = data.ticket?.responses as TicketResponse[] | undefined
        if (!responses) return

        const staffResponses = responses.filter(r => r.is_staff)
        const maxStaffId = staffResponses.length > 0
          ? Math.max(...staffResponses.map(r => r.id))
          : null

        const prevId = lastStaffResponseIdRef.current
        if (maxStaffId !== null && (prevId === null || maxStaffId > prevId)) {
          // Only chime if we had a baseline already (don't chime on first hydrate)
          if (prevId !== null) playSound('receive')
          lastStaffResponseIdRef.current = maxStaffId
          setTicket(data.ticket)
          // User is actively looking at the thread — mark the reply read
          // so the badge on the list view also clears.
          if (prevId !== null) {
            try {
              await fetch('/api/user/activity', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  referenceType: 'ticket',
                  referenceId: data.ticket.id,
                }),
              })
            } catch {
              /* non-blocking */
            }
          }
        }
      } catch {
        /* ignore polling errors */
      }
    }

    const interval = setInterval(pollForStaffReply, 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [router, ticketId])

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!reply.trim() && replyAttachments.length === 0) || isSending) return

    // Optimistic insertion.
    //
    // Previously the user sent a reply, stared at a spinner, and only
    // saw their message appear *after* the POST returned. On a flaky
    // connection that made the whole flow feel broken — the message
    // had "disappeared". Now we render the reply into the conversation
    // the instant they hit Send, using a negative temp id so it can't
    // collide with any real server id. If the POST fails we roll the
    // row back out and restore the draft text so nothing is lost.
    const draft = reply.trim()
    const draftAttachments = replyAttachments
    const tempId = -Date.now()
    const optimistic: TicketResponse = {
      id: tempId,
      message: draft,
      is_staff: false,
      created_at: new Date().toISOString(),
      attachments: draftAttachments,
    }

    setIsSending(true)
    setError('')
    setSuccess('')
    setReply('')
    setReplyAttachments([])
    setTicket(prev =>
      prev ? { ...prev, responses: [...prev.responses, optimistic] } : null,
    )

    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft, attachments: draftAttachments })
      })

      if (!res.ok) {
        throw new Error('Failed to send reply')
      }

      const data = await res.json()

      // Replace the optimistic row with the real server-side row so the
      // id, timestamp and any server-normalized fields are authoritative.
      setTicket(prev =>
        prev
          ? {
              ...prev,
              responses: prev.responses.map(r =>
                r.id === tempId ? data.response : r,
              ),
            }
          : null,
      )

      setSuccess('Your reply has been sent successfully.')
      playSound('send')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      // Roll back: remove the optimistic row and put the draft back in
      // the textarea so the user doesn't have to retype.
      setTicket(prev =>
        prev
          ? {
              ...prev,
              responses: prev.responses.filter(r => r.id !== tempId),
            }
          : null,
      )
      setReply(draft)
      setError('Failed to send your reply. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="bg-gray-50 pt-2">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#7B2D8E]" />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!ticket) {
    return (
      <>
        <Header />
        <main className="bg-gray-50 pt-2 pb-4">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center py-12">
            <p className="text-gray-500">Ticket not found</p>
            <Link href="/dashboard/support" className="text-[#7B2D8E] hover:underline mt-2 inline-block">
              Back to Support
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const isTicketClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <>
      <Header />
      <main className="bg-gray-50 pt-2 pb-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center gap-3 py-2">
            <Link 
              href="/dashboard/support"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Ticket Details</h1>
              <p className="text-xs text-gray-500">View and respond to your ticket</p>
            </div>
          </div>

          {/* Status hero — sits ABOVE the ticket card so it reads as a
              status banner the way Apple, Linear, and GitHub announce
              the state of an issue. Each status has its own colour
              palette, icon, and supporting copy (open / in_progress /
              resolved / closed) so the page tells you at a glance
              where things stand instead of relying on a small pill. */}
          {(() => {
            const cfg = STATUS_CONFIG[ticket.status]
            const tone = TONE_STYLES[cfg.hero.tone]
            const HeroIcon = cfg.hero.Icon
            return (
              <div
                className={`rounded-xl border ${tone.card} mb-4`}
              >
                <div className="p-3.5 flex items-start gap-3">
                  <div
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${tone.badge}`}
                  >
                    <HeroIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold leading-tight ${tone.heading}`}>
                        {cfg.hero.headline}
                      </h3>
                      <span
                        className={`shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cfg.pillClass}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-600 mt-0.5 leading-snug">
                      {cfg.hero.detail}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Main Content */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Ticket Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-mono text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded">
                  {ticket.ticket_id}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status].pillClass}`}>
                  {STATUS_CONFIG[ticket.status].label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_CONFIG[ticket.priority].color}`}>
                  {PRIORITY_CONFIG[ticket.priority].label}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{ticket.subject}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  {CATEGORY_LABELS[ticket.category] || ticket.category}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Created {formatDate(ticket.created_at)}
                </span>
              </div>
            </div>

            {/* Original Message */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-start gap-3">
                <UserAvatar user={user} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</span>
                    <span className="text-xs text-gray-400">{formatShortDate(ticket.created_at)}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Responses Section */}
            {ticket.responses.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-4 sm:px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                  <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.14em]">
                    Responses <span className="text-gray-400 font-medium">({ticket.responses.length})</span>
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {ticket.responses.map((response) => (
                    <div key={response.id} className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        {response.is_staff ? (
                          <StaffAvatar
                            name={response.staff_name}
                            avatarUrl={response.staff_avatar_url}
                            role={response.staff_role}
                          />
                        ) : (
                          <UserAvatar user={user} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-medium text-gray-900">
                              {response.is_staff ? (response.staff_name || 'DermaSpace Support') : `${user?.firstName} ${user?.lastName}`}
                            </span>
                            {response.is_staff && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded">
                                STAFF
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{formatShortDate(response.created_at)}</span>
                          </div>
                          <div className={`rounded-xl p-4 ${
                            response.is_staff 
                              ? 'bg-[#7B2D8E]/5 border border-[#7B2D8E]/10' 
                              : 'bg-gray-50 border border-gray-100'
                          }`}>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{response.message}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Section */}
            <div className="p-4 sm:p-5">
              {success && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-[#7B2D8E]/5 border border-[#7B2D8E]/20 rounded-xl text-sm text-[#7B2D8E] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {isTicketClosed ? (
                <div className="space-y-4">
                  {/* Inline CSAT card — mirrors the Apple / Google /
                      Linear post-resolution prompt. The component
                      handles its own state, hydration and editing
                      flow; passing the live status keeps it reactive
                      if an admin reopens the thread later. */}
                  <TicketReviewPrompt
                    ticketId={ticket.ticket_id}
                    status={ticket.status}
                  />

                  {/* "Thread is locked" affordance — kept understated
                      now that the status hero already announces the
                      ticket is wrapped up. On phones the icon + copy
                      + CTA used to squeeze into three columns, which
                      caused the headline to wrap into a tall thin
                      stack ("Thread / locked. / Need / more / help?").
                      Now we stack vertically on mobile (icon row →
                      copy row → CTA row) and keep the original
                      single-row layout from sm: up. */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-600 leading-snug">
                        Thread locked. Need more help?
                      </p>
                    </div>
                    <Link
                      href="/dashboard/support"
                      className="inline-flex items-center text-sm font-medium text-[#7B2D8E] hover:text-[#6B2278] whitespace-nowrap self-start sm:self-auto pl-12 sm:pl-0"
                    >
                      Open a new ticket &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" />
                    Add a Reply
                  </h3>
                  <form onSubmit={handleSendReply}>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply here..."
                      rows={4}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 hidden sm:block">
                        Our team typically responds within 24-48 hours
                      </p>
                      <button
                        type="submit"
                        disabled={!reply.trim() || isSending}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
