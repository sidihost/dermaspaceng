'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Mail,
  Send,
} from 'lucide-react'
import { useNotify } from '@/components/shared/notify'
import { isPlaceholderEmail } from '@/lib/auth-onboarding'

interface AdminUserSummary {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url?: string | null
  role: string
  is_active?: boolean
}

export default function AdminEmailClientPage() {
  const params = useParams()
  const router = useRouter()
  const notify = useNotify()
  const userId = params.userId as string

  const [user, setUser] = useState<AdminUserSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [sending, setSending] = useState(false)

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
      setLoadError(err instanceof Error ? err.message : 'Could not load client profile')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

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
      notify.success('Email sent', `Delivered to ${body.sentTo || user?.email || 'client'}.`)
      router.push(`/admin/users/${encodeURIComponent(userId)}`)
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
      <div className="flex flex-wrap items-center gap-2 text-sm">
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
        <span className="text-gray-900 font-medium">Send email</span>
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7B2D8E] text-white text-xs font-semibold hover:bg-[#7B2D8E]/90"
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
                  className="w-full h-10 px-3.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none"
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
                <textarea
                  id="admin-client-email-message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={9}
                  maxLength={10000}
                  placeholder="Write your message to the client..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none resize-y leading-relaxed"
                />
                <p className="mt-1.5 text-[11px] text-gray-500">
                  Sent directly from hello@dermaspaceng.com inside Dermaspace&apos;s standard transactional email layout.
                </p>
              </div>

              {submitError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#7B2D8E]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}
