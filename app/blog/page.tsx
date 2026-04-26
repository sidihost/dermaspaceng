// ---------------------------------------------------------------------------
// app/blog/page.tsx
//
// Public blog index. Server-rendered for SEO, listing all published posts
// newest-first with a featured hero, category strip and search.
//
// Visual goal
// -----------
// User feedback was that the previous Playfair-led design felt "big" and
// like a different app. The journal now lives at *dashboard scale* — same
// `font-sans` (Lexend Deca), same heading sizes (`text-base`/`text-lg`),
// and the same compact spacing we use across the rest of the product. No
// serif, no oversized hero typography. The only colour accent is brand
// purple.
//
// Why server-rendered?
//   * Crawlers see the full title + excerpt + cover for every post on first
//     paint. No CSR-only loading state can ever block discovery.
//   * Pulls categories and posts in parallel so cold TTFB stays under the
//     Lagos-mobile budget.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, BookOpen, Sparkles } from 'lucide-react'
import { BlogShell } from '@/components/blog/blog-shell'
import { PostCard } from '@/components/blog/post-card'
import { getCategories, getPublishedPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Dermaspace Journal — Skincare, Wellness & Spa Insights from Lagos',
  description:
    'Expert skincare, wellness, and spa guidance from Dermaspace — Lagos & Nigeria. Read about Derma AI, climate-aware skincare routines, and how Dermaspace compares to other luxury spas in Victoria Island and Ikoyi.',
  alternates: { canonical: 'https://dermaspaceng.com/blog' },
  openGraph: {
    title: 'Dermaspace Journal — Skincare, Wellness & Spa Insights',
    description: 'Skincare and wellness guidance from Nigeria\'s first AI-powered luxury spa.',
    url: 'https://dermaspaceng.com/blog',
    type: 'website',
  },
}

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string }>
}

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const search = sp.q?.trim() || undefined
  const categorySlug = sp.category || undefined

  // Fetch in parallel — categories rarely change but the cost is the same.
  const [categories, posts] = await Promise.all([
    getCategories(),
    getPublishedPosts({ limit: 30, search, categorySlug }),
  ])

  // Featured = first post that has `featured = true`, otherwise just the
  // newest one. Either way the hero is always populated.
  const featured = posts.find((p) => p.featured) ?? posts[0]
  const rest = posts.filter((p) => p.id !== featured?.id)

  // Active category meta (for the contextual subtitle when one is selected).
  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : undefined

  // JSON-LD: a Blog with an itemList helps Google understand this is a
  // content hub, not a product listing.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Dermaspace Journal',
    url: 'https://dermaspaceng.com/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Dermaspace Esthetic & Wellness Centre',
      url: 'https://dermaspaceng.com',
    },
    blogPost: posts.slice(0, 10).map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `https://dermaspaceng.com/blog/${p.slug}`,
      datePublished: p.published_at,
      author: { '@type': 'Person', name: p.author_name ?? 'Dermaspace' },
    })),
  }

  return (
    <BlogShell>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header — dashboard scale.
          h1 sits at `text-lg` on mobile / `text-xl` on desktop, the
          same size used by every other dashboard surface. The eyebrow
          gives the section identity without needing oversized type. */}
      <header className="pt-1 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7B2D8E]">
            Dermaspace Journal
          </span>
        </div>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight text-balance">
          {activeCategory ? activeCategory.name : 'Skincare, wellness, and life at Dermaspace.'}
        </h1>
        <p className="mt-1.5 text-[13px] text-gray-600 leading-relaxed text-pretty max-w-xl">
          {activeCategory?.description ||
            'Climate-aware routines, treatment deep-dives, and stories from our Victoria Island and Ikoyi studios.'}
        </p>
      </header>

      {/* Search + category controls
          Stacked on mobile so the search field gets full width, then
          the category chips scroll horizontally beneath. Both share
          the same purple-tinted resting state — no boxes, no shadows. */}
      <div className="mb-5 space-y-2.5">
        <form
          method="get"
          className="flex items-center gap-2 bg-gray-50 rounded-full pl-3.5 pr-1.5 py-1 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7B2D8E]/25 transition"
        >
          <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden />
          <input
            // `type="text"` (not `search`) so browsers don't render
            // their own native blue clear button next to ours.
            type="text"
            role="searchbox"
            name="q"
            inputMode="search"
            enterKeyHint="search"
            defaultValue={search ?? ''}
            placeholder="Search the journal"
            className="flex-1 bg-transparent outline-none text-[13px] text-gray-900 placeholder:text-gray-400 py-1.5 min-w-0"
            aria-label="Search posts"
          />
          {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
          {(search || categorySlug) && (
            <Link
              href="/blog"
              className="text-[11px] font-medium text-gray-500 hover:text-[#7B2D8E] px-1.5 flex-shrink-0"
            >
              Clear
            </Link>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center h-7 px-3 rounded-full bg-[#7B2D8E] text-white text-[11.5px] font-semibold hover:bg-[#6A1F7C] transition-colors flex-shrink-0"
          >
            Search
          </button>
        </form>

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
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#7B2D8E]/[0.08] flex items-center justify-center text-[#7B2D8E]">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="mt-3 text-sm font-semibold text-gray-900">No posts found</h2>
          <p className="mt-1 text-[12.5px] text-gray-500 max-w-sm mx-auto">
            {search
              ? `Nothing matches "${search}" yet — try a broader term, or clear filters.`
              : 'Check back soon — new posts are on the way.'}
          </p>
          {(search || categorySlug) && (
            <Link
              href="/blog"
              className="mt-3 inline-block text-[12.5px] font-semibold text-[#7B2D8E] hover:underline"
            >
              Browse all posts →
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Featured hero — large card with cover image. Spaced from
              the controls so it reads as the "lead" piece. */}
          {featured && (
            <section className="mb-6">
              <PostCard post={featured} featured />
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Latest
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
    </BlogShell>
  )
}
