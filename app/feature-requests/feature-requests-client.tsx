'use client'

/**
 * Public "Feature Requests" board.
 *
 * A big-tech style product-feedback board where clients propose ideas,
 * upvote the ones they want, and watch them move through a transparent
 * pipeline (Open -> Under review -> Planned -> In progress -> Shipped).
 *
 * Design constraints (house style):
 *   - Brand purple #7B2D8E, flat white cards, hairline gray borders.
 *   - No gradients, no drop shadows, no Sparkles/Zap icons.
 *   - The "New idea" composer is a centered modal that matches the rest
 *     of the app's dialog language.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ChevronUp,
  Plus,
  X,
  Loader2,
  Search,
  Inbox,
  Lock,
  Lightbulb,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotify } from '@/components/shared/notify'

type FeatureRequest = {
  id: string
  title: string
  description: string
  category: string
  status: string
  admin_note: string | null
  pinned: boolean
  created_at: string
  first_name: string | null
  last_name: string | null
  username: string | null
  avatar_url: string | null
  vote_count: number
  has_voted: boolean
  is_author: boolean
}

type Viewer = {
  id: string
  first_name: string | null
  ideas_count: number
  votes_count: number
}

type BoardResponse = {
  requests: FeatureRequest[]
  counts: { status: string; n: number }[]
  viewer: Viewer | null
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

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'booking', label: 'Booking' },
  { value: 'account', label: 'Account' },
  { value: 'payments', label: 'Payments' },
  { value: 'services', label: 'Services' },
  { value: 'mobile', label: 'Mobile' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'shipped', label: 'Shipped' },
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function FeatureRequestsClient() {
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const notify = useNotify()

  const key = `/api/feature-requests?sort=${sort}&status=${status}`
  const { data, isLoading, mutate } = useSWR<BoardResponse>(key, fetcher, {
    revalidateOnFocus: false,
  })

  const viewer = data?.viewer ?? null
  const isSignedIn = Boolean(viewer?.id)

  const requests = useMemo(() => {
    const list = data?.requests ?? []
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    )
  }, [data, search])

  // Optimistic upvote toggle — flip locally, then reconcile with the API.
  const toggleVote = useCallback(
    async (req: FeatureRequest) => {
      if (!data) return
      if (!isSignedIn) {
        window.location.href = `/login?redirect=/feature-requests`
        return
      }
      const optimistic = {
        ...data,
        requests: data.requests.map((r) =>
          r.id === req.id
            ? {
                ...r,
                has_voted: !r.has_voted,
                vote_count: r.vote_count + (r.has_voted ? -1 : 1),
              }
            : r,
        ),
      }
      // `has_voted` reflects the state *before* this toggle, so the
      // resulting action is the opposite.
      const wasVoted = req.has_voted
      mutate(optimistic, false)
      try {
        const res = await fetch(`/api/feature-requests/${req.id}/vote`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error('vote failed')
        mutate()
        if (wasVoted) {
          notify.success('Vote removed', `“${req.title}” is no longer in your votes.`)
        } else {
          notify.success('Vote counted', `You’re now backing “${req.title}”.`)
        }
      } catch {
        mutate() // roll back to server truth
        notify.error('Could not save your vote', 'Please try again in a moment.')
      }
    },
    [data, isSignedIn, mutate, notify],
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#7B2D8E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" aria-hidden />
                Product roadmap
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight text-balance">
                {isSignedIn && viewer?.first_name
                  ? `${greeting()}, ${viewer.first_name}`
                  : 'Help shape Dermaspace'}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed text-pretty">
                {isSignedIn
                  ? 'Your ideas help us decide what to build next. Share something new, upvote what matters to you, and follow it all the way to launch.'
                  : 'Have an idea that would make booking treatments, managing your account, or your visits better? Share it, upvote what matters to you, and follow it all the way to launch.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6a2679] transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Share an idea
            </button>
          </div>

          {/* Personalised contribution strip */}
          {isSignedIn && viewer && (
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full border border-gray-200 bg-white text-sm">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <Lightbulb className="w-3.5 h-3.5" aria-hidden />
                </span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {viewer.ideas_count}
                </span>
                <span className="text-gray-500">
                  {viewer.ideas_count === 1 ? 'idea shared' : 'ideas shared'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full border border-gray-200 bg-white text-sm">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden />
                </span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  {viewer.votes_count}
                </span>
                <span className="text-gray-500">
                  {viewer.votes_count === 1 ? 'vote cast' : 'votes cast'}
                </span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Controls */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ideas…"
                className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-gray-200 bg-white focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {(['top', 'new'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={cn(
                    'text-xs font-semibold px-3 h-8 rounded-md transition-colors capitalize',
                    sort === s
                      ? 'bg-white text-[#7B2D8E]'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  {s === 'top' ? 'Most voted' : 'Newest'}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {STATUS_FILTERS.map((f) => {
              const count = data?.counts?.find((c) => c.status === f.value)?.n
              const active = status === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatus(f.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
                    active
                      ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 text-[#7B2D8E]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  )}
                >
                  {f.label}
                  {f.value !== 'all' && typeof count === 'number' && (
                    <span className={cn('tabular-nums', active ? 'text-[#7B2D8E]' : 'text-gray-400')}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              No ideas here yet
            </h3>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">
              Be the first to suggest something. Great ideas often start small.
            </p>
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6a2679] transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Share an idea
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {requests.map((req) => (
              <li key={req.id}>
                <RequestCard req={req} onVote={() => toggleVote(req)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {composerOpen && (
        <ComposerModal
          isSignedIn={isSignedIn}
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false)
            mutate()
          }}
        />
      )}
    </div>
  )
}

function RequestCard({
  req,
  onVote,
}: {
  req: FeatureRequest
  onVote: () => void
}) {
  const meta = STATUS_META[req.status] ?? STATUS_META.open
  const author = req.is_author
    ? 'You'
    : [req.first_name, req.last_name].filter(Boolean).join(' ') ||
      req.username ||
      'Client'

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-[#7B2D8E]/30">
      {/* Vote button — compact, square-ish, with a clear pressed state */}
      <button
        type="button"
        onClick={onVote}
        aria-pressed={req.has_voted}
        aria-label={req.has_voted ? 'Remove your vote' : 'Upvote this idea'}
        className={cn(
          'group flex flex-col items-center justify-center gap-0.5 w-12 h-14 shrink-0 rounded-xl border transition-colors',
          req.has_voted
            ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
            : 'border-gray-200 bg-white text-gray-600 hover:border-[#7B2D8E] hover:text-[#7B2D8E]',
        )}
      >
        <ChevronUp
          className={cn(
            'w-4 h-4 transition-transform',
            !req.has_voted && 'group-hover:-translate-y-0.5',
          )}
          aria-hidden
        />
        <span className="text-sm font-bold leading-none tabular-nums">
          {req.vote_count}
        </span>
      </button>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <Link href={`/feature-requests/${req.id}`} className="group block">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug text-balance group-hover:text-[#7B2D8E] transition-colors">
              {req.title}
            </h3>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium',
                meta.bg,
                meta.text,
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} aria-hidden />
              {meta.label}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-gray-600 leading-relaxed line-clamp-3">
            {req.description}
          </p>
        </Link>

        {req.admin_note && (
          <div className="mt-3 rounded-lg border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.04] px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7B2D8E]">
              Team response
            </p>
            <p className="mt-0.5 text-[13px] text-gray-700 leading-relaxed">
              {req.admin_note}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-gray-400">
          <span
            className={cn(
              'font-medium',
              req.is_author ? 'text-[#7B2D8E]' : 'text-gray-500',
            )}
          >
            {author}
          </span>
          <span aria-hidden>·</span>
          <span>{formatCategory(req.category)}</span>
          {req.pinned && (
            <>
              <span aria-hidden>·</span>
              <span className="text-[#7B2D8E] font-medium">Featured</span>
            </>
          )}
          {req.has_voted && (
            <span className="inline-flex items-center gap-1 ml-auto text-[#7B2D8E] font-medium">
              <Check className="w-3 h-3" aria-hidden />
              Voted
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Time-of-day greeting for the personalised hero.
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function ComposerModal({
  isSignedIn,
  onClose,
  onCreated,
}: {
  isSignedIn: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const notify = useNotify()

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong.')
        notify.error('Could not post your idea', json.error || 'Please try again.')
        setSubmitting(false)
        return
      }
      notify.success('Idea shared', 'Thanks! Your idea is now live on the roadmap.')
      onCreated()
    } catch {
      setError('Network error. Please try again.')
      notify.error('Network error', 'Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      // z-[70] sits above the fixed mobile bottom nav (z-50). At the
      // previous z-50 the nav painted over the sheet's action row on
      // phones, hiding "Post idea". The extra bottom padding keeps the
      // buttons clear of the home-indicator / nav safe area.
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share a feature idea"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-gray-100 max-h-[92vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Share an idea</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {!isSignedIn ? (
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5 text-[#7B2D8E]" aria-hidden />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              Sign in to share your idea
            </h3>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">
              We keep the board tidy by asking people to sign in before posting
              or voting.
            </p>
            <a
              href="/login?redirect=/feature-requests"
              className="mt-5 inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6a2679] transition-colors"
            >
              Sign in to continue
            </a>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={140}
                placeholder="e.g. Let me rebook my last appointment in one tap"
                className="w-full h-11 px-3 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Details
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="What would you like to see, and how would it help you?"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#7B2D8E] focus:ring-1 focus:ring-[#7B2D8E]/20 outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      'h-9 px-3 rounded-lg text-xs font-medium border transition-colors',
                      category === c.value
                        ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 text-[#7B2D8E]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#6a2679] transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                Post idea
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatCategory(c: string) {
  const found = CATEGORIES.find((x) => x.value === c)
  return found ? found.label : 'General'
}
