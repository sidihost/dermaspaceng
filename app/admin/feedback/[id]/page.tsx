'use client'

/**
 * Admin single-feedback detail page.
 *
 * Replaces the old inline expand panel on /admin/feedback with a
 * dedicated, roomy page. Design language deliberately matches the rest
 * of the admin surface (survey / consultation detail):
 *
 *   • Brand purple #7B2D8E for accents; neutral gray scale for text.
 *   • Cards are `rounded-2xl` with a single 1px hairline border and a
 *     flat white fill — no gradients, no drop shadows.
 *   • Icons come from lucide-react only. Sparkle / Zap are intentionally
 *     avoided per brand rules.
 *
 * Read path: GET /api/admin/feedback/[id]
 * Write path: PUT /api/admin/feedback  (status workflow — reused as-is)
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Mail,
  UserCheck,
  UserX,
  Tag,
  Clock,
  CheckCircle2,
  Monitor,
} from 'lucide-react'

type Feedback = {
  id: number
  user_id: string | null
  name: string | null
  email: string | null
  category: string
  experience: 'positive' | 'neutral' | 'negative'
  rating: number
  message: string
  status: 'new' | 'in_review' | 'actioned' | 'closed'
  source: string
  user_agent: string | null
  created_at: string
  reviewed_at: string | null
  account_first_name: string | null
  account_last_name: string | null
  account_avatar_url: string | null
  account_email: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  service: 'Service Quality',
  staff: 'Staff & Support',
  facility: 'Facility & Ambiance',
  booking: 'Booking Experience',
  suggestion: 'Suggestion',
  complaint: 'Issue / Complaint',
}

const EXPERIENCE_META = {
  positive: { Icon: ThumbsUp, label: 'Positive', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  neutral: { Icon: Meh, label: 'Neutral', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
  negative: { Icon: ThumbsDown, label: 'Negative', cls: 'bg-red-50 text-red-700 border-red-200' },
} as const

const STATUS_FLOW: Array<{ value: Feedback['status']; label: string; description: string }> = [
  { value: 'new', label: 'New', description: 'Just arrived, not yet triaged' },
  { value: 'in_review', label: 'In review', description: 'Being looked into' },
  { value: 'actioned', label: 'Actioned', description: 'Resolved or responded to' },
  { value: 'closed', label: 'Closed', description: 'No further action needed' },
]

function fetchFeedback(id: string) {
  return fetch(`/api/admin/feedback/${id}`, { cache: 'no-store' }).then(async (r) => {
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`)
    return data.feedback as Feedback
  })
}

/** Ten-segment rating bar — flat fills, no gradient. */
function RatingBar({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${rating} out of 10`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className={`h-2 flex-1 rounded-full ${
            i < rating ? 'bg-[#7B2D8E]' : 'bg-gray-100'
          }`}
        />
      ))}
    </div>
  )
}

export default function FeedbackDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<Feedback['status'] | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchFeedback(id)
        if (!cancelled) setFeedback(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const changeStatus = async (next: Feedback['status']) => {
    if (!feedback || feedback.status === next) return
    setUpdating(next)
    const prev = feedback
    // Optimistic — reflect the new status immediately.
    setFeedback({ ...feedback, status: next })
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: feedback.id, status: next }),
      })
      if (!res.ok) throw new Error('update failed')
      const body = await res.json()
      setFeedback((curr) =>
        curr ? { ...curr, status: next, reviewed_at: body.reviewed_at ?? curr.reviewed_at } : curr,
      )
    } catch {
      // Roll back on failure.
      setFeedback(prev)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#7B2D8E]" />
      </div>
    )
  }

  if (error || !feedback) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 py-12 px-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5 text-[#7B2D8E]" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Unable to load feedback</h2>
          <p className="text-sm text-gray-500 mt-1">{error || 'Not found'}</p>
        </div>
        <Link
          href="/admin/feedback"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#7B2D8E] text-white text-sm font-medium hover:bg-[#5A1D6A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to feedback
        </Link>
      </div>
    )
  }

  const displayName =
    feedback.name ||
    [feedback.account_first_name, feedback.account_last_name].filter(Boolean).join(' ') ||
    'Anonymous'
  const displayEmail = feedback.email || feedback.account_email || ''
  const exp = EXPERIENCE_META[feedback.experience]
  const categoryLabel = CATEGORY_LABELS[feedback.category] || feedback.category
  const submitted = new Date(feedback.created_at)
  const reviewed = feedback.reviewed_at ? new Date(feedback.reviewed_at) : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4 pb-12">
      {/* Breadcrumb */}
      <Link
        href="/admin/feedback"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feedback
      </Link>

      {/* Two-column layout on desktop: the roomy left column holds the
          identity, message and metadata so long copy has space to
          breathe; the right rail carries the status workflow so it
          stays reachable without scrolling past the message. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
      {/* Identity + rating card */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] flex items-center justify-center text-lg font-bold flex-shrink-0 overflow-hidden">
            {feedback.account_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={feedback.account_avatar_url}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover"
              />
            ) : (
              (displayName.charAt(0) || 'A').toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight text-balance">
              {displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {feedback.user_id ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
                  <UserCheck className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  Signed-in client
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                  <UserX className="w-3.5 h-3.5 text-gray-400" />
                  Anonymous
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${exp.cls}`}
              >
                <exp.Icon className="w-3 h-3" />
                {exp.label}
              </span>
            </div>
          </div>
        </div>

        {/* Rating block */}
        <div className="mt-5 rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Rating
            </span>
            <span className="inline-flex items-baseline gap-1 text-gray-900">
              <Star className="w-4 h-4 text-[#7B2D8E] fill-[#7B2D8E] self-center" />
              <span className="text-lg font-bold">{feedback.rating}</span>
              <span className="text-sm text-gray-400">/10</span>
            </span>
          </div>
          <RatingBar rating={feedback.rating} />
        </div>
      </section>

      {/* Message card */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Message</h2>
        <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">
          {feedback.message}
        </p>
      </section>

      {/* Meta card */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          <MetaRow icon={<Tag className="w-4 h-4 text-gray-400" />} label="Category" value={categoryLabel} />
          <MetaRow
            icon={<Mail className="w-4 h-4 text-gray-400" />}
            label="Email"
            value={displayEmail || 'No email provided'}
          />
          <MetaRow
            icon={<Monitor className="w-4 h-4 text-gray-400" />}
            label="Source"
            value={feedback.source === 'shake' ? 'Shake-to-feedback' : feedback.source === 'api' ? 'API' : 'Web form'}
          />
          <MetaRow
            icon={<Clock className="w-4 h-4 text-gray-400" />}
            label="Submitted"
            value={submitted.toLocaleString()}
          />
          {reviewed && (
            <MetaRow
              icon={<CheckCircle2 className="w-4 h-4 text-gray-400" />}
              label="Reviewed"
              value={reviewed.toLocaleString()}
            />
          )}
        </div>
      </section>
        </div>

        {/* Right rail — status workflow */}
        <div className="lg:col-span-1 lg:sticky lg:top-6">
      {/* Status workflow card */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Status</h2>
        <div className="space-y-2">
          {STATUS_FLOW.map((s) => {
            const active = feedback.status === s.value
            const isUpdating = updating === s.value
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => changeStatus(s.value)}
                disabled={active || updating !== null}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-default ${
                  active
                    ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                    : 'border-gray-100 hover:border-[#7B2D8E]/40 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    active ? 'bg-[#7B2D8E]' : 'bg-gray-300'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-semibold ${
                      active ? 'text-[#7B2D8E]' : 'text-gray-800'
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="block text-xs text-gray-500">{s.description}</span>
                </span>
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#7B2D8E] flex-shrink-0" />
                ) : active ? (
                  <CheckCircle2 className="w-4 h-4 text-[#7B2D8E] flex-shrink-0" />
                ) : null}
              </button>
            )
          })}
        </div>

        {displayEmail && (
          <a
            href={`mailto:${displayEmail}?subject=Re%3A%20Your%20Dermaspace%20feedback`}
            className="mt-4 inline-flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#5A1D6A] transition-colors"
          >
            <Mail className="w-4 h-4" />
            Reply by email
          </a>
        )}
      </section>
        </div>
      </div>
    </div>
  )
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 px-4 sm:px-5 py-3.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-xs text-gray-500 w-24 shrink-0 mt-0.5">{label}</span>
      <span className="text-sm text-gray-800 min-w-0 flex-1 break-words">{value}</span>
    </div>
  )
}
