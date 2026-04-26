// ---------------------------------------------------------------------------
// app/blog/[slug]/page.tsx
//
// Single blog post. Server-rendered for SEO with full Article JSON-LD,
// canonical URL, OG tags and per-post meta-description override.
//
// Notes:
//   * Markdown -> HTML happens on the server with `lib/markdown.ts` (no
//     client-side markdown bundle ships).
//   * View count is incremented in a fire-and-forget call so a slow update
//     doesn't block render.
//   * 404 returns a real Next.js notFound() so search engines don't index
//     missing slugs.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Clock, User as UserIcon, ArrowLeft, Share2 } from 'lucide-react'
import { BlogShell } from '@/components/blog/blog-shell'
import { PostCard } from '@/components/blog/post-card'
import {
  getPostBySlug,
  getRelatedPosts,
  incrementViewCount,
} from '@/lib/blog'
import { markdownToHtml, stripMarkdown } from '@/lib/markdown'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Per-post metadata. Falls back to title+excerpt when SEO overrides aren't set.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post || post.status !== 'published') {
    return { title: 'Post not found' }
  }
  const desc = post.seo_description || post.excerpt || stripMarkdown(post.content_md, 160)
  const title = post.seo_title || post.title
  const canonical = `https://dermaspaceng.com/blog/${post.slug}`
  return {
    title,
    description: desc,
    keywords: post.seo_keywords ?? undefined,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title,
      description: desc,
      url: canonical,
      siteName: 'Dermaspace Esthetic & Wellness Centre',
      publishedTime: post.published_at?.toString(),
      modifiedTime: post.updated_at?.toString(),
      authors: post.author_name ? [post.author_name] : undefined,
      images: post.cover_image_url
        ? [{ url: post.cover_image_url, width: 1200, height: 630, alt: post.cover_image_alt ?? post.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      site: '@DermaspaceN',
      creator: '@DermaspaceN',
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
    },
  }
}

function formatDate(d: Date | string | null) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post || post.status !== 'published') notFound()

  const related = await getRelatedPosts(post, 3)
  // Fire and forget — never await this.
  incrementViewCount(post.id).catch(() => {})

  const html = markdownToHtml(post.content_md)
  const desc = post.seo_description || post.excerpt || stripMarkdown(post.content_md, 160)

  // Article JSON-LD — gives Google authorship, dates, image and the
  // canonical URL for rich-result eligibility.
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': post.schema_type || 'Article',
    headline: post.title,
    description: desc,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author_name ?? 'Dermaspace Editorial',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Dermaspace Esthetic & Wellness Centre',
      logo: {
        '@type': 'ImageObject',
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://dermaspaceng.com/blog/${post.slug}`,
    },
    keywords: post.seo_keywords?.join(', '),
  }

  return (
    <BlogShell crumbs={[{ label: post.title }]}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article>
        <header className="mb-6">
          {post.category_name && (
            <Link
              href={`/blog?category=${post.category_slug}`}
              className="inline-block text-[11px] font-semibold uppercase tracking-[0.18em] mb-3 hover:underline"
              style={{ color: post.category_accent || '#7B2D8E' }}
            >
              {post.category_name}
            </Link>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed text-pretty">
              {post.excerpt}
            </p>
          )}

          <div className="mt-5 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" aria-hidden />
              {post.author_name ?? 'Dermaspace Editorial'}
            </span>
            <span aria-hidden>·</span>
            <span>{formatDate(post.published_at)}</span>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {post.reading_minutes} min read
            </span>
          </div>
        </header>

        {post.cover_image_url && (
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 mb-6">
            <Image
              src={post.cover_image_url}
              alt={post.cover_image_alt ?? post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        {/* The prose container styles every tag rendered by lib/markdown.
            We keep it scoped to .blog-prose so we don't accidentally restyle
            anything outside the article body. */}
        <div
          className="blog-prose"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#7B2D8E] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Journal
          </Link>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(post.title + ' — https://dermaspaceng.com/blog/' + post.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#7B2D8E]"
          >
            <Share2 className="w-4 h-4" />
            Share on WhatsApp
          </a>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Continue reading</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {related.map((r) => (
              <PostCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}

      {/* CTA card — every article ends with a clear next step into the
          booking funnel; this is the SEO pay-off of the entire blog. */}
      <section className="mt-12 bg-[#7B2D8E] rounded-2xl p-6 sm:p-8 text-white">
        <h2 className="text-xl sm:text-2xl font-bold text-balance">Ready to book?</h2>
        <p className="mt-2 text-sm text-white/80 leading-relaxed text-pretty">
          Try Derma AI for an instant treatment recommendation, or book directly with a Dermaspace
          therapist in Victoria Island or Ikoyi.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/derma-ai"
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-white text-[#7B2D8E] text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Try Derma AI
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[#5A1D6A] text-white text-sm font-semibold hover:bg-[#491657] transition-colors"
          >
            Book a treatment
          </Link>
        </div>
      </section>
    </BlogShell>
  )
}
