'use client'

/**
 * Admin consultation detail page.
 *
 * Full page replacing the old centered modal. Supports status
 * changes (via PUT /api/admin/consultations) and staff replies
 * (via /api/admin/reply) inline, the same as the complaints page.
 *
 * Notes:
 *   • `consultation.id` is a UUID string (VARCHAR(36) in full-migration.sql),
 *     NOT an integer. Passing parseInt(uuid) → NaN was silently breaking
 *     reply-list fetches until scripts/030 widened admin_replies.request_id
 *     to TEXT and the reply GET started comparing as a string.
 *   • The composer mirrors the customer ticket page layout: full-width
 *     textarea on top, helper text + send button underneath. The previous
 *     2-row-textarea-next-to-button design was painful on mobile.
 *   • Sent replies are optimistically inserted into the thread so the
 *     admin sees their message immediately without waiting on refetch.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Loader2, AlertCircle, User, Mail, Phone, MapPin,
  Clock, MessageSquare, CalendarClock, ClipboardList, Stethoscope,
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
  // The customer-facing display name set on the reply (Admin / Franca
  // / Itunu / custom). Optional — falls back to the real staff name.
  sender_display_name?: string | null
  // marked true for optimistic rows so we can dim them while the POST is in flight
  _pending?: boolean
}

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

export default function ConsultationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user: currentUser } = useAuth()
  const defaultSenderName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Admin'
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
        const res = await fetch(`/api/admin/consultations/${id}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        if (!cancelled) {
          setConsultation(data.consultation)
          await loadReplies(String(data.consultation.id))
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, loadReplies])

  const changeStatus = async (status: string) => {
    if (!consultation) return
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: consultation.id, action: 'update_status', value: status }),
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

    // Optimistic insert — the admin sees their reply immediately instead
    // of staring at an empty input wondering if anything happened.
    // We seed the optimistic row with the admin's real name (so the
    // admin-side conversation always shows who actually replied) and
    // attach the alias as `sender_display_name` so the "sent as ..."
    // tag also lights up immediately.
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
        // Roll back the optimistic row and restore the draft so the admin
        // doesn't silently lose their message.
        setReplies((prev) => prev.filter((r) => r.id !== tempId))
        setReplyMessage(message)
      } else {
        // Refetch the authoritative thread, but merge it with the
        // optimistic row instead of overwriting state outright. If the
        // server hasn't returned the new row yet (replication lag), we
        // keep the optimistic row visible so the admin's just-sent
        // reply doesn't visually vanish from the conversation.
        try {
          const repliesRes = await fetch(
            `/api/admin/reply?requestType=consultation&requestId=${encodeURIComponent(String(consultation.id))}`,
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
              // Server is stale — keep the optimistic row visible
              // alongside the server's current view of the thread.
              setReplies((prev) => {
                const tempRow =
                  prev.find((r) => r.id === tempId) ?? { ...optimistic, _pending: false }
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
          // Network blip on the refetch — leave the optimistic row.
        }
      }
    } catch {
      setReplies((prev) => prev.filter((r) => r.id !== tempId))
      setReplyMessage(message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !consultation) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Unable to load consultation</h2>
            <p className="text-sm text-gray-500 mt-1">{error || 'Not found'}</p>
          </div>
          <Link
            href="/admin/consultations"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to consultations
          </Link>
        </CardContent>
      </Card>
    )
  }

  // Defensive name fallback. The detail API now composes `name` from
  // `first_name || ' ' || last_name`, but if a row legitimately lacks
  // both we still want the page to render instead of blowing up on
  // `name.split(' ')` (the crash that landed this page on the
  // "Something went sideways" error screen).
  const displayName = (consultation.name?.trim() || consultation.email || 'Consultation').toString()

  // Pretty-print the submitted timestamp once so the hero band can show
  // a friendly date + time without recomputing on every render.
  const submitted = new Date(consultation.created_at)
  const submittedDate = submitted.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
  const submittedTime = submitted.toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  })

  // Status colour token — tints the hero pill so a quick glance tells
  // the admin the consultation's state without reading the word.
  const statusTone: Record<string, { ring: string; text: string; bg: string; dot: string }> = {
    pending:   { ring: 'ring-amber-200',    text: 'text-amber-700',   bg: 'bg-amber-50',     dot: 'bg-amber-500'  },
    confirmed: { ring: 'ring-emerald-200',  text: 'text-emerald-700', bg: 'bg-emerald-50',   dot: 'bg-emerald-500'},
    completed: { ring: 'ring-[#7B2D8E]/20', text: 'text-[#7B2D8E]',   bg: 'bg-[#7B2D8E]/5',  dot: 'bg-[#7B2D8E]'  },
    cancelled: { ring: 'ring-gray-200',     text: 'text-gray-600',    bg: 'bg-gray-50',      dot: 'bg-gray-400'   },
  }
  const tone = statusTone[consultation.status] || statusTone.pending

  return (
    <div className="space-y-3 max-w-3xl">
      <Link
        href="/admin/consultations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to consultations
      </Link>

      {/* Hero band — brand-purple gradient with the customer's initials,
          name, and a status pill in the corner. Replaces the plain
          "#abcd1234 + Badge" header so the page opens with real
          context (who, when) instead of a hex string. Same density
          rhythm as the complaint detail page. */}
      <Card className="overflow-hidden border-[#7B2D8E]/15">
        <div className="bg-gradient-to-br from-[#7B2D8E] via-[#6B2278] to-[#5A1D6A] px-5 sm:px-6 py-5 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-base font-semibold flex-shrink-0">
              {displayName
                .split(' ')
                .map((p) => p.charAt(0))
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                <Stethoscope className="w-3 h-3" />
                Consultation · #{String(consultation.id).slice(0, 8)}
              </div>
              <h1 className="mt-1 text-lg sm:text-xl font-semibold text-white text-balance leading-tight">
                {displayName}
              </h1>
              <p className="mt-1 text-xs text-white/75">
                Requested {submittedDate} at {submittedTime}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ring-1 ${tone.ring} ${tone.bg} ${tone.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
              {consultation.status}
            </span>
          </div>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Contact + meta — a 2-column grid of tappable tiles. Each
              tile uses a brand-tinted icon chip so the eye groups
              label + value as one unit. Email + phone become real <a>
              links so the admin can call/mail in one tap. */}
          <div className="grid sm:grid-cols-2 gap-2.5">
            <DetailTile icon={<User className="w-4 h-4" />} label="Name" value={displayName} />
            <DetailTile icon={<Mail className="w-4 h-4" />} label="Email" value={consultation.email} href={`mailto:${consultation.email}`} />
            <DetailTile icon={<Phone className="w-4 h-4" />} label="Phone" value={consultation.phone} href={`tel:${consultation.phone}`} />
            <DetailTile icon={<MapPin className="w-4 h-4" />} label="Preferred clinic" value={consultation.location} />
            {consultation.scheduled_at && (
              <DetailTile
                icon={<CalendarClock className="w-4 h-4" />}
                label="Scheduled for"
                value={new Date(consultation.scheduled_at).toLocaleString()}
              />
            )}
            <DetailTile
              icon={<Clock className="w-4 h-4" />}
              label="Submitted"
              value={submitted.toLocaleString()}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={updating || consultation.status === s}
                  // Active pill matches the complaint detail rail —
                  // brand-gradient instead of flat brand fill, so the
                  // pill reads as a deliberate "selected" cue rather
                  // than the dull purple-grey it was reading as.
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize ${
                    consultation.status === s
                      ? 'border-transparent bg-gradient-to-br from-[#9A4DAF] to-[#5A1D6A] text-white shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E]'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {consultation.concerns && consultation.concerns.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ClipboardList className="w-3.5 h-3.5 text-[#7B2D8E]" />
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Concerns
                </h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {consultation.concerns.map((concern, i) => (
                  <Badge key={i} variant="outline" className="bg-[#7B2D8E]/8 text-[#7B2D8E] border-[#7B2D8E]/20 font-medium">
                    {concern}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {consultation.message && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#7B2D8E]" />
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Additional notes
                </h2>
              </div>
              <div className="relative pl-3 border-l-2 border-[#7B2D8E]/30">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {consultation.message}
                </p>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <MessageSquare className="w-3.5 h-3.5 text-[#7B2D8E]" />
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Conversation · {replies.length}
                </h2>
              </div>
              <div className="space-y-2.5">
                {replies.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-lg border transition-opacity ${
                      r.is_internal
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-[#7B2D8E]/5 border-[#7B2D8E]/20'
                    } ${r._pending ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {/* Admin-side: lead with the real staff name,
                            tag the alias if a customer-facing display
                            name was used. The user-facing activity feed
                            still shows only the alias. */}
                        {(() => {
                          const realName =
                            [r.staff_first_name, r.staff_last_name].filter(Boolean).join(' ') ||
                            'Staff'
                          const displayed =
                            !r.is_internal && r.sender_display_name
                              ? r.sender_display_name
                              : null
                          const aliased =
                            displayed && displayed.toLowerCase() !== realName.toLowerCase()
                          return (
                            <>
                              {realName}
                              {aliased && (
                                <span className="ml-2 text-[10px] font-medium text-[#7B2D8E]">
                                  sent as {displayed}
                                </span>
                              )}
                            </>
                          )
                        })()}
                        {r.is_internal && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Internal
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {r._pending ? 'Sending…' : new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply composer — shared component with AI improve toolbar
              and a sender display-name picker (Admin / Franca / Itunu /
              custom). Used on complaint, consultation, and ticket
              detail pages so customers see a consistent voice. */}
          <section className="pt-4 border-t border-gray-100">
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
                Array.isArray(consultation.concerns) && consultation.concerns.length
                  ? consultation.concerns.join(', ')
                  : 'a skin concern'
              }.`}
            />
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

// DetailTile — a single contact / meta cell in the 2-column grid at
// the top of the consultation card. The icon sits in a brand-tinted
// chip so the eye groups label + value as one unit; the value becomes
// a real <a> when `href` is provided so the admin can call / mail in
// one tap. The hover lift mirrors the tile pattern used on the
// complaint and ticket detail pages.
function DetailTile({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-start gap-2.5 p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-[#7B2D8E]/20 transition-colors h-full">
      <span className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate" title={value}>
          {value || '—'}
        </p>
      </div>
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
