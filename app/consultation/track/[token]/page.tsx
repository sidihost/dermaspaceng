'use client'

import { useCallback, useEffect, useState, use } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ConsultationResponsesSummary } from '@/components/consultation/consultation-responses-summary'
import type { ConsultationConversationReply } from '@/components/consultation/consultation-conversation'
import { RecommendationsEyebrow } from '@/components/shared/recommendations-eyebrow'
import {
  MapPin,
  Calendar,
  CalendarPlus,
  Clock,
  Check,
  Download,
  Stethoscope,
  ClipboardList,
  Lightbulb,
  ArrowRight,
  UserPlus,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// /consultation/track/[token]
//
// Private, account-free status & conversation page for a submitted
// consultation. The anonymous customer reaches it via the unguessable
// token they got on submit (and by email). It shows the current request
// status, appointment details (+ calendar add), two-way consultation
// team conversation, and the personalised skin analysis.
// ---------------------------------------------------------------------------

const locationNames: Record<string, { name: string; address: string }> = {
  vi: {
    name: 'Victoria Island',
    address: '237b Muri Okunola St, Victoria Island, Lagos',
  },
  ikoyi: {
    name: 'Ikoyi',
    address: '9 Agbeke Rotinwa Cl, Dolphin Extension Estate, Ikoyi, Lagos',
  },
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Received' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
]

interface Analysis {
  summary: string
  concerns: { title: string; insight: string }[]
  recommendations: { title: string; reason: string }[]
  routineTips: string[]
  nextSteps: string
  disclaimer: string
}

interface Consultation {
  id: string
  firstName: string
  location: string
  appointmentDate: string
  appointmentTime: string
  concerns: string[]
  notes: string
  status: string
  analysis: Analysis | null
  createdAt: string
  replies: ConsultationConversationReply[]
}

function statusIndex(status: string): number {
  if (status === 'cancelled') return -1
  const i = STATUS_STEPS.findIndex((s) => s.key === status)
  return i === -1 ? 0 : i
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

function parseSlotTime(slot: string): { hours: number; minutes: number } {
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return { hours: 10, minutes: 0 }
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const meridiem = match[3].toUpperCase()
  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  return { hours, minutes }
}

function formatCalendarStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

export default function TrackConsultationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [data, setData] = useState<Consultation | null>(null)
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

  const loc = data ? locationNames[data.location] : undefined
  const activeStep = data ? statusIndex(data.status) : 0
  const cancelled = data?.status === 'cancelled'

  const calendarUrls = (() => {
    if (!data || cancelled || !data.appointmentDate || !data.appointmentTime) {
      return null
    }
    const isoDay = data.appointmentDate.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return null
    const baseDate = new Date(`${isoDay}T00:00:00`)
    if (Number.isNaN(baseDate.getTime())) return null

    const { hours, minutes } = parseSlotTime(data.appointmentTime)
    baseDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(baseDate.getTime() + 30 * 60 * 1000)

    const startStr = formatCalendarStamp(baseDate)
    const endStr = formatCalendarStamp(endDate)
    const title = 'Dermaspace Consultation'
    const clinicName = loc?.name ?? data.location
    const address = loc?.address ?? clinicName
    const description = `Complimentary skin consultation at Dermaspace ${clinicName}.`

    const googleUrl =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${startStr}/${endStr}` +
      `&details=${encodeURIComponent(description)}` +
      `&location=${encodeURIComponent(address)}`

    const downloadIcs = () => {
      const escape = (s: string) =>
        s
          .replace(/\\/g, '\\\\')
          .replace(/\n/g, '\\n')
          .replace(/,/g, '\\,')
          .replace(/;/g, '\\;')

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dermaspace//Consultation//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${data.id || Date.now()}@dermaspaceng.com`,
        `DTSTAMP:${formatCalendarStamp(new Date())}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${escape(title)}`,
        `DESCRIPTION:${escape(description)}`,
        `LOCATION:${escape(address)}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder',
        'TRIGGER:-PT1H',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n')

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dermaspace-consultation.ics'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    return { googleUrl, downloadIcs }
  })()

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* App bar — mirrors the /consultation booking flow header. */}
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
              Track your request
            </h1>
          </div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="w-8 h-8 border-2 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-4">Loading your consultation…</p>
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
          <div className="space-y-6">
            {/* Greeting + status */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Hi {data.firstName}, here&apos;s your consultation
              </h2>
              <p className="text-sm text-gray-600 text-pretty">
                Bookmark this page to check your status, read consultation responses from
                our team, and revisit your personalised skin analysis anytime.
              </p>
            </div>

            {/* Status tracker */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                Status
              </h3>
              {cancelled ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">
                    This consultation was cancelled. Please book again if you
                    still need to be seen.
                  </p>
                  <Link
                    href="/consultation"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white text-xs font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                  >
                    Book a new consultation
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center">
                  {STATUS_STEPS.map((s, i) => (
                    <div key={s.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            i <= activeStep
                              ? 'bg-[#7B2D8E] text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {i < activeStep ? <Check className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <span
                          className={`mt-1.5 text-[11px] ${
                            i <= activeStep ? 'text-gray-900 font-medium' : 'text-gray-400'
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-2 rounded-full ${
                            i < activeStep ? 'bg-[#7B2D8E]' : 'bg-gray-100'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Appointment details */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                Appointment details
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{loc?.name ?? data.location}</p>
                    {loc?.address && (
                      <p className="text-xs text-gray-500">{loc.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <p className="font-medium text-gray-900">
                    {formatDate(data.appointmentDate)}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </span>
                  <p className="font-medium text-gray-900">{data.appointmentTime}</p>
                </div>
              </div>

              {calendarUrls && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <CalendarPlus className="w-4 h-4 text-[#7B2D8E]" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#7B2D8E]">
                      Add to calendar
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={calendarUrls.googleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#7B2D8E]/20 text-[#7B2D8E] text-xs font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Google Calendar
                    </a>
                    <button
                      type="button"
                      onClick={calendarUrls.downloadIcs}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#7B2D8E]/20 text-[#7B2D8E] text-xs font-semibold rounded-full hover:bg-[#7B2D8E]/5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Apple / Outlook (.ics)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Consultation responses link card */}
            <ConsultationResponsesSummary
              replies={data.replies ?? []}
              href={`/consultation/track/${token}/responses`}
              customerLabel={data.firstName || 'You'}
            />

            {/* AI analysis */}
            {data.analysis && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-[#7B2D8E]/5 px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#7B2D8E]" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Your personalised skin analysis
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed text-pretty">
                    {data.analysis.summary}
                  </p>
                </div>

                <div className="p-5 space-y-6">
                  {data.analysis.concerns.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                        What we noticed
                      </h4>
                      <div className="space-y-3">
                        {data.analysis.concerns.map((c, i) => (
                          <div key={i} className="border-l-2 border-[#7B2D8E]/30 pl-3">
                            <p className="text-sm font-medium text-gray-900">{c.title}</p>
                            <p className="text-sm text-gray-600 leading-relaxed text-pretty">
                              {c.insight}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.analysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                        <RecommendationsEyebrow />
                      </h4>
                      <div className="space-y-3">
                        {data.analysis.recommendations.map((r, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{r.title}</p>
                              <p className="text-sm text-gray-600 leading-relaxed text-pretty">
                                {r.reason}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.analysis.routineTips.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                        While you wait
                      </h4>
                      <ul className="space-y-2">
                        {data.analysis.routineTips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                            <Lightbulb className="w-4 h-4 text-[#7B2D8E] flex-shrink-0 mt-0.5" />
                            <span className="leading-relaxed text-pretty">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      What happens next
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed text-pretty">
                      {data.analysis.nextSteps}
                    </p>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-4 text-pretty">
                    {data.analysis.disclaimer}
                  </p>
                </div>
              </div>
            )}

            {/* Sign-up invitation — no dashboard button for anonymous users */}
            <div className="bg-[#7B2D8E]/5 rounded-2xl p-5 border border-[#7B2D8E]/15">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Want a more personalised experience?
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed text-pretty">
                    Create a free account to save your skin profile, keep all
                    your consultations in one place, and get tailored
                    recommendations over time.
                  </p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-[#7B2D8E] text-white text-sm font-semibold rounded-full hover:bg-[#5A1D6A] transition-colors"
                  >
                    Create an account
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
