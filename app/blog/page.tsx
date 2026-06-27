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
//
// Search
// ------
// Users used to have to submit the search form (Enter / tap "Search")
// before any filtering happened. The team flagged this and asked for
// instant, type-as-you-go results. The fetch path here still understands
// `?q=` so a deep-linked search URL works on first paint and is shareable,
// but actual filtering now happens in the `<BlogLiveList>` client island
// against the full server-rendered post set — no submit, no round-trip.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'
import { BlogShell } from '@/components/blog/blog-shell'
import { BlogLiveList } from '@/components/blog/blog-live-list'
import { BlogPersonalized } from '@/components/blog/blog-personalized'
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
  const initialQuery = sp.q?.trim() ?? ''
  const categorySlug = sp.category || undefined

  // Always fetch the full category page (or the global feed). We
  // deliberately do NOT pass `search` to the server query anymore —
  // doing so would re-render the page on every keystroke once the
  // client mirrors the query into the URL. Instead we hand all 30
  // posts to <BlogLiveList> and let it filter live in the browser.
  // Crawlers still see every post in the category on first paint,
  // which is strictly better for SEO than the previous behaviour
  // (filtered SSR meant `/blog?q=ai` exposed only the matches).
  const [categories, posts] = await Promise.all([
    getCategories(),
    getPublishedPosts({ limit: 30, categorySlug }),
  ])

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

      {/* Logged-in-only personalization rails (greeting + recommended +
          continue reading + saved). Renders nothing for guests, so the
          public/SEO experience below is unchanged. */}
      <BlogPersonalized />

      {/* Live, type-as-you-go search + results. Hydrated with the
          server's `?q=` so deep-linked searches start with the
          right filter applied. */}
      <BlogLiveList
        posts={posts}
        categories={categories}
        categorySlug={categorySlug}
        initialQuery={initialQuery}
      />
    </BlogShell>
  )
}
