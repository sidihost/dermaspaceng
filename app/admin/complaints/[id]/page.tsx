'use client'

/**
 * Admin complaint / ticket detail
 *
 * Replaces the previous centered modal. Admins now land on a full page
 * when they tap a row in the inbox, which makes every interaction
 * (status, priority, internal notes, replies) feel like a normal page
 * action — no overlay, no z-index games, deep-linkable, and the
 * browser back button behaves the way you'd expect.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, Clock, AlertTriangle,
  Ticket, Loader2, AlertCircle, Check,
  CircleDot, CircleDashed, CheckCircle2, XCircle,
  Flag, Flame,
} from 'lucide-react'
import ReplyComposer from '@/components/admin/reply-composer'
import { useAuth } from '@/hooks/use-auth'
import { useNotify } from '@/components/shared/notify'

interface Complaint {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  status: string
  priority: string
  category: string | null
  assigned_to: string | null
  assigned_first_name: string | null
  assigned_last_name: string | null
  created_at: string
  resolved_at: string | null
  source: 'complaint' | 'ticket'
  ticket_id: string | null
}

interface Reply {
  id: string
  message: string
  is_internal: boolean
  created_at: string
  staff_first_name: string
  staff_last_name: string
  // When set, the customer-facing display name used on the email and
  // in the in-app conversation (e.g. "Franca", "Itunu"). Falls back
  // to the staff member's real name when null.
  sender_display_name?: string | null
}

export default function ComplaintDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params.id as string
  const source = (searchParams.get('source') || 'complaint') as 'ticket' | 'complaint'

  const { user: currentUser } = useAuth()
  const notify = useNotify()
  const defaultSenderName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Admin'
    : 'Admin'

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [sending, setSending] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // cache: 'no-store' is critical here — otherwise the browser /
      // Next data cache can serve a stale snapshot from before the
      // admin's last reply, making the conversation appear empty
      // after a hard refresh. The admin reported "I send a reply, it
      // shows, but after I refresh it's gone" — that's a stale GET.
      const res = await fetch(`/api/admin/complaints/${id}?source=${source}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to load')
      }
      const body = await res.json()
      setComplaint(body.complaint)

      const repliesRes = await fetch(
        `/api/admin/reply?requestType=${source}&requestId=${id}`,
        { cache: 'no-store' },
      )
      if (repliesRes.ok) {
        const repliesBody = await repliesRes.json()
        setReplies(repliesBody.replies || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id, source])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleUpdate = async (action: 'update_status' | 'update_priority', value: string) => {
    if (!complaint) return
    // Field name shared between optimistic update + toast text.
    const field = action === 'update_status' ? 'status' : 'priority'
    // Snapshot the previous value so we can roll back on failure
    // without re-fetching the whole record.
    const previous = complaint[field]
    setUpdating(true)
    // Optimistic update — pop the new pill state immediately so the
    // admin sees the click register without a round-trip flash.
    setComplaint({ ...complaint, [field]: value })
    try {
      const res = await fetch('/api/admin/complaints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: complaint.id,
          action,
          value,
          source: complaint.source,
        }),
      })
      if (!res.ok) {
        throw new Error('failed')
      }
      // Friendly confirmation banner so the operator gets a clear
      // "yes that worked" cue. Status changes in particular are
      // high-stakes (they drive auto-emails to the customer when the
      // status hits resolved/closed) and the previous UX gave no
      // feedback at all — admins were tapping the pill repeatedly to
      // make sure it had registered.
      const human = value.replace(/_/g, ' ')
      if (field === 'status') {
        notify.success(
          `Status set to ${human}`,
          value === 'resolved' || value === 'closed'
            ? 'The customer will be notified by email.'
            : 'The ticket has been updated.',
        )
      } else {
        notify.success(`Priority set to ${human}`, 'Saved.')
      }
    } catch {
      // Roll back the optimistic change and surface the failure.
      setComplaint({ ...complaint, [field]: previous })
      notify.error(
        `Could not update ${field}`,
        'Please try again in a moment.',
      )
    } finally {
      setUpdating(false)
    }
  }

  const handleSendReply = async () => {
    if (!complaint || !replyMessage.trim()) return

    // Optimistic insertion so the reply lands in the conversation the
    // instant the admin hits Send — no staring at an empty textarea
    // waiting for the POST round-trip + refetch. We assign a temporary
    // string id, drop the row into `replies`, then reconcile against the
    // server once the POST returns. On failure we roll the row back and
    // restore the draft text and internal-note toggle.
    const draft = replyMessage.trim()
    const wasInternal = isInternal
    const sender = senderName.trim() || defaultSenderName
    const tempId = `temp-${Date.now()}`
    const optimistic: Reply = {
      id: tempId,
      message: draft,
      is_internal: wasInternal,
      created_at: new Date().toISOString(),
      // Seed the optimistic row with the admin's real name so the
      // admin-side conversation shows who actually replied. The alias
      // is stored separately so the "sent as ..." tag renders.
      staff_first_name: currentUser?.firstName || 'You',
      staff_last_name: currentUser?.lastName || '',
      sender_display_name: wasInternal ? null : sender,
    }

    setSending(true)
    setReplyMessage('')
    setReplies((prev) => [...prev, optimistic])

    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: complaint.source,
          requestId: complaint.id,
          ticketCode: complaint.ticket_id || undefined,
          userEmail: complaint.email,
          message: draft,
          isInternal: wasInternal,
          senderDisplayName: wasInternal ? undefined : sender,
        }),
      })
      if (!res.ok) throw new Error('Failed to send reply')

      // Refetch the authoritative list. Previously we did
      // `setReplies(body.replies || [])` which blew away the
      // optimistic row whenever the server hadn't yet caught up
      // (replication lag, wrong source param, ticket vs complaint
      // table mismatch on misnavigated URLs) — that's exactly the
      // "I sent a reply and it disappears from my chat" bug the
      // user reported. We now MERGE: keep the optimistic row in
      // state until a server row with the same content (within the
      // last 5 minutes) shows up, then drop it. This means the
      // admin's reply never visually vanishes after Send, even on a
      // stale read.
      const repliesRes = await fetch(
        `/api/admin/reply?requestType=${complaint.source}&requestId=${complaint.id}`,
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
            Math.abs(new Date(r.created_at).getTime() - optimisticAt) < 5 * 60_000,
        )
        if (matched) {
          setReplies(serverReplies)
        } else {
          // Server hasn't returned the new row yet — keep the
          // optimistic row visible and append any other server
          // rows we don't already have.
          setReplies((prev) => {
            const tempRow = prev.find((r) => r.id === tempId) ?? optimistic
            const serverIds = new Set(serverReplies.map((r) => String(r.id)))
            const merged = [
              ...serverReplies,
              // Only re-append the optimistic row if no server row matches.
              ...(serverIds.has(tempId) ? [] : [tempRow]),
            ]
            return merged.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            )
          })
        }
      }
    } catch {
      // Roll back the optimistic row and give the admin their draft back.
      setReplies((prev) => prev.filter((r) => r.id !== tempId))
      setReplyMessage(draft)
      setIsInternal(wasInternal)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 text-[#7B2D8E] animate-spin" />
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Unable to load</h2>
        <p className="text-sm text-gray-500 mb-4">{error || 'Unknown error'}</p>
        <button
          onClick={() => router.push('/admin/complaints')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inbox
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/complaints"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Support inbox
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate">
          {complaint.source === 'ticket'
            ? complaint.ticket_id || `Ticket #${complaint.id}`
            : `Complaint #${complaint.id}`}
        </span>
      </div>

      {/* Header card */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-semibold text-[#7B2D8E]">
              {complaint.name.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {complaint.name}
              </h1>
              {complaint.source === 'ticket' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7B2D8E]">
                  <Ticket className="w-3 h-3" />
                  {complaint.ticket_id || 'Ticket'}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {complaint.email}
              </span>
              {complaint.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {complaint.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(complaint.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Status / Priority controls
            ----------------------------
            Re-themed to a richer Apple-style segmented control with
            an icon + hue per state, so admins get a strong visual
            cue about what the ticket is currently set to. The active
            tile gets the brand purple gradient and a subtle inset
            shadow; inactive tiles stay neutral with a hover hint. */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <StatusControl
            label="Status"
            value={complaint.status}
            disabled={updating}
            onChange={(v) => handleUpdate('update_status', v)}
          />
          <PriorityControl
            label="Priority"
            value={complaint.priority}
            disabled={updating}
            onChange={(v) => handleUpdate('update_priority', v)}
          />
        </div>
      </section>

      {/* Original message */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900">
          {complaint.subject || 'Message'}
        </h2>
        <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {complaint.message}
        </p>
      </section>

      {/* Conversation */}
      {replies.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Conversation</h2>
          <div className="space-y-3">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className={`rounded-xl border px-4 py-3 ${
                  reply.is_internal
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-[#7B2D8E]/5 border-[#7B2D8E]/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {/* In the admin view we always lead with the real
                        staff member's name so admins can audit who
                        replied. When the admin signed the reply with
                        a customer-facing display name (e.g. "Franca")
                        we tag that as "sent as Franca" alongside the
                        real name. The customer-facing activity feed
                        shows only the display name. */}
                    {(() => {
                      const realName =
                        `${reply.staff_first_name || ''} ${reply.staff_last_name || ''}`.trim() ||
                        'Support'
                      const displayed =
                        !reply.is_internal && reply.sender_display_name
                          ? reply.sender_display_name
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
                    {reply.is_internal && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <AlertTriangle className="w-3 h-3" />
                        Internal
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">
                    {new Date(reply.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reply composer — shared component used across complaints,
          consultations, and tickets. Adds the AI improve toolbar and
          a "send as" sender picker so admins can sign as Admin,
          Franca, Itunu or a custom name. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <ReplyComposer
          value={replyMessage}
          onChange={setReplyMessage}
          isInternal={isInternal}
          onIsInternalChange={setIsInternal}
          senderName={senderName || defaultSenderName}
          onSenderNameChange={setSenderName}
          defaultSenderName={defaultSenderName}
          sending={sending}
          onSend={handleSendReply}
          aiContext={`Replying to ${complaint.subject || 'a customer enquiry'}.`}
        />
      </section>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Status & Priority pickers — richer card-based design
   ──────────────────────────────────────────────────────────────
   Replaces the old flat pill row with a 2x2 grid of tappable
   tiles. Each option carries its own icon and short caption so
   the operator can scan the available states at a glance. The
   currently-set option gets the brand purple gradient + a check
   mark badge in the top-right corner; everything else stays
   neutral with a hover tint. Both controls share the same shape
   (label header → grid → tiles) so they feel like a matched
   pair when sitting side by side.
*/
const STATUS_TILES: Array<{
  value: 'open' | 'in_progress' | 'resolved' | 'closed'
  label: string
  caption: string
  Icon: React.ComponentType<{ className?: string }>
}> = [
  { value: 'open',        label: 'Open',         caption: 'Awaiting first reply',  Icon: CircleDashed },
  { value: 'in_progress', label: 'In progress',  caption: 'Working on it',         Icon: CircleDot },
  { value: 'resolved',    label: 'Resolved',     caption: 'Customer notified',     Icon: CheckCircle2 },
  { value: 'closed',      label: 'Closed',       caption: 'No further action',     Icon: XCircle },
]

function StatusControl({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
      <legend className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {STATUS_TILES.map(({ value: v, label: tileLabel, caption, Icon }) => {
          const active = value === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              disabled={disabled || active}
              aria-pressed={active}
              className={`group relative text-left rounded-xl border px-3 py-3 transition-all
                ${
                  active
                    ? 'border-transparent bg-gradient-to-br from-[#9A4DAF] to-[#5A1D6A] text-white shadow-[0_4px_12px_-4px_rgba(123,45,142,0.45)]'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5'
                } disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30`}
            >
              {/* Selected badge — small check chip in the corner so
                  operators can spot the active state even when the
                  page is busy with motion. */}
              {active && (
                <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
              <Icon
                className={`w-4 h-4 mb-1.5 ${
                  active ? 'text-white' : 'text-[#7B2D8E]'
                }`}
              />
              <p className="text-sm font-semibold leading-tight">{tileLabel}</p>
              <p
                className={`text-[11px] leading-snug mt-0.5 ${
                  active ? 'text-white/85' : 'text-gray-500'
                }`}
              >
                {caption}
              </p>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const PRIORITY_TILES: Array<{
  value: 'low' | 'normal' | 'high' | 'urgent'
  label: string
  caption: string
  Icon: React.ComponentType<{ className?: string }>
}> = [
  { value: 'low',     label: 'Low',     caption: 'When you can', Icon: Flag },
  { value: 'normal',  label: 'Normal',  caption: 'Standard SLA', Icon: Flag },
  { value: 'high',    label: 'High',    caption: 'Today',        Icon: AlertTriangle },
  { value: 'urgent',  label: 'Urgent',  caption: 'Drop everything', Icon: Flame },
]

function PriorityControl({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
      <legend className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {PRIORITY_TILES.map(({ value: v, label: tileLabel, caption, Icon }) => {
          const active = value === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              disabled={disabled || active}
              aria-pressed={active}
              className={`group relative text-left rounded-xl border px-3 py-3 transition-all
                ${
                  active
                    ? 'border-transparent bg-gradient-to-br from-[#9A4DAF] to-[#5A1D6A] text-white shadow-[0_4px_12px_-4px_rgba(123,45,142,0.45)]'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5'
                } disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30`}
            >
              {active && (
                <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
              <Icon
                className={`w-4 h-4 mb-1.5 ${
                  active ? 'text-white' : 'text-[#7B2D8E]'
                }`}
              />
              <p className="text-sm font-semibold leading-tight">{tileLabel}</p>
              <p
                className={`text-[11px] leading-snug mt-0.5 ${
                  active ? 'text-white/85' : 'text-gray-500'
                }`}
              >
                {caption}
              </p>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
