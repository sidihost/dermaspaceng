'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Loader2,
  MailOpen,
  Send,
} from 'lucide-react'
import { AttachmentList } from '@/components/shared/attachment-list'
import type { ReplyAttachment } from '@/lib/attachments'

export interface ConsultationConversationReply {
  id: string
  message: string
  isStaff: boolean
  senderName: string
  senderAvatarUrl?: string | null
  attachments?: ReplyAttachment[] | null
  createdAt: string
}

interface ConsultationConversationProps {
  replies: ConsultationConversationReply[]
  status: string
  replyEndpoint: string
  onReplySent?: (reply: ConsultationConversationReply) => void
  customerLabel?: string
  emptyTitle?: string
  emptyDescription?: string
}

function formatReplyTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'DS'
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

export function ConsultationConversation({
  replies,
  status,
  replyEndpoint,
  onReplySent,
  customerLabel = 'You',
  emptyTitle = 'No team responses yet',
  emptyDescription = 'When our clinical team reviews your consultation or shares preparation advice, their messages will appear right here.',
}: ConsultationConversationProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentNotice, setSentNotice] = useState(false)

  const isCancelled = status === 'cancelled'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || sending || isCancelled) return

    setSending(true)
    setError(null)
    setSentNotice(false)

    try {
      const res = await fetch(replyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Could not send your message. Please try again.')
        return
      }
      setMessage('')
      setSentNotice(true)
      if (json.reply && onReplySent) {
        onReplySent(json.reply as ConsultationConversationReply)
      }
    } catch {
      setError('Connection error while sending your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section
      aria-label="Consultation conversation"
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E]">
            <MailOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Responses &amp; messages
              </h2>
              {replies.length > 0 && (
                <span className="rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#7B2D8E]">
                  {replies.length}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Updates from the Dermaspace clinical team and your follow-up notes.
            </p>
          </div>
        </div>
      </div>

      {replies.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-6 text-center">
          <span className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
            <MailOpen className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-gray-900">{emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500 text-pretty">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-3.5">
          {replies.map((reply) => {
            const formattedTime = formatReplyTime(reply.createdAt)
            if (reply.isStaff) {
              return (
                <li
                  key={reply.id}
                  className="flex max-w-[92%] flex-col items-start sm:max-w-[85%]"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#7B2D8E]/10 text-[10px] font-semibold text-[#7B2D8E] ring-1 ring-[#7B2D8E]/15">
                      {reply.senderAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={reply.senderAvatarUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initialsOf(reply.senderName)
                      )}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {reply.senderName || 'Dermaspace Team'}
                    </span>
                    <span className="rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7B2D8E]">
                      Dermaspace Team
                    </span>
                    {formattedTime && (
                      <span className="text-gray-400">· {formattedTime}</span>
                    )}
                  </div>
                  <div className="max-w-full rounded-2xl rounded-tl-md border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.04] px-4 py-3">
                    {reply.message && (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                        {reply.message}
                      </p>
                    )}
                    <AttachmentList attachments={reply.attachments} tone="light" />
                  </div>
                </li>
              )
            }

            return (
              <li
                key={reply.id}
                className="ml-auto flex max-w-[92%] flex-col items-end sm:max-w-[85%]"
              >
                <div className="mb-1 flex items-center justify-end gap-1.5 text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {customerLabel}
                  </span>
                  {formattedTime && (
                    <span className="text-gray-400">· {formattedTime}</span>
                  )}
                </div>
                <div className="max-w-full rounded-2xl rounded-tr-md bg-[#7B2D8E] px-4 py-3 text-white">
                  {reply.message && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {reply.message}
                    </p>
                  )}
                  <AttachmentList attachments={reply.attachments} tone="dark" />
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-5 border-t border-gray-100 pt-4">
        {isCancelled ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-600">
              This consultation was cancelled. Book a new slot if you&apos;d like to speak with a specialist.
            </p>
            <Link
              href="/consultation"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5A1D6A]"
            >
              Book a new consultation
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label
              htmlFor="consultation-reply-input"
              className="block text-xs font-medium text-gray-700"
            >
              Send a message to our team
            </label>
            <textarea
              id="consultation-reply-input"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                if (error) setError(null)
                if (sentNotice) setSentNotice(false)
              }}
              rows={3}
              maxLength={2000}
              placeholder="Ask a question, share an update, or confirm your arrival time…"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20"
            />
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-[#5A1D6A]/20 bg-[#5A1D6A]/[0.05] px-3 py-2 text-xs font-medium text-[#5A1D6A]"
              >
                {error}
              </p>
            )}
            {sentNotice && !error && (
              <p className="text-xs font-medium text-[#7B2D8E]">
                Message sent — our clinical team has been notified.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <p className="min-w-0 flex-1 text-[11px] text-gray-400">
                Replies are shared privately with the Dermaspace team.
              </p>
              <button
                type="submit"
                disabled={sending || !message.trim()}
                className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#7B2D8E] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5A1D6A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send reply
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
