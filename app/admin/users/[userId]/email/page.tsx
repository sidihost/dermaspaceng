'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  User,
} from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import { isPlaceholderEmail } from '@/lib/auth-onboarding'
import { AiTextToolbar } from '@/components/admin/ai-text-toolbar'
import type { AdminClientEmailRecord } from '@/lib/admin-email-history'

interface AdminUserSummary {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url?: string | null
  role: string
  is_active?: boolean
}

function formatSentAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminEmailClientPage() {
  const params = useParams()
  const notify = useNotify()
  const userId = params.userId as string

  const [user, setUser] = useState<AdminUserSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [sentEmails, setSentEmails] = useState<AdminClientEmailRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [sending, setSending] = useState(false)

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/email`,
        { cache: 'no-store' },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || 'Could not load sent email history')
      }
      const list = Array.isArray(body?.emails)
        ? (body.emails as AdminClientEmailRecord[])
        : []
      setSentEmails(list)
      if (list.length > 0) {
        setExpandedIds((prev) =>
          Object.keys(prev).length === 0 ? { [list[0].id]: true } : prev,
        )
      }
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : 'Could not load sent email history',
      )
    } finally {
      setHistoryLoading(false)
    }
  }, [userId])

  const fetchUser = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        cache: 'no-store',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.user) {
        throw new Error(body?.error || 'Could not load client profile')
      }
      setUser(body.user as AdminUserSummary)
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Could not load client profile',
      )
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchUser()
    void fetchHistory()
  }, [fetchUser, fetchHistory])

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
      user.email ||
      'Client'
    : 'Client'
  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
      (user.email?.[0] ?? 'U').toUpperCase()
    : 'U'
  const hasDeliverableEmail = Boolean(user?.email && !isPlaceholderEmail(user.email))

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setSubmitError('Please enter both a subject and a message.')
      return
    }
    setSending(true)
    setSubmitError('')
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(body?.error || 'Could not send email.')
        return
      }
      notify.success(
        'Email sent',
        `Delivered to ${body.sentTo || user?.email || 'client'}.`,
      )
      setSubject('')
      setMessage('')
      if (body?.email) {
        const created = body.email as AdminClientEmailRecord
        setSentEmails((prev) => [
          created,
          ...prev.filter((item) => item.id !== created.id),
        ])
        setExpandedIds((prev) => ({ ...prev, [created.id]: true }))
      } else {
        void fetchHistory()
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not send email.')
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

  if (loadError || !user) {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="w-11 h-11 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
        </div>
        <h1 className="text-base font-semibold text-gray-900">
          {loadError || 'Client not found'}
        </h1>
        <Link
          href="/admin/users"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to clients
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Top breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-[#7B2D8E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All clients
          </Link>
          <span className="text-gray-300">/</span>
          <Link
            href={`/admin/users/${encodeURIComponent(userId)}`}
            className="text-gray-500 hover:text-[#7B2D8E] transition-colors truncate max-w-[200px]"
          >
            {fullName}
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Email client</span>
        </div>

        <Link
          href={`/admin/users/${encodeURIComponent(userId)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/30 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to profile
        </Link>
      </div>

      {/* Main compose card */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-1 bg-[#7B2D8E]" aria-hidden="true" />
        <div className="p-5 sm:p-6 space-y-6">
          {/* Recipient header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-3.5 min-w-0">
              {user.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.avatar_url}
                  alt={fullName}
                  className="w-12 h-12 rounded-2xl object-cover ring-1 ring-[#7B2D8E]/15 bg-[#7B2D8E]/5 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">{initials}</span>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  Email {fullName}
                </h1>
                <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                  <span className="truncate">
                    {hasDeliverableEmail
                      ? `To: ${user.email}`
                      : 'No deliverable email address on file'}
                  </span>
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-full border border-[#7B2D8E]/20 bg-[#FAF6FB] px-3 py-1 text-xs font-medium text-[#7B2D8E]">
              <Inbox className="w-3.5 h-3.5" />
              <span className="tabular-nums">{sentEmails.length}</span>
              <span>{sentEmails.length === 1 ? 'sent email' : 'sent emails'}</span>
            </span>
          </div>

          {!hasDeliverableEmail ? (
            <div className="rounded-xl border border-gray-200 bg-[#FBF9FC] p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                Cannot send email to this client
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                This account does not have a valid email address on file. Update the client&apos;s email in their profile before sending a message.
              </p>
              <Link
                href={`/admin/users/${encodeURIComponent(userId)}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#5A1D6A]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to client profile
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="admin-client-email-subject"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Subject
                  </label>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {subject.length}/200
                  </span>
                </div>
                <input
                  id="admin-client-email-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Update on your upcoming Dermaspace visit"
                  className="w-full h-10 px-3.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="admin-client-email-message"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Message
                  </label>
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {message.length}/10,000
                  </span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:border-[#7B2D8E] transition-colors">
                  <textarea
                    id="admin-client-email-message"
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    maxLength={10000}
                    placeholder="Write your message to the client..."
                    className="block w-full px-3.5 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none resize-y leading-relaxed"
                  />
                  <AiTextToolbar
                    value={message}
                    onChange={setMessage}
                    context={`Direct admin email to Dermaspace client ${fullName}${subject.trim() ? ` with subject "${subject.trim()}"` : ''}`}
                    maxLength={10000}
                    disabled={sending}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-500">
                  Sent directly from hello@dermaspaceng.com inside Dermaspace&apos;s standard transactional email layout and saved to the sent history below.
                </p>
              </div>

              {submitError && (
                <div className="rounded-xl border border-gray-200 bg-[#FAF6FB] px-3.5 py-2.5 text-xs text-[#5A1D6A] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#7B2D8E]" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2 border-t border-gray-100">
                <Link
                  href={`/admin/users/${encodeURIComponent(userId)}`}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={sending || !subject.trim() || !message.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send email
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Sent Emails History */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Sent Email History
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              All direct emails sent to {fullName} from the admin email composer.
            </p>
          </div>
          <button
            type="button"
            disabled={historyLoading}
            onClick={() => void fetchHistory()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[#7B2D8E] animate-spin" />
          </div>
        ) : historyError ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-sm text-gray-700">{historyError}</p>
            <button
              type="button"
              onClick={() => void fetchHistory()}
              className="text-xs font-semibold text-[#7B2D8E] hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : sentEmails.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-11 h-11 rounded-full bg-[#FAF6FB] border border-[#7B2D8E]/15 text-[#7B2D8E] flex items-center justify-center mx-auto mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              No direct emails sent yet
            </p>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Messages you send to {fullName} using the composer above will be saved here with full subject, sender, and message details.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sentEmails.map((entry) => {
              const isOpen = Boolean(expandedIds[entry.id])
              return (
                <li key={entry.id} className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entry.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left flex items-start justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors break-words">
                          {entry.subject}
                        </p>
                        {entry.isLegacyLog && (
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            Legacy log
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {entry.sentByName && (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3 text-[#7B2D8E]" />
                            <span>Sent by {entry.sentByName}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{formatSentAt(entry.createdAt)}</span>
                        </span>
                        {entry.recipientEmail && (
                          <span className="truncate max-w-[240px]">
                            To: {entry.recipientEmail}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 text-gray-500 group-hover:border-[#7B2D8E]/30 group-hover:text-[#7B2D8E] shrink-0">
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-3 rounded-xl border border-[#7B2D8E]/15 bg-[#FBF9FC] p-4">
                      {entry.message ? (
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                          {entry.message}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          This email was logged before full message history storage was enabled. All new emails sent from this page store their full message body here.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
