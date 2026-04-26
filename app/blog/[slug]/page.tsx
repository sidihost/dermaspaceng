// ---------------------------------------------------------------------------
// app/blog/[slug]/page.tsx
//
// Single blog post. Server-rendered for SEO with full Article JSON-LD,
// canonical URL, OG tags and per-post meta-description override.
//
// Visual goal
// -----------
// The previous detail page led with an enormous `text-3xl sm:text-4xl`
// sans headline that dominated the viewport before the reader saw a
// single sentence. The new layout is editorial:
//
//   1. Compact eyebrow (category)
//   2. Serif (Playfair) headline at a sensible mobile size
//   3. Tight, balanced dek
//   4. Author byline with avatar circle + meta
//   5. Cover image as a calm hero
//   6. Article body (`.blog-prose`) — unchanged styling, just better setup
//   7. Share row + CTA + related rail
//
// Reading progress — a 2px brand-purple bar fixed to the top of the
// viewport gives the reader a "how far am I" affordance without sticky
// chrome (see components/blog/reading-progress.tsx).
//
// Notes
// -----
// * Markdown -> HTML happens on the server with `lib/markdown.ts` (no
//   client-side markdown bundle ships).
// * View count is incremented in a fire-and-forget call so a slow update
//   doesn't block render.
// * 404 returns a real Next.js notFound() so search engines don't index
//   missing slugs.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  Clock,
  ArrowLeft,
  ArrowUpRight,
  Share2,
  Twitter,
  Facebook,
} from 'lucide-react'
import { BlogShell } from '@/components/blog/blog-shell'
import { PostCard } from '@/components/blog/post-card'
import { ReadingProgress } from '@/components/blog/reading-progress'
import { CopyLinkButton } from '@/components/blog/copy-link-button'
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

// First two letters of the author's first/last name. Used as the
// fallback when we don't have an `author_avatar_url` — keeps the
// byline consistent regardless of profile completeness.
function authorInitials(name: string | null) {
  if (!name) return 'DS'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase().slice(0, 2) || 'DS'
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
  const shareUrl = `https://dermaspaceng.com/blog/${post.slug}`
  const shareText = `${post.title} — ${desc}`

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

  const authorName = post.author_name ?? 'Dermaspace Editorial'
  const initials = authorInitials(authorName)

  return (
    <BlogShell crumbs={[{ label: post.title }]}>
      <ReadingProgress />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article>
        {/* ARTICLE HEADER
            Eyebrow → headline → dek → byline. The headline is now
            serif (Playfair) at `text-[1.7rem] sm:text-[2.25rem]`,
            which reads as elegant on a phone instead of crowding the
            viewport like the previous `text-3xl sm:text-4xl` setup.
            Margins are tighter so the cover image is reachable on
            phones without a long pre-scroll. */}
        <header className="mb-6">
          {post.category_name && (
            <Link
              href={`/blog?category=${post.category_slug}`}
              className="inline-block text-[10.5px] font-bold uppercase tracking-[0.22em] mb-3 hover:underline"
              style={{ color: post.category_accent || '#7B2D8E' }}
            >
              {post.category_name}
            </Link>
          )}
          <h1 className="font-serif text-[1.7rem] sm:text-[2.25rem] leading-[1.1] text-gray-900 text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-3.5 text-[15px] sm:text-[16.5px] text-gray-600 leading-relaxed text-pretty max-w-prose">
              {post.excerpt}
            </p>
          )}

          {/* Byline — author avatar circle with initials fallback,
              author name + role, then a thin separator and the
              date / reading time. Replaces the bare "icon · text · icon"
              row, which felt like footer metadata rather than an
              authored piece. */}
          <div className="mt-5 flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#7B2D8E]/10 flex items-center justify-center text-[12px] font-bold text-[#7B2D8E] flex-shrink-0">
              {post.author_avatar_url ? (
                <Image
                  src={post.author_avatar_url}
                  alt={authorName}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <span aria-hidden>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{authorName}</p>
              <p className="text-[11.5px] text-gray-500 truncate">
                {post.author_role ? `${post.author_role} · ` : ''}
                {formatDate(post.published_at)}
                <span className="mx-1.5" aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden />
                  {post.reading_minutes} min read
                </span>
              </p>
            </div>
          </div>
        </header>

        {/* COVER
            Same 16:9 aspect we had before, but with a softer rounded
            corner (`rounded-[1.25rem]`) and an explicit min-height
            placeholder colour so layout doesn't jump while the image
            decodes. */}
        {post.cover_image_url && (
          <figure className="relative w-full aspect-[16/9] rounded-[1.25rem] overflow-hidden bg-[#7B2D8E]/[0.05] mb-8">
            <Image
              src={post.cover_image_url}
              alt={post.cover_image_alt ?? post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
            {post.cover_image_alt && (
              <figcaption className="sr-only">{post.cover_image_alt}</figcaption>
            )}
          </figure>
        )}

        {/* ARTICLE BODY
            The prose container styles every tag rendered by lib/markdown.
            We keep it scoped to .blog-prose so we don't accidentally
            restyle anything outside the article body. */}
        <div
          className="blog-prose"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* SHARE ROW
            Replaces the single-button "Share on WhatsApp" with a small
            share card: WhatsApp + Twitter/X + Facebook + Copy link.
            Sits in a soft purple-tinted card so it reads as a calm
            "thanks for reading" surface rather than a footer. */}
        <div className="mt-10 rounded-2xl bg-[#7B2D8E]/[0.04] border border-[#7B2D8E]/10 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-[#7B2D8E]" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              Share this story
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-white border border-gray-200 text-[12.5px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" aria-hidden />
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-white border border-gray-200 text-[12.5px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
            >
              <Twitter className="w-3.5 h-3.5" aria-hidden />
              Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-white border border-gray-200 text-[12.5px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
            >
              <Facebook className="w-3.5 h-3.5" aria-hidden />
              Facebook
            </a>
            {/* The Copy link button uses a tiny client-side handler via
                a link to itself; we don't ship a separate component for
                it because the visual polish lives entirely in the
                anchor styling. The actual clipboard copy is handled by
                the browser's share-target fallback when JS is off. */}
            <CopyLinkButton url={shareUrl} />
          </div>
        </div>

        {/* Back link — the prior layout had this stacked into the same
            row as Share which crowded mobile. Now it lives on its own
            line under the share card with subtle styling. */}
        <div className="mt-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-600 hover:text-[#7B2D8E] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Journal
          </Link>
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-100">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-[1.25rem] text-gray-900">Continue reading</h2>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7B2D8E] hover:underline"
            >
              All posts
              <ArrowUpRight className="w-3 h-3" aria-hidden />
            </Link>
          </div>
          <div>
            {related.map((r) => (
              <PostCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}

      {/* CTA card — every article ends with a clear next step into the
          booking funnel; this is the SEO pay-off of the entire blog. */}
      <section className="mt-12 bg-[#7B2D8E] rounded-2xl p-6 sm:p-8 text-white">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-white/70 mb-2">
          Ready to glow?
        </p>
        <h2 className="font-serif text-[1.5rem] sm:text-[1.85rem] leading-[1.15] text-balance">
          Bring this routine to life with Dermaspace.
        </h2>
        <p className="mt-3 text-[14px] text-white/85 leading-relaxed text-pretty">
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


