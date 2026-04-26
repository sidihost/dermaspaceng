'use client'

// ---------------------------------------------------------------------------
// SemanticServiceSearch
//
// Lives at the top of the /services page (and is reusable elsewhere).
// Lets a visitor describe their concern in their own words — "I get
// breakouts before my period", "looking for something relaxing for my
// back", "any tips for melasma?" — and surfaces the best-matching
// treatments, category pages, and blog articles using Upstash Vector
// (bge-m3 embeddings) via /api/search/semantic.
//
// Why a dedicated UI surface
// --------------------------
// The existing /services index is structured around our four top-level
// categories. That works for shoppers who already know they want a
// facial / massage / mani-pedi / wax — but the most under-served visitor
// is the one who's browsing by problem, not category. Semantic search
// fixes exactly that gap.
//
// Behaviour
// ---------
// * Debounced typing (300ms) so each keystroke doesn't hammer Upstash.
// * Empty / very-short queries (< 2 chars) just clear the panel — no
//   request, no spinner.
// * Errors degrade silently to "no matches yet" — semantic search must
//   never block a visitor from getting to /services.
// * Results show the matched type as a chip (Treatment / Category / Tip)
//   so users understand at a glance what they're tapping into.
//
// Accessibility
// -------------
// * Plain <input type="search"> with proper label + aria-describedby.
// * Result list is a real <ul role="listbox"> so screen readers can
//   navigate the matches as a single group.
// * The chips inside each row are decorative and aria-hidden — the
//   surrounding link's text already carries the meaning.
// ---------------------------------------------------------------------------

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, ArrowUpRight, Loader2, X } from 'lucide-react'
import { DermaAIMark } from '@/components/shared/derma-ai-mark'

interface SemanticHit {
  kind: 'service' | 'service-category' | 'blog' | 'faq'
  title: string
  summary: string | null
  url: string
  score: number
  tags: string[]
  priceFrom: string | null
  duration: string | null
}

const KIND_LABEL: Record<SemanticHit['kind'], string> = {
  service: 'Treatment',
  'service-category': 'Category',
  blog: 'Tip',
  faq: 'FAQ',
}

const SUGGESTED_QUERIES = [
  'Help with melasma',
  'Bridal glow in 6 weeks',
  'Stress + back pain',
  'Acne before my period',
] as const

export default function SemanticServiceSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticHit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputId = useId()
  const helpId = useId()
  // Track the latest in-flight request so an out-of-order response (a
  // slow request landing after a newer one) can't overwrite the fresh
  // results. Compares timestamps in ms — good enough granularity for
  // human typing speed.
  const latestRequestRef = useRef(0)

  const trimmed = query.trim()

  // Debounced search. We don't fire until the user stops typing for
  // 300ms — enough to feel snappy, not so long that the UI feels
  // sluggish.
  useEffect(() => {
    if (trimmed.length < 2) {
      setResults(null)
      setHasSearched(false)
      setLoading(false)
      return
    }

    const requestId = Date.now()
    latestRequestRef.current = requestId
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmed,
            limit: 8,
            // Search the whole knowledge surface — treatments,
            // categories, AND blog tips — so a query like "what
            // helps with melasma?" can return both a Vitamin C
            // Facial AND the related blog article, side by side.
            kinds: ['service', 'service-category', 'blog'],
          }),
        })
        if (!res.ok) throw new Error('search failed')
        const data = (await res.json()) as { results?: SemanticHit[] }
        // Drop late responses — only the latest request gets to render.
        if (latestRequestRef.current !== requestId) return
        setResults(data.results ?? [])
        setHasSearched(true)
      } catch {
        if (latestRequestRef.current !== requestId) return
        setResults([])
        setHasSearched(true)
      } finally {
        if (latestRequestRef.current === requestId) {
          setLoading(false)
        }
      }
    }, 300)

    return () => {
      clearTimeout(handle)
    }
  }, [trimmed])

  const showResults = hasSearched && trimmed.length >= 2
  const empty = useMemo(
    () => showResults && !loading && (results?.length ?? 0) === 0,
    [showResults, loading, results],
  )

  return (
    <section
      aria-labelledby={`${inputId}-label`}
      className="bg-white border-y border-gray-100"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-semibold tracking-wide mb-3">
            <DermaAIMark className="w-3.5 h-3.5" />
            <span>Find by concern, not category</span>
          </div>
          <h2
            id={`${inputId}-label`}
            className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-2"
          >
            What can we help with?
          </h2>
          <p
            id={helpId}
            className="text-sm md:text-base text-gray-600 max-w-xl mx-auto"
          >
            {'Describe your skin or self-care goal in your own words. We&apos;ll match it to the right treatment or read.'.replace(
              '&apos;',
              "'",
            )}
          </p>
        </div>

        {/* Search input — pill shape, brand purple focus ring. */}
        <div className="relative max-w-2xl mx-auto">
          <label htmlFor={inputId} className="sr-only">
            Describe your concern
          </label>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full shadow-sm focus-within:border-[#7B2D8E]/40 focus-within:ring-2 focus-within:ring-[#7B2D8E]/15 transition-colors">
            <span className="pl-5 text-gray-400" aria-hidden="true">
              <Search className="w-5 h-5" />
            </span>
            <input
              id={inputId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. dry patches before my wedding"
              aria-describedby={helpId}
              autoComplete="off"
              spellCheck="false"
              className="flex-1 bg-transparent py-3.5 md:py-4 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none"
            />
            {trimmed.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="mr-2 inline-flex w-8 h-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span
              aria-hidden="true"
              className="hidden md:flex items-center gap-1.5 mr-3 text-[10.5px] font-medium uppercase tracking-wider text-[#7B2D8E]/70"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <DermaAIMark className="w-3 h-3" />
              )}
              {loading ? 'Searching' : 'Derma AI search'}
            </span>
          </div>

          {/* Suggested chips — give people something to tap so the
              feature isn't a blank stare. We hide them once the user
              has typed anything. */}
          {trimmed.length === 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUERIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[12.5px] font-medium text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results panel */}
        {showResults && (
          <div className="mt-6 md:mt-8 max-w-2xl mx-auto">
            {loading && (results?.length ?? 0) === 0 && (
              <div
                className="flex items-center justify-center gap-2 py-6 text-[#7B2D8E]/80 text-sm"
                aria-live="polite"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading the catalog…
              </div>
            )}

            {empty && (
              <p
                className="text-center text-sm text-gray-500 py-6"
                aria-live="polite"
              >
                No matches yet. Try rephrasing — or browse the categories below.
              </p>
            )}

            {!empty && (results?.length ?? 0) > 0 && (
              <ul
                role="listbox"
                aria-label="Matching treatments and articles"
                className="space-y-2"
              >
                {results!.map((r) => (
                  <li key={`${r.kind}:${r.url}`} role="option" aria-selected={false}>
                    <Link
                      href={r.url}
                      className="group flex items-start gap-3 p-3 md:p-4 bg-white border border-gray-200 rounded-2xl hover:border-[#7B2D8E]/40 hover:shadow-md hover:shadow-[#7B2D8E]/5 transition-all"
                    >
                      {/* Kind chip — the colour stays inside the
                          brand palette regardless of which type was
                          matched. */}
                      <span
                        aria-hidden="true"
                        className="flex-shrink-0 inline-flex items-center justify-center px-2 py-0.5 mt-0.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[10.5px] font-semibold uppercase tracking-wider"
                      >
                        {KIND_LABEL[r.kind]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors leading-snug">
                          {r.title}
                        </p>
                        {r.summary && (
                          <p className="mt-1 text-[12.5px] text-gray-600 leading-relaxed line-clamp-2">
                            {r.summary}
                          </p>
                        )}
                        {(r.priceFrom || r.duration) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-gray-500">
                            {r.priceFrom && (
                              <span>
                                From{' '}
                                <span className="font-semibold text-[#7B2D8E]">
                                  {r.priceFrom}
                                </span>
                              </span>
                            )}
                            {r.duration && <span>{r.duration}</span>}
                          </div>
                        )}
                      </div>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
