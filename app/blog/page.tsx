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

      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7B2D8E] mb-2">
          Dermaspace Journal
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 text-balance leading-tight">
          Skincare, wellness & the future of the Lagos spa
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed text-pretty">
          Honest, therapist-written guides on skincare, massage, and how Dermaspace is redefining the
          spa experience in Victoria Island, Ikoyi and across Nigeria.
        </p>
      </header>

      {/* Search + category strip */}
      <form
        method="get"
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2.5 mb-4 focus-within:border-[#7B2D8E] focus-within:ring-2 focus-within:ring-[#7B2D8E]/10 transition"
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder="Search posts..."
          className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
          aria-label="Search posts"
        />
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        {(search || categorySlug) && (
          <Link
            href="/blog"
            className="text-xs text-gray-500 hover:text-[#7B2D8E] px-2"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 sm:-mx-0 sm:px-0">
        <Link
          href="/blog"
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
            !categorySlug
              ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
              : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B2D8E]/30'
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/blog?category=${c.slug}`}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              categorySlug === c.slug
                ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]'
                : 'bg-white text-gray-700 border-gray-200 hover:border-[#7B2D8E]/30'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
          <h2 className="text-base font-semibold text-gray-900 mb-1">No posts found</h2>
          <p className="text-sm text-gray-600">
            {search ? `Nothing matches "${search}".` : 'Check back soon — new posts are on the way.'}
          </p>
        </div>
      ) : (
        <>
          {featured && (
            <section className="mb-8">
              <PostCard post={featured} featured />
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">More from the journal</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
