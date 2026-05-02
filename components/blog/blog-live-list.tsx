// ---------------------------------------------------------------------------
// components/blog/blog-live-list.tsx
//
// Live, type-as-you-go search for the blog index.
//
// Why a client island?
// --------------------
// The blog index used to wrap its search field in `<form method="get">`,
// which meant the user had to press Enter / tap "Search" before any
// filtering happened — every keystroke was wasted until they submitted.
// The team wanted Stripe / Linear-style instant filtering.
//
// We solve it with a thin client island that:
//   * Owns the search input state in `useState`, so filtering happens on
//     every keystroke (no submit, no round-trip).
//   * Filters the server-supplied `posts` array locally across title +
//     excerpt + category + author. The server still hands us the full
//     30-post category page on first paint, so SEO and the cold cache
//     remain identical to before — we just add an instant client filter
//     on top.
//   * Mirrors the query into the URL via `router.replace` with a 300 ms
//     debounce, so refresh and shared links keep the user's search
//     without ever submitting.
//   * Drops the visible "Search" submit button (it served no purpose
//     once typing itself filters) and replaces it with a clear ✕ button
//     that appears as soon as the user has typed anything.
// ---------------------------------------------------------------------------

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, BookOpen, X } from 'lucide-react'
import type { BlogCategory, BlogPost } from '@/lib/blog'
import { PostCard } from './post-card'

interface Props {
  /** Posts already filtered by category on the server (if any). The
   *  client further narrows this list as the user types — we never
   *  filter on the server for `q` anymore, because that would force
   *  the page to re-render on every keystroke. */
  posts: BlogPost[]
  categories: BlogCategory[]
  /** Current category slug from `?category=` (still server-routed —
   *  switching category fetches a different post set, so it's a
   *  proper navigation rather than an in-memory filter). */
  categorySlug?: string
  /** `?q=` value that landed with the page. We hydrate the input with
   *  it so deep-linked / refreshed searches start with the same query
   *  the user shared. */
  initialQuery?: string
}

export function BlogLiveList({
  posts,
  categories,
  categorySlug,
  initialQuery = '',
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  // Keep the URL `?q=` in sync with the live input — debounced so we
  // don't push a history entry per keystroke, and we never re-trigger
  // the server fetch path (the server doesn't filter on `q` anymore;
  // this is purely so refresh + share-link round-trip the query).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (categorySlug) params.set('category', categorySlug)
      const qs = params.toString()
      router.replace(qs ? `/blog?${qs}` : '/blog', { scroll: false })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, categorySlug, router])

  // In-memory filter — title / excerpt / category / author. Lower-cased
  // once per query change via useMemo so a long type session doesn't
  // re-walk the array harder than it has to.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((p) => {
      const hay = [p.title, p.excerpt, p.category_name, p.author_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [posts, query])

  // Featured = the post with `featured = true`, falling back to the
  // newest. Computed off the *filtered* list so the hero card is also
  // a live result, not a stale pin.
  const featured = filtered.find((p) => p.featured) ?? filtered[0]
  const rest = filtered.filter((p) => p.id !== featured?.id)

  const trimmedQuery = query.trim()

  return (
    <>
      <div className="mb-5 space-y-2.5">
        {/* Search input — `<div>` instead of `<form>` because there's
            nothing to submit. Pressing Enter does nothing destructive
            (the `enterKeyHint=search` keeps the keyboard cosmetics
            right on mobile). Escape clears in one tap. */}
        <div
          role="search"
          className="flex items-center gap-2 bg-gray-50 rounded-full pl-3.5 pr-1.5 py-1 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7B2D8E]/25 transition"
        >
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden />
          <input
            type="text"
            role="searchbox"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault()
                setQuery('')
              }
            }}
            placeholder="Search the journal"
            className="flex-1 bg-transparent outline-none text-[13px] text-gray-900 placeholder:text-gray-400 py-1.5 min-w-0"
            aria-label="Search posts"
            aria-controls="blog-live-results"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-[#7B2D8E] hover:bg-gray-100 transition flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category chips — these still navigate (different post set
            comes from the server) so they remain Links rather than
            in-memory toggles. */}
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 sm:-mx-0 sm:px-0 scrollbar-none">
          <Link
            href="/blog"
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[11.5px] font-semibold transition ${
              !categorySlug
                ? 'bg-[#7B2D8E] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-[#7B2D8E]/[0.08] hover:text-[#7B2D8E]'
            }`}
          >
            All posts
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/blog?category=${c.slug}`}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11.5px] font-semibold transition ${
                categorySlug === c.slug
                  ? 'bg-[#7B2D8E] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-[#7B2D8E]/[0.08] hover:text-[#7B2D8E]'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* Live result count — only renders while the user has typed
            something, so the static index isn't crowded with chrome.
            `aria-live=polite` so screen readers hear the new count
            after each filter pass without interrupting typing. */}
        {trimmedQuery && (
          <p aria-live="polite" className="text-[11px] text-gray-500">
            {filtered.length === 0 ? (
              <>
                No matches for{' '}
                <span className="font-medium text-gray-700">&ldquo;{trimmedQuery}&rdquo;</span>
              </>
            ) : (
              <>
                {filtered.length}{' '}
                {filtered.length === 1 ? 'result' : 'results'} for{' '}
                <span className="font-medium text-gray-700">&ldquo;{trimmedQuery}&rdquo;</span>
              </>
            )}
          </p>
        )}
      </div>

      <div id="blog-live-results">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#7B2D8E] text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5" aria-hidden />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-gray-900">
              {trimmedQuery ? 'No matches' : 'No posts found'}
            </h2>
            <p className="mt-1 text-[12.5px] text-gray-500 max-w-sm mx-auto">
              {trimmedQuery
                ? `Nothing matches "${trimmedQuery}" — try a broader term or clear the search.`
                : 'Check back soon — new posts are on the way.'}
            </p>
            {trimmedQuery ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-3 inline-block text-[12.5px] font-semibold text-[#7B2D8E] hover:underline"
              >
                Clear search →
              </button>
            ) : categorySlug ? (
              <Link
                href="/blog"
                className="mt-3 inline-block text-[12.5px] font-semibold text-[#7B2D8E] hover:underline"
              >
                Browse all posts →
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            {featured && (
              <section className="mb-6">
                <PostCard post={featured} featured />
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    {trimmedQuery ? 'More matches' : 'Latest'}
                  </h2>
                  <span className="text-[10.5px] text-gray-400">
                    {rest.length} {rest.length === 1 ? 'story' : 'stories'}
                  </span>
                </div>
                <div>
                  {rest.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}
