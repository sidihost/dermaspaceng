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
  ArrowLeft, Mail, MailOpen, Send, Phone, Clock, AlertTriangle,
  Ticket, Loader2, AlertCircle, Check,
  CircleDot, CircleDashed, CheckCircle2, XCircle,
  Flag, Flame, Trash2, ExternalLink, Copy,
} from 'lucide-react'
import ReplyComposer from '@/components/admin/reply-composer'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { AttachmentList } from '@/components/shared/attachment-list'
import type { ReplyAttachment } from '@/lib/attachments'
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
  /**
   * TRUE for replies authored by an admin / staff member, FALSE for
   * the customer's own messages on a ticket. The conversation
   * timeline keys off this so customer replies render as customer
   * bubbles and don't get mistakenly attributed to "Support".
   */
  is_staff?: boolean
  created_at: string
  staff_first_name: string | null
  staff_last_name: string | null
  /** Customer's name for replies the customer authored. NULL on staff replies. */
  customer_first_name?: string | null
  customer_last_name?: string | null
  // When set, the customer-facing display name used on the email and
  // in the in-app conversation (e.g. "Franca", "Itunu"). Falls back
  // to the staff member's real name when null.
  sender_display_name?: string | null
  /** File attachments uploaded with the reply (images / PDFs). */
  attachments?: ReplyAttachment[] | null
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
  const [replyAttachments, setReplyAttachments] = useState<ReplyAttachment[]>([])
  const [isInternal, setIsInternal] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [sending, setSending] = useState(false)
  // Destructive delete — gated behind the shared ConfirmDialog action
  // card instead of a raw window.confirm().
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Tap-to-copy affordance on the contact rows (email / phone).
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null)

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

  const handleDelete = async () => {
    if (!complaint || deleting) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/admin/complaints/${complaint.id}?source=${complaint.source}`,
        { method: 'DELETE' },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        notify.error('Could not delete', body.error || 'Try again.')
        return
      }
      notify.success('Deleted', 'The record has been removed.')
      router.push('/admin/complaints')
    } catch {
      notify.error('Network error', 'Please try again.')
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

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
    if (!complaint || (!replyMessage.trim() && replyAttachments.length === 0)) return

    // Optimistic insertion so the reply lands in the conversation the
    // instant the admin hits Send — no staring at an empty textarea
    // waiting for the POST round-trip + refetch. We assign a temporary
    // string id, drop the row into `replies`, then reconcile against the
    // server once the POST returns. On failure we roll the row back and
    // restore the draft text and internal-note toggle.
    const draft = replyMessage.trim()
    const wasInternal = isInternal
    const sender = senderName.trim() || defaultSenderName
    const draftAttachments = replyAttachments
    const tempId = `temp-${Date.now()}`
    const optimistic: Reply = {
      id: tempId,
      message: draft,
      is_internal: wasInternal,
      is_staff: true,
      created_at: new Date().toISOString(),
      // Seed the optimistic row with the admin's real name so the
      // admin-side conversation shows who actually replied. The alias
      // is stored separately so the "sent as ..." tag renders.
      staff_first_name: currentUser?.firstName || 'You',
      staff_last_name: currentUser?.lastName || '',
      customer_first_name: null,
      customer_last_name: null,
      sender_display_name: wasInternal ? null : sender,
      attachments: draftAttachments,
    }

    setSending(true)
    setReplyMessage('')
    setReplyAttachments([])
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
          attachments: draftAttachments,
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
      setReplyAttachments(draftAttachments)
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

  // Pretty-print the submitted timestamp once.
  const submitted = new Date(complaint.created_at)
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
  const headerInitials =
    (complaint.name.match(/\b\w/g) || []).join('').slice(0, 2).toUpperCase() ||
    'U'
  const isTicket = complaint.source === 'ticket'
  const reference = isTicket
    ? complaint.ticket_id || `Ticket #${complaint.id}`
    : `Complaint #${complaint.id}`

  return (
    <div className="space-y-4 pb-12">
      {/* Back link + admin-only destructive action, matched to the
          consultation detail page so the two surfaces read as one
          product. */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/complaints"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to support
        </Link>
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ─────────────────────────── Main column ─────────────────────────── */}
        <div className="space-y-4 min-w-0">
          {/* Hero — thin brand-purple band with identity + reference,
              mirroring the consultation detail hero. */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="relative bg-[#7B2D8E] px-5 sm:px-7 py-5 text-white">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/12 ring-1 ring-white/25 flex items-center justify-center text-lg font-semibold flex-shrink-0">
                  {headerInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                    <Ticket className="w-3 h-3" />
                    {isTicket ? 'Support ticket' : 'Complaint'}
                    <span className="text-white/40">·</span>
                    <span className="font-mono text-white/80 normal-case tracking-normal">
                      {complaint.ticket_id || `#${complaint.id}`}
                    </span>
                  </div>
                  <h1 className="mt-1 text-xl sm:text-2xl font-semibold text-white text-balance leading-tight">
                    {complaint.name}
                  </h1>
                  <p className="mt-1.5 text-xs text-white/75 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Received {submittedDate} at {submittedTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact strip — tappable rows for email + phone. */}
            <div className="p-5 sm:p-6 space-y-1.5">
              <ContactRow
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={complaint.email}
                href={`mailto:${complaint.email}`}
                onCopy={() => copyToClipboard('email', complaint.email)}
                copied={copied === 'email'}
              />
              {complaint.phone && (
                <ContactRow
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={complaint.phone}
                  href={`tel:${complaint.phone}`}
                  onCopy={() => copyToClipboard('phone', complaint.phone || '')}
                  copied={copied === 'phone'}
                />
              )}
            </div>
          </section>

          {/* Original message */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <SectionHeader
              icon={<Mail className="w-3.5 h-3.5" />}
              label={complaint.subject || 'Message'}
            />
            <blockquote className="relative pl-4 border-l-2 border-[#7B2D8E]/40">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {complaint.message}
              </p>
            </blockquote>
          </section>

          {/* Conversation — two-sided thread. Staff replies sit on the
              right in brand purple, customer replies on the left in
              neutral gray, internal notes in amber. The composer lives
              in the same card so the admin's reply lands in the stream
              they were just reading. */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <SectionHeader
              icon={<MailOpen className="w-3.5 h-3.5" />}
              label="Conversation"
              count={replies.length}
            />
            {replies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-8 text-center">
                <div className="w-11 h-11 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center mx-auto mb-2.5">
                  <Send className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  No replies yet
                </p>
                <p className="mt-1 text-xs text-gray-500 max-w-xs mx-auto">
                  Send the first reply below — the customer will get an email
                  and an in-app notification.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {replies.map((reply) => {
              // Use the explicit `is_staff` flag from the API; fall
              // back to the legacy heuristic for old rows that
              // pre-date the flag.
              const isStaffReply =
                reply.is_staff !== false &&
                (reply.is_staff === true ||
                  !!(reply.staff_first_name || reply.staff_last_name))
              const realName =
                `${reply.staff_first_name || ''} ${reply.staff_last_name || ''}`.trim() ||
                'Support'
              const customerName =
                `${reply.customer_first_name || ''} ${reply.customer_last_name || ''}`.trim() ||
                complaint.name ||
                'Customer'
              const displayed =
                isStaffReply && !reply.is_internal && reply.sender_display_name
                  ? reply.sender_display_name
                  : null
              const aliased =
                displayed && displayed.toLowerCase() !== realName.toLowerCase()
              const name = isStaffReply ? realName : customerName
              const initials = (name.match(/\b\w/g) || []).join('').slice(0, 2).toUpperCase() || '?'

              return (
                <div
                  key={reply.id}
                  className={`flex gap-3 ${isStaffReply ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    aria-hidden="true"
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold ${
                      reply.is_internal
                        ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                        : isStaffReply
                          ? 'bg-[#7B2D8E] text-white'
                          : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
                    }`}
                  >
                    {initials}
                  </div>
                  <div
                    className={`max-w-[80%] min-w-0 flex flex-col ${
                      isStaffReply ? 'items-end text-right' : 'items-start'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 text-[11px] text-gray-500 mb-1 ${
                        isStaffReply ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <span className="font-semibold text-gray-700 truncate max-w-[180px]">
                        {name}
                      </span>
                      {aliased && (
                        <span className="text-[10px] font-medium text-[#7B2D8E]">
                          sent as {displayed}
                        </span>
                      )}
                      {reply.is_internal && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-200 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Internal
                        </span>
                      )}
                      <time dateTime={reply.created_at}>
                        {new Date(reply.created_at).toLocaleString()}
                      </time>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        reply.is_internal
                          ? 'bg-amber-50 text-amber-950 ring-1 ring-amber-200 rounded-tl-sm'
                          : isStaffReply
                            ? 'bg-[#7B2D8E] text-white rounded-tr-sm'
                            : 'bg-gray-50 text-gray-900 ring-1 ring-gray-200 rounded-tl-sm'
                      }`}
                    >
                      {reply.message}
                      <AttachmentList
                        attachments={reply.attachments}
                        tone={isStaffReply && !reply.is_internal ? 'dark' : 'light'}
                      />
                    </div>
                  </div>
                </div>
                  )
                })}
              </div>
            )}

            {/* Composer — shared component with the AI improve toolbar
                and a "send as" sender picker. Inline with the thread so
                replies land in the same visual stream. */}
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
                onSend={handleSendReply}
                aiContext={`Replying to ${complaint.subject || 'a customer enquiry'}.`}
                attachments={replyAttachments}
                onAttachmentsChange={setReplyAttachments}
                attachmentFolder="support"
              />
            </section>
          </section>
        </div>

        {/* ──────────────────────────── Right rail ─────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Status workflow */}
          <SegmentedPicker
            label="Status"
            value={complaint.status}
            disabled={updating}
            onChange={(v) => handleUpdate('update_status', v)}
            options={STATUS_TILES}
          />

          {/* Priority workflow */}
          <SegmentedPicker
            label="Priority"
            value={complaint.priority}
            disabled={updating}
            onChange={(v) => handleUpdate('update_priority', v)}
            options={PRIORITY_TILES}
          />

          {/* Meta — submitted, reference, category, assignee, resolved. */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3 text-sm">
            <MetaRow
              label="Received"
              value={`${submittedDate} · ${submittedTime}`}
            />
            <MetaRow
              label="Reference"
              value={
                <span className="font-mono text-xs text-gray-700">
                  {reference}
                </span>
              }
            />
            {complaint.category && (
              <MetaRow label="Category" value={complaint.category} />
            )}
            {complaint.assigned_first_name && (
              <MetaRow
                label="Assigned to"
                value={`${complaint.assigned_first_name} ${complaint.assigned_last_name || ''}`.trim()}
              />
            )}
            {complaint.resolved_at && (
              <MetaRow
                label="Resolved"
                value={new Date(complaint.resolved_at).toLocaleDateString(
                  undefined,
                  { month: 'short', day: 'numeric', year: 'numeric' },
                )}
              />
            )}
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={showDelete}
        variant="danger"
        title={
          complaint.source === 'ticket'
            ? 'Delete this support ticket?'
            : 'Delete this complaint?'
        }
        description={
          <>
            This permanently removes{' '}
            <span className="font-medium text-gray-700">
              {complaint.ticket_id || `#${complaint.id}`}
            </span>{' '}
            and the full conversation with{' '}
            <span className="font-medium text-gray-700">{complaint.name}</span>.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete record"
        cancelLabel="Keep it"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
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
      <span className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-600 truncate">
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
            <CheckCircle2 className="w-3.5 h-3.5 text-[#7B2D8E]" />
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

/* ──────────────────────────────────────────────────────────────
   Status & Priority pickers — clean segmented list
   ──────────────────────────────────────────────────────────────
   Re-implemented as a quiet vertical list of options. The previous
   2x2 grid leant on a heavy purple gradient + drop-shadow that
   read as garish next to the rest of the admin (which uses flat
   white cards with hairline borders and a single brand accent).
   The new design:
     - flat white card with a hairline border and a small uppercase label
     - one row per option: icon chip · label · radio dot
     - active row gets a subtle brand-tinted background, a brand-
       coloured icon chip, and a filled brand-purple radio dot
     - no gradients, no shadows, no extra colours
   Both Status and Priority share the same component (SegmentedPicker)
   so the two controls feel like a matched pair without the
   duplication that used to live here.
*/
type PickerOption = {
  value: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const STATUS_TILES: PickerOption[] = [
  { value: 'open',        label: 'Open',         Icon: CircleDashed },
  { value: 'in_progress', label: 'In progress',  Icon: CircleDot },
  { value: 'resolved',    label: 'Resolved',     Icon: CheckCircle2 },
  { value: 'closed',      label: 'Closed',       Icon: XCircle },
]

const PRIORITY_TILES: PickerOption[] = [
  { value: 'low',     label: 'Low',     Icon: Flag },
  { value: 'normal',  label: 'Normal',  Icon: Flag },
  { value: 'high',    label: 'High',    Icon: AlertTriangle },
  { value: 'urgent',  label: 'Urgent',  Icon: Flame },
]

function SegmentedPicker({
  label,
  value,
  disabled,
  onChange,
  options,
}: {
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
  options: PickerOption[]
}) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-white p-1.5">
      <legend className="px-2 pt-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </legend>
      <ul className="mt-1 flex flex-col">
        {options.map(({ value: v, label: optionLabel, Icon }) => {
          const active = value === v
          return (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(v)}
                disabled={disabled || active}
                aria-pressed={active}
                className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors
                  ${
                    active
                      ? 'bg-[#7B2D8E]/[0.06] text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50 disabled:hover:bg-transparent'
                  }
                  disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/30`}
              >
                {/* Icon chip — filled brand-tint when active so the
                    eye lands on the selected row immediately, plain
                    gray for inactive rows. */}
                <span
                  aria-hidden="true"
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                    ${active ? 'bg-[#7B2D8E]/15 text-[#7B2D8E]' : 'bg-gray-100 text-gray-500'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span
                  className={`flex-1 text-sm leading-tight ${
                    active ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {optionLabel}
                </span>
                {/* Radio dot — solid brand purple when active, hollow
                    gray when not. Single, small, very calm. */}
                <span
                  aria-hidden="true"
                  className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors
                    ${
                      active
                        ? 'bg-[#7B2D8E] text-white'
                        : 'border border-gray-300 bg-white'
                    }`}
                >
                  {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
