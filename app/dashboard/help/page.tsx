'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { FeatureIntroModal } from '@/components/shared/feature-intro-modal'
import { useAuth } from '@/hooks/use-auth'
import {
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ExternalLink,
  BookOpen,
  Ticket,
  MapPin,
} from 'lucide-react'

// The branch map is Leaflet-based and client-only, so we load it lazily and
// disable SSR. It already owns our brand purple pins, addresses and live
// directions, so we simply embed it at a compact height inside the answer.
const InteractiveMap = dynamic(
  () => import('@/components/home/interactive-map'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center bg-secondary text-sm text-[#7B2D8E]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7B2D8E] [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7B2D8E] [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7B2D8E]" />
          Preparing the map
        </span>
      </div>
    ),
  },
)

interface HelpSource {
  title: string
  path: string
}

interface AnswerState {
  question: string
  answer: string
  sources: HelpSource[]
  showMap: boolean
}

const MAX_LEN = 90

// Render an answer line, turning inline markdown into real UI:
//   **bold**            -> <strong>
//   [label](/in-app)    -> <Link> in brand purple (for navigation)
//   [label](https://..) -> external <a>
// We only ever follow internal links the model is allowed to emit, so the
// answer can guide people straight to the right page like the reference design.
function renderInline(text: string, keyPrefix: string) {
  // Split on links first, keeping the link tokens.
  const linkParts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return linkParts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const [, label, href] = link
      const isInternal = href.startsWith('/')
      const className =
        'font-medium text-[#7B2D8E] underline-offset-2 hover:underline'
      return isInternal ? (
        <Link key={`${keyPrefix}-l${i}`} href={href} className={className}>
          {label}
        </Link>
      ) : (
        <a
          key={`${keyPrefix}-l${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {label}
        </a>
      )
    }
    // Within non-link text, render **bold** segments.
    return part.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith('**') && seg.endsWith('**') ? (
        <strong key={`${keyPrefix}-b${i}-${j}`} className="font-semibold">
          {seg.slice(2, -2)}
        </strong>
      ) : (
        <span key={`${keyPrefix}-t${i}-${j}`}>{seg}</span>
      ),
    )
  })
}

function renderAnswer(answer: string) {
  return answer.split('\n').map((line, i) => (
    <p key={i} className="leading-relaxed text-foreground [&:not(:first-child)]:mt-2">
      {renderInline(line, `p${i}`)}
    </p>
  ))
}

// Common starter questions, shown as tappable suggestions before the
// user has searched and as related questions afterwards.
const SUGGESTED_QUESTIONS = [
  'How do I reset my password?',
  'How do I fund my wallet?',
  'Can I reschedule my appointment?',
  'Where are your branches located?',
  'How do I book a consultation?',
  'How do memberships work?',
]

// For signed-in users we lead with account-oriented questions, since
// they are most likely managing an existing booking, wallet or plan.
const MEMBER_QUESTIONS = [
  'How do I reschedule my appointment?',
  'How do I fund my wallet?',
  'How do I update my profile details?',
  'How do memberships work?',
  'How do I view my booking history?',
  'How do I reset my password?',
]

export default function HelpCenterPage() {
  const { user, isAuthenticated } = useAuth()
  const firstName = user?.firstName?.trim() || ''

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnswerState | null>(null)
  const [error, setError] = useState('')
  const [showSources, setShowSources] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  async function ask(question: string) {
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setError('')
    setFeedback(null)
    setShowSources(false)
    try {
      const res = await fetch('/api/help/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Please try again.')
        setResult(null)
      } else {
        setResult({
          question: q,
          answer: data.answer,
          sources: data.sources ?? [],
          showMap: Boolean(data.showMap),
        })
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    ask(query)
  }

  function pickSuggestion(q: string) {
    setQuery(q)
    ask(q)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <FeatureIntroModal
        storageKey="help-center"
        eyebrow="Introducing"
        title="Your Help Center"
        heroIcon={BookOpen}
        features={[
          {
            icon: Search,
            title: 'Ask Anything, Anytime',
            description:
              'Type a question and get an instant, tailored answer about Dermaspace.',
          },
          {
            icon: BookOpen,
            title: 'Linked to Real Pages',
            description:
              'Every answer points you to the exact page where you can take action.',
          },
          {
            icon: ThumbsUp,
            title: 'Rate Your Answers',
            description:
              'Tell us what helped so the Help Center keeps getting better.',
          },
          {
            icon: Ticket,
            title: 'Still Stuck? Reach Us',
            description:
              'Open a support ticket and our team responds within 24-48 hours.',
          },
        ]}
        primaryLabel="Okay"
        learnMoreLabel="Contact our support team"
        learnMoreHref="/dashboard/support"
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-6">
        {/* Back link */}
        <Link
          href="/dashboard/support"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Help Center
        </Link>

        <h1 className="mb-2 text-balance font-sans text-3xl font-bold tracking-tight text-foreground">
          {firstName ? `How can we help, ${firstName}?` : 'How can we help?'}
        </h1>
        <p className="mb-6 text-pretty text-sm leading-relaxed text-muted-foreground">
          {isAuthenticated
            ? 'Ask anything about your account, bookings, wallet or memberships — answers link straight to the right page.'
            : 'Ask anything about Dermaspace and get an instant answer linked to the right page.'}
        </p>

        {/* Search card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border-2 border-[#7B2D8E] bg-card p-4"
        >
          <div className="flex items-start gap-3">
            <Search className="mt-1 h-5 w-5 shrink-0 text-[#7B2D8E]" />
            <div className="flex-1">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, MAX_LEN))}
                placeholder="Ask a question, e.g. How do I reset my password?"
                rows={2}
                maxLength={MAX_LEN}
                className="w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Ask the Help Center a question"
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Clear question"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  ) : null}
                  <span className="text-sm text-muted-foreground">
                    {query.length}/{MAX_LEN}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="rounded-full bg-[#7B2D8E] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5A1D6A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Ask'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Error */}
        {error ? (
          <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {/* Loading */}
        {loading ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-[#7B2D8E]" />
            <span className="text-sm">Finding the best answer...</span>
          </div>
        ) : null}

        {/* AI Answer card */}
        {!loading && result ? (
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Search className="h-5 w-5 text-[#7B2D8E]" />
              <h2 className="font-medium text-foreground">AI Answer</h2>
            </div>

            <div>{renderAnswer(result.answer)}</div>

            {/* Live branch map — shown for location / directions questions.
                Reuses our brand-purple Leaflet map so people can see exactly
                where each branch is and get one-tap directions. */}
            {result.showMap ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                <InteractiveMap height="300px" />
                <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card p-3">
                  <Link
                    href="/locations"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5A1D6A]"
                  >
                    <MapPin className="h-4 w-4" />
                    Open full map
                  </Link>
                  <Link
                    href="/booking"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/10 px-4 py-2 text-sm font-medium text-[#7B2D8E] transition-colors hover:bg-[#7B2D8E]/20"
                  >
                    Book a visit
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Feedback */}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFeedback('up')}
                aria-label="This answer was helpful"
                aria-pressed={feedback === 'up'}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  feedback === 'up'
                    ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setFeedback('down')}
                aria-label="This answer was not helpful"
                aria-pressed={feedback === 'down'}
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  feedback === 'down'
                    ? 'border-[#7B2D8E] bg-[#7B2D8E] text-white'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
              {feedback ? (
                <span className="text-sm text-muted-foreground">
                  Thanks for your feedback.
                </span>
              ) : null}
            </div>

            {/* Sources */}
            {result.sources.length ? (
              <div className="mt-5 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowSources((s) => !s)}
                  className="flex items-center gap-1 font-medium text-foreground"
                  aria-expanded={showSources}
                >
                  Sources
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showSources ? 'rotate-180' : ''}`}
                  />
                </button>
                {showSources ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {result.sources.map((s) => (
                      <li key={s.path}>
                        <Link
                          href={s.path}
                          className="flex items-center gap-2 text-sm text-[#7B2D8E] hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              AI search summarizes answers to common questions about Dermaspace.
              Because it can make mistakes, use the linked pages to verify answers
              or{' '}
              <Link href="/dashboard/support" className="text-[#7B2D8E] hover:underline">
                contact our team
              </Link>
              .
            </p>
          </section>
        ) : null}

        {/* Suggested / related questions */}
        <section className="mt-6">
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {result
              ? 'Related questions'
              : isAuthenticated
                ? 'Questions for your account'
                : 'Popular questions'}
          </h3>
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {(isAuthenticated ? MEMBER_QUESTIONS : SUGGESTED_QUESTIONS)
              .filter((q) => q !== result?.question)
              .map((q) => (
              <li key={q} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => pickSuggestion(q)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary"
                >
                  <span className="text-foreground">{q}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  )
}
