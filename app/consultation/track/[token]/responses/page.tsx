'use client'

import { useCallback, useEffect, useState, use } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  ConsultationConversation,
  type ConsultationConversationReply,
} from '@/components/consultation/consultation-conversation'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
} from 'lucide-react'

const locationNames: Record<string, string> = {
  vi: 'Victoria Island',
  ikoyi: 'Ikoyi',
}

interface ConsultationSummary {
  id: string
  firstName: string
  location: string
  appointmentDate: string
  appointmentTime: string
  status: string
  replies: ConsultationConversationReply[]
}

function formatDate(value: string): string {
  if (!value) return 'Awaiting confirmation'
  try {
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export default function TrackConsultationResponsesPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [data, setData] = useState<ConsultationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch(`/api/consultation/track/${token}`, {
          cache: 'no-store',
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!silent) {
            setError(json.error || 'Unable to load this consultation.')
          }
        } else {
          setData(json.consultation)
          if (!silent) setError(null)
        }
      } catch {
        if (!silent) setError('Something went wrong. Please try again.')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    void load(false)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load(true)
      }
    }, 20_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [load])

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="bg-[#7B2D8E]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-white/70 uppercase tracking-widest leading-none">
              Consultation
            </p>
            <h1 className="text-sm font-semibold text-white mt-0.5">
              Consultation responses
            </h1>
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <Link
          href={`/consultation/track/${token}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to consultation details
        </Link>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="w-8 h-8 border-2 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-4">Loading responses…</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              We couldn&apos;t find that consultation
            </h2>
            <p className="text-sm text-gray-600 mb-6 text-pretty">{error}</p>
            <Link
              href="/consultation"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Book a consultation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {!loading && data && (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="h-1 bg-[#7B2D8E]" aria-hidden="true" />
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7B2D8E]">
                      Private consultation thread
                    </p>
                    <h2 className="mt-0.5 text-lg font-semibold text-gray-900">
                      Hi {data.firstName}, here are your consultation responses
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#7B2D8E] capitalize">
                    {data.status || 'pending'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    {formatDate(data.appointmentDate)}
                  </span>
                  {data.appointmentTime && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                      {data.appointmentTime}
                    </span>
                  )}
                  {data.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#7B2D8E]" />
                      {locationNames[data.location] ?? data.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <ConsultationConversation
              replies={data.replies ?? []}
              status={data.status}
              replyEndpoint={`/api/consultation/track/${token}/reply`}
              customerLabel={data.firstName || 'You'}
              onReplySent={(reply) => {
                setData((prev) =>
                  prev
                    ? { ...prev, replies: [...(prev.replies ?? []), reply] }
                    : prev,
                )
              }}
            />
          </>
        )}
      </div>

      <Footer />
    </main>
  )
}
