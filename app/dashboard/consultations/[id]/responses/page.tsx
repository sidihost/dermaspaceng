'use client'

/**
 * /dashboard/consultations/[id]/responses
 *
 * Dedicated page for reading clinical team responses and sending
 * follow-up messages for a consultation belonging to the signed-in customer.
 */

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  XCircle,
} from 'lucide-react'
import {
  ConsultationConversation,
  type ConsultationConversationReply,
} from '@/components/consultation/consultation-conversation'

interface ConsultationDetail {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  location: string | null
  appointmentDate: string | null
  appointmentTime: string | null
  status: string
  createdAt: string
  replies?: ConsultationConversationReply[]
}

const LOCATION_LABELS: Record<string, string> = {
  vi: 'Victoria Island',
  ikoyi: 'Ikoyi',
}

const STATUS: Record<
  string,
  { cls: string; label: string; Icon: typeof Clock }
> = {
  pending: {
    cls: 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-[#7B2D8E]/25',
    label: 'Pending review',
    Icon: Clock,
  },
  confirmed: {
    cls: 'bg-[#7B2D8E] text-white ring-[#7B2D8E]',
    label: 'Confirmed',
    Icon: CheckCircle2,
  },
  completed: {
    cls: 'bg-[#7B2D8E]/[0.15] text-[#7B2D8E] ring-[#7B2D8E]/30',
    label: 'Completed',
    Icon: CheckCircle2,
  },
  cancelled: {
    cls: 'bg-white text-[#5A1D6A] ring-[#5A1D6A]/35 line-through decoration-[#5A1D6A]/50',
    label: 'Cancelled',
    Icon: XCircle,
  },
}

const fetcher = (u: string) =>
  fetch(u, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('Failed to load')
    return r.json()
  })

function formatShortAppointment(date: string | null, time: string | null): string {
  if (!date) return 'Awaiting confirmation'
  const long = new Date(`${date}T00:00:00`).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return time ? `${long} at ${time}` : long
}

function fullName(c: ConsultationDetail): string {
  const composed = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
  return composed || c.email
}

export default function ConsultationResponsesPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const { data, error, isLoading, mutate } = useSWR<{
    consultation: ConsultationDetail
  }>(id ? `/api/user/consultations/${id}` : null, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 15_000,
  })

  const c = data?.consultation

  React.useEffect(() => {
    if (!c?.id) return
    fetch('/api/user/activity', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referenceType: 'consultation',
        referenceId: c.id,
      }),
    }).catch(() => {})
  }, [c?.id])

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={id ? `/dashboard/consultations/${id}` : '/dashboard/consultations'}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#7B2D8E]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to consultation details
        </Link>
        <Link
          href="/dashboard/consultations"
          className="text-xs font-medium text-gray-500 hover:text-[#7B2D8E]"
        >
          All consultations
        </Link>
      </div>

      {error && !data ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#5A1D6A]/20 bg-[#5A1D6A]/[0.04] px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#5A1D6A]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#5A1D6A]">
              We couldn&apos;t load these responses
            </p>
            <p className="text-xs text-[#5A1D6A]/80">
              This consultation may have been removed, or you might not have access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => mutate()}
            className="flex-shrink-0 rounded-lg bg-[#7B2D8E] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5A1D6A]"
          >
            Retry
          </button>
        </div>
      ) : isLoading || !c ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#7B2D8E]" />
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="h-1 bg-[#7B2D8E]" aria-hidden="true" />
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7B2D8E]">
                    Consultation responses
                  </p>
                  <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-gray-900">
                    {fullName(c)}
                  </h1>
                </div>
                {(() => {
                  const cfg = STATUS[c.status] || STATUS.pending
                  return (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ${cfg.cls}`}
                    >
                      <cfg.Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  )
                })()}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#7B2D8E]" />
                  {formatShortAppointment(c.appointmentDate, c.appointmentTime)}
                </span>
                {c.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#7B2D8E]" />
                    {LOCATION_LABELS[c.location] ?? c.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <ConsultationConversation
            replies={c.replies ?? []}
            status={c.status}
            replyEndpoint={`/api/user/consultations/${c.id}/reply`}
            customerLabel={c.firstName || 'You'}
            onReplySent={(reply) => {
              mutate(
                (current) =>
                  current
                    ? {
                        consultation: {
                          ...current.consultation,
                          replies: [...(current.consultation.replies ?? []), reply],
                        },
                      }
                    : current,
                false,
              )
            }}
          />
        </>
      )}
    </div>
  )
}
