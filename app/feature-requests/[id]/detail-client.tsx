'use client'

/**
 * Public detail page for a single feature request.
 *
 * Big-tech roadmap style: a focused two-column read where clients see
 * the full idea, upvote it, follow its journey through the pipeline,
 * and read the team's response. Personalised for the signed-in viewer
 * (their own idea is badged "You", their vote state is reflected live).
 *
 * House style: brand purple #7B2D8E, flat white cards, hairline gray
 * borders. No gradients, no shadows, no Sparkles/Zap icons.
 */

import { useCallback } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  ChevronUp,
  ArrowLeft,
  Check,
  Loader2,
  CalendarDays,
  Tag,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type FeatureRequest = {
  id: string
  title: string
  description: string
  category: string
  status: string
  admin_note: string | null
  pinned: boolean
  created_at: string
  updated_at: string
  first_name: string | null
  last_name: string | null
  username: string | null
  avatar_url: string | null
  vote_count: number
  has_voted: boolean
  is_author: boolean
}

type Voter = {
  first_name: string | null
  last_name: string | null
  username: string | null
  avatar_url: string | null
}

type DetailResponse = {
  request: FeatureRequest
  voters: Voter[]
  viewer: { id: string; first_name: string | null } | null
  error?: string
}

const STATUS_META: Record<
  string,
  { label: string; dot: string; text: string; bg: string }
> = {
  open: { label: 'Open', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100' },
  under_review: { label: 'Under review', dot: 'bg-[#7B2D8E]', text: 'text-[#7B2D8E]', bg: 'bg-[#7B2D8E]/10' },
  planned: { label: 'Planned', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  in_progress: { label: 'In progress', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  shipped: { label: 'Shipped', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  declined: { label: 'Declined', dot: 'bg-rose-400', text: 'text-rose-700', bg: 'bg-rose-50' },
}

// The happy-path pipeline (declined is a terminal off-ramp handled
// separately). Used to render the progress timeline.
const PIPELINE = ['open', 'under_review', 'planned', 'in_progress', 'shipped']

const CATEGORIES: Record<string, string> = {
  general: 'General',
  booking: 'Booking',
  account: 'Account',
  payments: 'Payments',
  services: 'Services',
  mobile: 'Mobile',
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function FeatureRequestDetailClient({ id }: { id: string }) {
  const key = `/api/feature-requests/${id}`
  const { data, isLoading, mutate } = useSWR<DetailResponse>(key, fetcher, {
    revalidateOnFocus: false,
  })

  const req = data?.request
  const isSignedIn = Boolean(data?.viewer?.id)

  const toggleVote = useCallback(async () => {
    if (!data || !req) return
    if (!isSignedIn) {
      window.location.href = `/login?redirect=/feature-requests/${id}`
      return
    }
    const optimistic: DetailResponse = {
      ...data,
      request: {
        ...req,
        has_voted: !req.has_voted,
        vote_count: req.vote_count + (req.has_voted ? -1 : 1),
      },
    }
    mutate(optimistic, false)
    try {
      const res = await fetch(`/api/feature-requests/${id}/vote`, { method: 'POST' })
      if (!res.ok) throw new Error('vote failed')
      mutate()
    } catch {
      mutate()
    }
  }, [data, req, isSignedIn, id, mutate])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link
          href="/feature-requests"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#7B2D8E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to roadmap
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
          </div>
        ) : !req ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
            </div>
            <h1 className="mt-4 text-sm font-semibold text-gray-900">
              This idea could not be found
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              It may have been removed. Browse the roadmap for more ideas.
            </p>
            <Link
              href="/feature-requests"
              className="mt-5 inline-flex items-center justify-center h-10 px-4 rounded-xl bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6a2679] transition-colors"
            >
              Back to roadmap
            </Link>
          </div>
        ) : (
          <Detail
            req={req}
            voters={data?.voters ?? []}
            onVote={toggleVote}
          />
        )}
      </div>
    </div>
  )
}

function Detail({
  req,
  voters,
  onVote,
}: {
  req: FeatureRequest
  voters: Voter[]
  onVote: () => void
}) {
  const meta = STATUS_META[req.status] ?? STATUS_META.open
  const author = req.is_author
    ? 'You'
    : [req.first_name, req.last_name].filter(Boolean).join(' ') ||
      req.username ||
      'Client'

  return (
    <article className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 lg:gap-6 items-start">
      {/* Main column */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium',
              meta.bg,
              meta.text,
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} aria-hidden />
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-500">
            <Tag className="w-3 h-3" aria-hidden />
            {CATEGORIES[req.category] ?? 'General'}
          </span>
          {req.pinned && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-[#7B2D8E]/20 text-[#7B2D8E]">
              Featured
            </span>
          )}
        </div>

        <h1 className="mt-4 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight text-balance leading-snug">
          {req.title}
        </h1>

        {/* Author line */}
        <div className="mt-3 flex items-center gap-2.5">
          <Avatar
            name={author}
            src={req.avatar_url}
            className="w-7 h-7 text-[11px]"
          />
          <p className="text-[13px] text-gray-500">
            Suggested by{' '}
            <span
              className={cn(
                'font-medium',
                req.is_author ? 'text-[#7B2D8E]' : 'text-gray-700',
              )}
            >
              {author}
            </span>
          </p>
        </div>

        <div className="mt-5 h-px bg-gray-100" />

        <p className="mt-5 text-sm sm:text-[15px] text-gray-700 leading-relaxed whitespace-pre-line text-pretty">
          {req.description}
        </p>

        {/* Team response */}
        {req.admin_note && (
          <div className="mt-6 rounded-xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.04] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7B2D8E]">
              Team response
            </p>
            <p className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {req.admin_note}
            </p>
          </div>
        )}

        {/* Progress timeline */}
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Progress
          </p>
          <Timeline status={req.status} />
        </div>

        {/* Meta footer */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" aria-hidden />
            Suggested{' '}
            {new Date(req.created_at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Sidebar: vote + supporters */}
      <aside className="lg:sticky lg:top-6 flex flex-col gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <button
            type="button"
            onClick={onVote}
            aria-pressed={req.has_voted}
            aria-label={req.has_voted ? 'Remove your vote' : 'Upvote this idea'}
            className={cn(
              'group w-full flex items-center justify-center gap-2.5 h-14 rounded-xl border transition-colors',
              req.has_voted
                ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-[#7B2D8E] hover:text-[#7B2D8E]',
            )}
          >
            <ChevronUp
              className={cn(
                'w-5 h-5 transition-transform',
                !req.has_voted && 'group-hover:-translate-y-0.5',
              )}
              aria-hidden
            />
            <span className="text-lg font-bold tabular-nums leading-none">
              {req.vote_count}
            </span>
            <span className="text-sm font-semibold">
              {req.vote_count === 1 ? 'vote' : 'votes'}
            </span>
          </button>
          <p className="mt-2.5 text-center text-xs text-gray-500">
            {req.has_voted ? (
              <span className="inline-flex items-center gap-1 text-[#7B2D8E] font-medium">
                <Check className="w-3.5 h-3.5" aria-hidden />
                You&apos;re backing this idea
              </span>
            ) : (
              'Upvote to help this rise on the roadmap'
            )}
          </p>
        </div>

        {voters.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Supporters
            </p>
            <div className="mt-3 flex items-center">
              {voters.slice(0, 8).map((v, i) => {
                const name =
                  [v.first_name, v.last_name].filter(Boolean).join(' ') ||
                  v.username ||
                  'Client'
                return (
                  <Avatar
                    key={i}
                    name={name}
                    src={v.avatar_url}
                    className={cn(
                      'w-8 h-8 text-[11px] ring-2 ring-white',
                      i > 0 && '-ml-2',
                    )}
                  />
                )
              })}
              {req.vote_count > voters.length && (
                <span className="-ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-500 ring-2 ring-white">
                  +{req.vote_count - voters.length}
                </span>
              )}
            </div>
          </div>
        )}
      </aside>
    </article>
  )
}

function Timeline({ status }: { status: string }) {
  // Declined ideas get their own single-line treatment.
  if (status === 'declined') {
    return (
      <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-3">
        <span className="w-2 h-2 rounded-full bg-rose-400" aria-hidden />
        <p className="text-[13px] font-medium text-rose-700">
          Not planned right now
        </p>
      </div>
    )
  }

  const currentIndex = PIPELINE.indexOf(status)
  return (
    <ol className="mt-3 space-y-0">
      {PIPELINE.map((s, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        const meta = STATUS_META[s]
        const last = i === PIPELINE.length - 1
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors',
                  done && 'border-[#7B2D8E] bg-[#7B2D8E] text-white',
                  active && 'border-[#7B2D8E] bg-white text-[#7B2D8E]',
                  !done && !active && 'border-gray-200 bg-white',
                )}
                aria-hidden
              >
                {done ? (
                  <Check className="w-3 h-3" />
                ) : active ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                ) : null}
              </span>
              {!last && (
                <span
                  className={cn(
                    'w-0.5 flex-1 min-h-6',
                    i < currentIndex ? 'bg-[#7B2D8E]' : 'bg-gray-200',
                  )}
                  aria-hidden
                />
              )}
            </div>
            <div className={cn('pb-4', last && 'pb-0')}>
              <p
                className={cn(
                  'text-[13px] leading-5',
                  active
                    ? 'font-semibold text-[#7B2D8E]'
                    : done
                      ? 'font-medium text-gray-700'
                      : 'text-gray-400',
                )}
              >
                {meta.label}
              </p>
              {active && (
                <p className="text-[11.5px] text-gray-500 mt-0.5">
                  Current stage
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function Avatar({
  name,
  src,
  className,
}: {
  name: string
  src?: string | null
  className?: string
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src || '/placeholder.svg'}
        alt={name}
        className={cn('rounded-full object-cover shrink-0', className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-[#7B2D8E]/10 font-semibold text-[#7B2D8E] shrink-0',
        className,
      )}
      aria-hidden
    >
      {initials || 'C'}
    </span>
  )
}
