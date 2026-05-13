'use client'

/**
 * Admin consultation detail page — premium redesign.
 *
 * Layout
 * ------
 * On desktop the page is a two-column shell: the main column holds the
 * customer card, concerns, notes, and conversation thread; the sticky
 * right rail holds the status workflow, scheduled-for badge, and a
 * compact meta block. On mobile we collapse to a single column with
 * the same density rhythm.
 *
 * Visual language
 * ---------------
 *   • Hero is a thin brand-purple band — `bg-[#7B2D8E]` with a faint
 *     inner highlight line — instead of the previous chunky gradient
 *     block. Keeps the page airy and lets the customer's information
 *     breathe.
 *   • All info tiles share the same border radius rhythm
 *     (`rounded-2xl` for cards, `rounded-xl` for inner tiles), and
 *     the same 1px hairline border.
 *   • Status workflow is a vertical stack of selectable rows with a
 *     state icon, so the admin sees what's possible *and* what's
 *     active at a glance.
 *   • The conversation is rendered as chat bubbles — internal notes
 *     get a left-aligned amber bubble, customer-facing replies get a
 *     right-aligned brand bubble. Each bubble has a tiny meta line
 *     (sender, sent-as alias, timestamp).
 *
 * No new icons introduced — every glyph is already in lucide-react
 * and `Zap` / `Sparkles` are deliberately excluded per brand rules.
 *
 * Data shape unchanged: see `interface Consultation` and `interface
 * Reply` below.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  CalendarClock,
  ClipboardList,
  Stethoscope,
  CheckCircle2,
  CircleDot,
  XCircle,
  Hourglass,
  Lock,
  ExternalLink,
  Copy,
} from 'lucide-react'
import ReplyComposer from '@/components/admin/reply-composer'
import { useAuth } from '@/hooks/use-auth'

interface Consultation {
  // UUID, not a numeric id. Keeping this as a string aligns with
  // consultations.id VARCHAR(36) in the schema.
  id: string
  name: string
  email: string
  phone: string
  location: string
  concerns: string[] | null
  message: string | null
  status: string
  assigned_to: string | null
  assigned_first_name: string | null
  assigned_last_name: string | null
  admin_notes: string | null
  scheduled_at: string | null
  created_at: string
}

interface Reply {
  id: string
  message: string
  is_internal: boolean
  created_at: string
  staff_first_name: string | null
  staff_last_name: string | null
  // The customer-facing display name set on the reply (Admin / Franca /
  // Itunu / custom). Optional — falls back to the real staff name.
  sender_display_name?: string | null
  // marked true for optimistic rows so we can dim them while the POST
  // is in flight.
  _pending?: boolean
}

type StatusKey = 'pending' | 'confirmed' | 'completed' | 'cancelled'

const STATUSES: StatusKey[] = ['pending', 'confirmed', 'completed', 'cancelled']

const STATUS_META: Record<
  StatusKey,
  {
    label: string
    description: string
    icon: typeof Hourglass
    /** Pill tone used in the right-rail status chip. */
    tone: { ring: string; text: string; bg: string; dot: string }
  }
> = {
  pending: {
    label: 'Pending',
    description: 'Awaiting review',
    icon: Hourglass,
    tone: {
      ring: 'ring-amber-200',
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      dot: 'bg-amber-500',
    },
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Slot held for customer',
    icon: CircleDot,
    tone: {
      ring: 'ring-emerald-200',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      dot: 'bg-emerald-500',
    },
  },
  completed: {
    label: 'Completed',
    description: 'Consultation wrapped',
    icon: CheckCircle2,
    tone: {
      ring: 'ring-[#7B2D8E]/25',
      text: 'text-[#7B2D8E]',
      bg: 'bg-[#7B2D8E]/8',
      dot: 'bg-[#7B2D8E]',
    },
  },
  cancelled: {
    label: 'Cancelled',
    description: 'No longer happening',
    icon: XCircle,
    tone: {
      ring: 'ring-gray-200',
      text: 'text-gray-600',
      bg: 'bg-gray-50',
      dot: 'bg-gray-400',
    },
  },
}

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user: currentUser } = useAuth()
  const defaultSenderName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
      'Admin'
    : 'Admin'

  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [sending, setSending] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null)

  const loadReplies = useCallback(async (consId: string) => {
    try {
      const res = await fetch(
        `/api/admin/reply?requestType=consultation&requestId=${encodeURIComponent(consId)}`,
        { cache: 'no-store' },
      )
      if (res.ok) {
        const data = await res.json()
        setReplies(data.replies || [])
      }
    } catch {
      /* non-fatal */
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/consultations/${id}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        if (!cancelled) {
          setConsultation(data.consultation)
          await loadReplies(String(data.consultation.id))
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, loadReplies])

  const changeStatus = async (status: string) => {
    if (!consultation) return
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: consultation.id,
          action: 'update_status',
          value: status,
        }),
      })
      if (res.ok) setConsultation({ ...consultation, status })
    } finally {
      setUpdating(false)
    }
  }

  const sendReply = async () => {
    if (!consultation || !replyMessage.trim() || sending) return

    const message = replyMessage
    const wasInternal = isInternal
    const sender = senderName.trim() || defaultSenderName

    // Optimistic insert — the admin sees their reply immediately
    // instead of staring at an empty input wondering if anything
    // happened.
    const tempId = `temp-${Date.now()}`
    const optimistic: Reply = {
      id: tempId,
      message,
      is_internal: wasInternal,
      created_at: new Date().toISOString(),
      staff_first_name: currentUser?.firstName || 'You',
      staff_last_name: currentUser?.lastName || '',
      sender_display_name: wasInternal ? null : sender,
      _pending: true,
    }
    setReplies((prev) => [...prev, optimistic])
    setReplyMessage('')
    setSending(true)

    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'consultation',
          requestId: consultation.id,
          userEmail: consultation.email,
          message,
          isInternal: wasInternal,
          senderDisplayName: wasInternal ? undefined : sender,
        }),
      })

      if (!res.ok) {
        setReplies((prev) => prev.filter((r) => r.id !== tempId))
        setReplyMessage(message)
      } else {
        try {
          const repliesRes = await fetch(
            `/api/admin/reply?requestType=consultation&requestId=${encodeURIComponent(
              String(consultation.id),
            )}`,
            { cache: 'no-store' },
          )
          if (repliesRes.ok) {
            const body = await repliesRes.json()
            const serverReplies: Reply[] = body.replies || []
            const optimisticAt = new Date(optimistic.created_at).getTime()
            const matched = serverReplies.some(
              (r) =>
                r.message === optimistic.message &&
                r.is_internal === optimistic.is_internal &&
                Math.abs(new Date(r.created_at).getTime() - optimisticAt) <
                  5 * 60_000,
            )
            if (matched) {
              setReplies(serverReplies)
            } else {
              setReplies((prev) => {
                const tempRow =
                  prev.find((r) => r.id === tempId) ?? {
                    ...optimistic,
                    _pending: false,
                  }
                const merged = [...serverReplies, tempRow]
                return merged.sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime(),
                )
              })
            }
          }
        } catch {
          /* leave optimistic row visible */
        }
      }
    } catch {
      setReplies((prev) => prev.filter((r) => r.id !== tempId))
      setReplyMessage(message)
    } finally {
      setSending(false)
    }
  }

  // Derive a display name + initials defensively. The detail API now
  // composes `name` from `first_name || ' ' || last_name`, but if a
  // row legitimately lacks both we want the page to keep rendering.
  const displayName = useMemo(
    () =>
      consultation
        ? (
            consultation.name?.trim() ||
            consultation.email ||
            'Consultation'
          ).toString()
        : '',
    [consultation],
  )

  const initials = useMemo(() => {
    if (!displayName) return 'C'
    return (
      displayName
        .split(' ')
        .map((p) => p.charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'C'
    )
  }, [displayName])

  const copyToClipboard = (kind: 'email' | 'phone', value: string) => {
    if (!value) return
    try {
      navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1500)
    } catch {
      /* clipboard blocked — silent */
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !consultation) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="py-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              Unable to load consultation
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {error || 'Not found'}
            </p>
          </div>
          <Link
            href="/admin/consultations"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to consultations
          </Link>
        </CardContent>
      </Card>
    )
  }

  // Pretty-print the submitted timestamp once.
  const submitted = new Date(consultation.created_at)
  const submittedDate = submitted.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const submittedTime = submitted.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  const scheduled = consultation.scheduled_at
    ? new Date(consultation.scheduled_at)
    : null
  const scheduledDate = scheduled?.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const scheduledTime = scheduled?.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  const currentStatus: StatusKey = (STATUSES as string[]).includes(
    consultation.status,
  )
    ? (consultation.status as StatusKey)
    : 'pending'
  const tone = STATUS_META[currentStatus].tone

  return (
    <div className="space-y-4 pb-12">
      {/* Back link — sits above the page card so it's clearly a
          breadcrumb, not part of the consultation content. */}
      <Link
        href="/admin/consultations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to consultations
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ─────────────────────────── Main column ─────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {/* Hero card — thin brand band + identity. Replaces the
              chunky gradient block with a calmer, denser header that
              shows the avatar, name, request id, and submitted-at. */}
          <Card className="overflow-hidden border-gray-200/80">
            <div className="relative bg-[#7B2D8E] px-5 sm:px-7 py-5 text-white">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center text-lg font-semibold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                    <Stethoscope className="w-3 h-3" />
                    Consultation
                    <span className="text-white/40">·</span>
                    <span className="font-mono text-white/80 normal-case tracking-normal">
                      #{String(consultation.id).slice(0, 8)}
                    </span>
                  </div>
                  <h1 className="mt-1 text-xl sm:text-2xl font-semibold text-white text-balance leading-tight">
                    {displayName}
                  </h1>
                  <p className="mt-1.5 text-xs text-white/75 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Requested {submittedDate} at {submittedTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact strip — three large tappable rows so the admin
                can call, email, or open the location in one tap.
                Replaces the previous 2-column tile grid with a list
                pattern that scales better on mobile. */}
            <CardContent className="p-5 sm:p-6 space-y-1.5">
              <ContactRow
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={consultation.email}
                href={`mailto:${consultation.email}`}
                onCopy={() => copyToClipboard('email', consultation.email)}
                copied={copied === 'email'}
              />
              <ContactRow
                icon={<Phone className="w-4 h-4" />}
                label="Phone"
                value={consultation.phone}
                href={`tel:${consultation.phone}`}
                onCopy={() => copyToClipboard('phone', consultation.phone)}
                copied={copied === 'phone'}
              />
              <ContactRow
                icon={<MapPin className="w-4 h-4" />}
                label="Preferred clinic"
                value={consultation.location}
              />
            </CardContent>
          </Card>

          {/* Concerns — only renders when present. Concerns become
              real pills with a brand-tinted background; no shoutiness,
              just a calm chip rhythm. */}
          {consultation.concerns && consultation.concerns.length > 0 && (
            <Card className="border-gray-200/80">
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  icon={<ClipboardList className="w-3.5 h-3.5" />}
                  label="Skin concerns"
                  count={consultation.concerns.length}
                />
                <div className="flex flex-wrap gap-1.5">
                  {consultation.concerns.map((concern, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-[#7B2D8E]/8 text-[#7B2D8E] border-[#7B2D8E]/20 font-medium rounded-full px-3 py-1"
                    >
                      {concern}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer notes — quoted with a subtle brand ledger line
              so the admin reads it as the customer's voice, distinct
              from staff replies below. */}
          {consultation.message && (
            <Card className="border-gray-200/80">
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  icon={<MessageSquare className="w-3.5 h-3.5" />}
                  label="Customer notes"
                />
                <blockquote className="relative pl-4 border-l-2 border-[#7B2D8E]/40">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {consultation.message}
                  </p>
                </blockquote>
              </CardContent>
            </Card>
          )}

          {/* Conversation — bubble layout. Internal notes sit left in
              amber so they don't get confused with customer-facing
              replies (right, brand purple). Each bubble carries a
              tiny meta row above with the real staff name + alias. */}
          <Card className="border-gray-200/80">
            <CardContent className="p-5 sm:p-6">
              <SectionHeader
                icon={<MessageSquare className="w-3.5 h-3.5" />}
                label="Conversation"
                count={replies.length}
              />

              {replies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-8 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    No replies yet
                  </p>
                  <p className="mt-1 text-xs text-gray-500 max-w-xs mx-auto">
                    Send the first reply below — the customer will get an
                    email and an in-app notification.
                  </p>
                </div>
              ) : (
                <ol className="space-y-3">
                  {replies.map((r) => (
                    <ConversationBubble key={r.id} reply={r} />
                  ))}
                </ol>
              )}

              {/* Composer — shared component with AI improve toolbar
                  and a sender display-name picker. Kept inline with
                  the conversation so the admin's reply lands in the
                  same visual stream they were just reading. */}
              <section className="pt-5 mt-5 border-t border-gray-100">
                <ReplyComposer
                  value={replyMessage}
                  onChange={setReplyMessage}
                  isInternal={isInternal}
                  onIsInternalChange={setIsInternal}
                  senderName={senderName || defaultSenderName}
                  onSenderNameChange={setSenderName}
                  defaultSenderName={defaultSenderName}
                  sending={sending}
                  onSend={sendReply}
                  aiContext={`Replying to a consultation request about ${
                    Array.isArray(consultation.concerns) &&
                    consultation.concerns.length
                      ? consultation.concerns.join(', ')
                      : 'a skin concern'
                  }.`}
                />
              </section>
            </CardContent>
          </Card>
        </div>

        {/* ──────────────────────────── Right rail ─────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Current status — large pill so it's the first thing the
              admin sees when scanning the rail. */}
          <Card className="border-gray-200/80">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Current status
                </p>
                <div className="mt-2 flex items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold capitalize ring-1 ${tone.ring} ${tone.bg} ${tone.text}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}
                      aria-hidden="true"
                    />
                    {STATUS_META[currentStatus].label}
                  </span>
                  {updating && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {STATUS_META[currentStatus].description}
                </p>
              </div>

              <div className="h-px bg-gray-100" />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-2">
                  Move to
                </p>
                <div className="space-y-1.5">
                  {STATUSES.map((s) => {
                    const meta = STATUS_META[s]
                    const Icon = meta.icon
                    const active = consultation.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => changeStatus(s)}
                        disabled={updating || active}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-colors disabled:cursor-not-allowed ${
                          active
                            ? 'bg-[#7B2D8E] text-white shadow-sm'
                            : 'border border-gray-200 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/[0.03] text-gray-700'
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            active ? 'text-white' : 'text-gray-400'
                          }`}
                        />
                        <span className="font-medium capitalize flex-1">
                          {meta.label}
                        </span>
                        {active && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white/90" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule — only renders when a slot is set. The brand
              purple background makes this the second focal point of
              the rail. */}
          {scheduled && (
            <Card className="border-[#7B2D8E]/20 bg-[#7B2D8E]/[0.03]">
              <CardContent className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7B2D8E]">
                  Scheduled for
                </p>
                <div className="mt-2 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E] text-white flex items-center justify-center flex-shrink-0">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {scheduledDate}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {scheduledTime}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta — submitted timestamp, raw id, and (when present)
              the assigned staff member. Density-matched to the status
              card so the rail reads as one coherent column. */}
          <Card className="border-gray-200/80">
            <CardContent className="p-5 space-y-3 text-sm">
              <MetaRow
                label="Submitted"
                value={`${submittedDate} · ${submittedTime}`}
              />
              {consultation.assigned_first_name && (
                <MetaRow
                  label="Assigned to"
                  value={`${consultation.assigned_first_name} ${consultation.assigned_last_name || ''}`.trim()}
                />
              )}
              <MetaRow
                label="Reference"
                value={
                  <span className="font-mono text-xs text-gray-700">
                    {String(consultation.id).slice(0, 8)}
                  </span>
                }
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

// ───────────────────────────── Subcomponents ──────────────────────────────

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center">
        {icon}
      </span>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-600">
        {label}
      </h2>
      {typeof count === 'number' && (
        <span className="text-[11px] font-medium text-gray-400">{count}</span>
      )}
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
  href,
  onCopy,
  copied,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
  onCopy?: () => void
  copied?: boolean
}) {
  const content = (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-[#7B2D8E]/20 hover:bg-[#7B2D8E]/[0.03] transition-colors">
      <span className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
          {label}
        </p>
        <p
          className="text-sm font-medium text-gray-900 truncate"
          title={value}
        >
          {value || '—'}
        </p>
      </div>
      {href && (
        <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      )}
      {onCopy && value && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onCopy()
          }}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="w-8 h-8 rounded-lg text-gray-400 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/8 flex items-center justify-center flex-shrink-0 transition-colors"
        >
          {copied ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  )
  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    )
  }
  return content
}

function MetaRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        {label}
      </span>
      <span className="text-sm text-gray-900 text-right truncate">
        {value || '—'}
      </span>
    </div>
  )
}

function ConversationBubble({ reply }: { reply: Reply }) {
  const realName =
    [reply.staff_first_name, reply.staff_last_name].filter(Boolean).join(' ') ||
    'Staff'
  const displayed =
    !reply.is_internal && reply.sender_display_name
      ? reply.sender_display_name
      : null
  const aliased =
    !!displayed && displayed.toLowerCase() !== realName.toLowerCase()
  const time = new Date(reply.created_at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  // Internal notes float left in amber; outgoing customer replies sit
  // on the right in brand purple. The contrast makes the conversation
  // skim-able even at speed.
  if (reply.is_internal) {
    return (
      <li className={`max-w-[88%] ${reply._pending ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-gray-500">
          <Lock className="w-3 h-3 text-amber-600" />
          <span className="font-medium text-gray-700">{realName}</span>
          <span className="font-semibold uppercase tracking-wide text-[9px] text-amber-700 bg-amber-100 rounded-full px-1.5 py-0.5">
            Internal
          </span>
          <span className="ml-auto">
            {reply._pending ? 'Sending…' : time}
          </span>
        </div>
        <div className="rounded-2xl rounded-tl-md bg-amber-50 border border-amber-200/80 px-4 py-3">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {reply.message}
          </p>
        </div>
      </li>
    )
  }

  return (
    <li className={`ml-auto max-w-[88%] ${reply._pending ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-end gap-1.5 mb-1 text-[11px] text-gray-500">
        <span className="font-medium text-gray-700">{realName}</span>
        {aliased && (
          <span className="text-[#7B2D8E] font-medium">
            · sent as {displayed}
          </span>
        )}
        <span className="text-gray-300">·</span>
        <span>{reply._pending ? 'Sending…' : time}</span>
      </div>
      <div className="rounded-2xl rounded-tr-md bg-[#7B2D8E] text-white px-4 py-3 shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {reply.message}
        </p>
      </div>
    </li>
  )
}
