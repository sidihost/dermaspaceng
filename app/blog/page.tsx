// ---------------------------------------------------------------------------
// app/blog/page.tsx
//
// Public blog index. Server-rendered for SEO, listing all published posts
// newest-first with a featured hero, category strip and search.
//
// Why server-rendered?
//   * Crawlers see the full title + excerpt + cover for every post on first
//     paint. No CSR-only loading state can ever block discovery.
//   * Pulls categories and posts in parallel so cold TTFB stays under the
//     Lagos-mobile budget.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
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

      {/* Trimmed hero. The previous version led with a giant
          marketing headline + multi-line subhead — too magazine-y
          for a blog index that's most often opened from a "back to
          journal" link inside an article. We now lead with a small
          eyebrow and a tighter title, leaving the page weight to
          the posts themselves. */}
      <header className="mb-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#7B2D8E] mb-2">
          Journal
        </p>
        <h1 className="text-2xl sm:text-[1.7rem] font-bold text-gray-900 text-balance leading-tight">
          Skincare, wellness, and life at Dermaspace.
        </h1>
      </header>

      {/* Search field — flat pill, brand purple focus. No box. */}
      <form
        method="get"
        className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2.5 mb-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7B2D8E]/25 transition"
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder="Search the journal"
          className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-400"
          aria-label="Search posts"
        />
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        {(search || categorySlug) && (
          <Link
            href="/blog"
            className="text-[11.5px] text-gray-500 hover:text-[#7B2D8E] px-1.5"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Category chips — quieter (tinted purple instead of solid
          purple/border combos) so the page is dominated by reading,
          not navigation. */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 -mx-4 px-4 sm:-mx-0 sm:px-0 scrollbar-none">
        <Link
          href="/blog"
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition ${
            !categorySlug
              ? 'bg-[#7B2D8E] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-[#7B2D8E]/[0.08] hover:text-[#7B2D8E]'
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/blog?category=${c.slug}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition ${
              categorySlug === c.slug
                ? 'bg-[#7B2D8E] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-[#7B2D8E]/[0.08] hover:text-[#7B2D8E]'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-base font-semibold text-gray-900 mb-1">No posts found</h2>
          <p className="text-sm text-gray-500">
            {search ? `Nothing matches "${search}".` : 'Check back soon — new posts are on the way.'}
          </p>
        </div>
      ) : (
        <>
          {/* Featured — stays on top, gets a touch more weight via
              the `featured` flag in PostCard, but no bordered card.
              The visual rhythm is now whitespace + dividers, not
              outlined boxes. */}
          {featured && <PostCard post={featured} featured />}

          {rest.length > 0 && (
            <section className="mt-2">
              {rest.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </section>
          )}
        </>
      )}
    </BlogShell>
  )
}
