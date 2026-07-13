'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import {
  MapPin,
  Calendar,
  Clock,
  Check,
  Stethoscope,
  ClipboardList,
  Lightbulb,
  ArrowRight,
  UserPlus,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// /consultation/track/[token]
//
// Private, account-free status page for a submitted consultation. The
// anonymous customer reaches it via the unguessable token they got on
// submit (and by email). It shows the current request status plus the
// AI-generated skin analysis. There is NO dashboard link here — instead
// we gently invite the visitor to create an account for a richer,
// saved experience.
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
  firstName: string
  location: string
  appointmentDate: string
  appointmentTime: string
  concerns: string[]
  notes: string
  status: string
  analysis: Analysis | null
  createdAt: string
}

function statusIndex(status: string): number {
  if (status === 'cancelled') return -1
  const i = STATUS_STEPS.findIndex((s) => s.key === status)
  return i === -1 ? 0 : i
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return value
  }
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

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/consultation/track/${token}`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error || 'Unable to load this consultation.')
        } else {
          setData(json.consultation)
        }
      } catch {
        if (!cancelled) setError('Something went wrong. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const loc = data ? locationNames[data.location] : undefined
  const activeStep = data ? statusIndex(data.status) : 0
  const cancelled = data?.status === 'cancelled'

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
                Bookmark this page to check your status and revisit your
                personalised skin analysis anytime.
              </p>
            </div>

            {/* Status tracker */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                Status
              </h3>
              {cancelled ? (
                <p className="text-sm font-medium text-gray-900">
                  This consultation was cancelled. Please book again if you
                  still need to be seen.
                </p>
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
            </div>

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
                        Recommended for you
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
