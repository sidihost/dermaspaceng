'use client'

import Link from 'next/link'
import { ArrowRight, MailOpen } from 'lucide-react'
import type { ConsultationConversationReply } from './consultation-conversation'

interface ConsultationResponsesSummaryProps {
  replies: ConsultationConversationReply[]
  href: string
  customerLabel?: string
}

function formatSnippetTime(iso: string): string {
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

export function ConsultationResponsesSummary({
  replies,
  href,
  customerLabel = 'You',
}: ConsultationResponsesSummaryProps) {
  const latestReply = replies.length > 0 ? replies[replies.length - 1] : null
  const teamReplyCount = replies.filter((r) => r.isStaff).length

  const ctaLabel =
    replies.length === 0
      ? 'View response'
      : replies.length === 1
        ? 'View response'
        : 'View responses'

  return (
    <section
      aria-label="Clinical responses summary"
      className="rounded-2xl border border-gray-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#7B2D8E]/10 text-[#7B2D8E]">
            <MailOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Clinical team responses
              </h2>
              {replies.length > 0 && (
                <span className="rounded-full bg-[#7B2D8E]/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#7B2D8E]">
                  {replies.length} {replies.length === 1 ? 'update' : 'updates'}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {teamReplyCount > 0
                ? 'Read clinical guidance and follow up with our team on the dedicated responses page.'
                : 'View clinical team responses or send a follow-up note on the dedicated responses page.'}
            </p>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#7B2D8E] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5A1D6A]"
        >
          <MailOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {latestReply && (
        <div className="mt-4 rounded-xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.04] px-4 py-3">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-[#7B2D8E]">
              {latestReply.isStaff
                ? latestReply.senderName || 'Dermaspace Team'
                : customerLabel}
            </span>
            {latestReply.createdAt && (
              <span className="text-gray-400">
                {formatSnippetTime(latestReply.createdAt)}
              </span>
            )}
          </div>
          {latestReply.message ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-gray-700">
              {latestReply.message}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Attachment shared — open responses to view.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
