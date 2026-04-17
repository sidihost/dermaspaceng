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
  ArrowLeft, Mail, Phone, Clock, Send, AlertTriangle,
  Ticket, Loader2, AlertCircle,
} from 'lucide-react'

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
}

const statusOptions = ['open', 'in_progress', 'resolved', 'closed'] as const
const priorityOptions = ['low', 'normal', 'high', 'urgent'] as const

export default function ComplaintDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params.id as string
  const source = (searchParams.get('source') || 'complaint') as 'ticket' | 'complaint'

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
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
    setSending(true)
    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: complaint.source,
          requestId: complaint.id,
          ticketCode: complaint.ticket_id || undefined,
          userEmail: complaint.email,
          message: replyMessage,
          isInternal,
        }),
      })
      if (res.ok) {
        setReplyMessage('')
        setIsInternal(false)
        const repliesRes = await fetch(
          `/api/admin/reply?requestType=${complaint.source}&requestId=${complaint.id}`,
        )
        if (repliesRes.ok) {
          const body = await repliesRes.json()
          setReplies(body.replies || [])
        }
      }
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
                    {reply.staff_first_name} {reply.staff_last_name}
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

      {/* Reply composer.
          Layout mirrors the customer-side ticket composer
          (app/dashboard/support/[ticketId]/page.tsx): full-width textarea
          on top, a helper line + action button on a row underneath. The
          old layout placed a ~3-line textarea *next to* the Send button on
          sm+ screens, which read as a tiny single-line search bar on
          mobile. This treatment gives the reply the same visual weight on
          both sides of the conversation. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Send className="w-3.5 h-3.5" />
            {isInternal ? 'Add internal note' : 'Reply to customer'}
          </h3>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-gray-300 text-[#7B2D8E] focus:ring-[#7B2D8E]/30"
            />
            Internal note
          </label>
        </div>

        <textarea
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder={
            isInternal
              ? 'Add an internal note — not visible to the customer…'
              : 'Type your reply here…'
          }
          rows={4}
          className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-all resize-none mb-3"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 hidden sm:block">
            {isInternal
              ? 'Only staff with admin access will see this note.'
              : 'The customer will receive this reply by email.'}
          </p>
          <button
            onClick={handleSendReply}
            disabled={sending || !replyMessage.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isInternal ? 'Add note' : 'Send reply'}
              </>
            )}
          </button>
        </div>
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
