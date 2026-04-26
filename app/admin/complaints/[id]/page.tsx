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
  Ticket, Loader2, AlertCircle,
} from 'lucide-react'
import ReplyComposer from '@/components/admin/reply-composer'
import { useAuth } from '@/hooks/use-auth'

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

const statusOptions = ['open', 'in_progress', 'resolved', 'closed'] as const
const priorityOptions = ['low', 'normal', 'high', 'urgent'] as const

export default function ComplaintDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params.id as string
  const source = (searchParams.get('source') || 'complaint') as 'ticket' | 'complaint'

  const { user: currentUser } = useAuth()
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
      const res = await fetch(`/api/admin/complaints/${id}?source=${source}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to load')
      }
      const body = await res.json()
      setComplaint(body.complaint)

      const repliesRes = await fetch(
        `/api/admin/reply?requestType=${source}&requestId=${id}`,
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
    setUpdating(true)
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
      if (res.ok) {
        setComplaint({
          ...complaint,
          [action === 'update_status' ? 'status' : 'priority']: value,
        })
      }
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
      // Show the chosen display name on the optimistic row so the
      // admin sees exactly what the customer is going to see.
      staff_first_name: wasInternal ? 'You' : sender,
      staff_last_name: '',
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

      // Refetch the authoritative list so the optimistic row is replaced
      // with the real server row (correct id, staff name, exact timestamp).
      const repliesRes = await fetch(
        `/api/admin/reply?requestType=${complaint.source}&requestId=${complaint.id}`,
      )
      if (repliesRes.ok) {
        const body = await repliesRes.json()
        setReplies(body.replies || [])
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

        {/* Status / Priority controls */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <ControlGroup
            label="Status"
            value={complaint.status}
            options={statusOptions}
            disabled={updating}
            onChange={(v) => handleUpdate('update_status', v)}
          />
          <ControlGroup
            label="Priority"
            value={complaint.priority}
            options={priorityOptions}
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
                    {/* Surface the customer-facing display name if the
                        admin set one — otherwise fall back to the real
                        staff name so internal notes still attribute
                        correctly. */}
                    {(!reply.is_internal && reply.sender_display_name) ||
                      `${reply.staff_first_name} ${reply.staff_last_name}`.trim() ||
                      'Support'}
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

function ControlGroup({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              disabled={disabled || active}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                active
                  ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                  : 'border-gray-200 text-gray-700 hover:border-[#7B2D8E]/40 hover:bg-[#7B2D8E]/5'
              } disabled:opacity-70`}
            >
              {opt.replace(/_/g, ' ')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
