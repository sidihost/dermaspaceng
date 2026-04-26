// ---------------------------------------------------------------------------
// app/blog/[slug]/page.tsx
//
// Single blog post. Server-rendered for SEO with full Article JSON-LD,
// canonical URL, OG tags and per-post meta-description override.
//
// Visual goal
// -----------
// User feedback was that the Playfair-led editorial design felt off-brand
// and "big" compared to the rest of the dashboard. The detail page now
// uses the project's primary `font-sans` (Lexend Deca) at dashboard
// scale — h1 sits at `text-lg sm:text-xl`, the dek at `text-[13px]`, and
// every interactive control (share row, CTA) shares the same chip /
// pill sizing the dashboard uses elsewhere.
//
// The byline now shows a *generated* author avatar (DiceBear notionists,
// seeded by the author's name — see `components/blog/author-avatar.tsx`)
// so each editorial author has a recognisable identity even before
// admins upload real headshots.
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
import { AuthorAvatar } from '@/components/blog/author-avatar'
import { BlogComments } from '@/components/blog/blog-comments'
import {
  getPostBySlug,
  getPublishedPosts,
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

  // Recommended rail — same-category neighbours first, but always
  // fall back to the three most recent *other* posts so the
  // "Continue reading" section is never empty (the user reported
  // they "didn't see recommended posts" because some posts have no
  // category siblings yet).
  let related = await getRelatedPosts(post, 3)
  if (related.length < 3) {
    const fillerPool = await getPublishedPosts({ limit: 6 })
    const taken = new Set([post.id, ...related.map((r) => r.id)])
    for (const p of fillerPool) {
      if (related.length >= 3) break
      if (taken.has(p.id)) continue
      related.push(p)
      taken.add(p.id)
    }
  }
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

  // Some Next.js top-level routes collide with usernames — `/admin`
  // resolves to the admin dashboard, `/blog` to the journal index,
  // and so on. Linking the byline to those paths sends the reader
  // somewhere unexpected (or 404s). We only render the profile link
  // when the username is safe.
  const RESERVED_USERNAMES = new Set([
    'admin', 'api', 'dashboard', 'settings', 'account', 'auth',
    'signin', 'signup', 'login', 'register', 'logout',
    'blog', 'services', 'service', 'book', 'booking', 'gallery',
    'about', 'contact', 'derma-ai', 'profile', 'app', 'home',
    'privacy', 'terms', 'help', 'support', 'pricing',
  ])
  const profileHref =
    post.author_username && !RESERVED_USERNAMES.has(post.author_username.toLowerCase())
      ? `/${post.author_username}`
      : null

  return (
    <BlogShell crumbs={[{ label: post.title }]}>
      <ReadingProgress />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article>
        {/* ──────────────────────────────────────────────────────────
            ARTICLE HEADER — proper editorial scale.
            Eyebrow → big headline → standfirst → cover → byline strip.

            Why everything got bigger
            -------------------------
            User feedback was that the previous layout was "jam-packed"
            and didn't feel like the kind of post Vercel themselves
            would publish. The previous header sat at 17/19px which
            reads as a card title, not an article title. New scale:
              • headline 24/32px, leading 1.15
              • dek 15/17px, leading 1.6
              • cover gains an 8/10/14px stack of breathing room
            The point is to make the top of the article feel like
            you've arrived somewhere worth reading. ────────────── */}
        <header className="mt-1 mb-5">
          {post.category_name && (
            <Link
              href={`/blog?category=${post.category_slug}`}
              className="inline-flex items-center gap-1.5 mb-3"
            >
              <span
                aria-hidden
                className="block w-1 h-3 rounded-full"
                style={{ backgroundColor: post.category_accent || '#7B2D8E' }}
              />
              <span
                className="text-[10.5px] font-bold uppercase tracking-[0.22em]"
                style={{ color: post.category_accent || '#7B2D8E' }}
              >
                {post.category_name}
              </span>
            </Link>
          )}
          <h1 className="text-[24px] sm:text-[32px] font-bold leading-[1.15] tracking-tight text-[#1a0d1f] text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-3 text-[15px] sm:text-[17px] text-[#1a0d1f]/70 leading-[1.6] text-pretty">
              {post.excerpt}
            </p>
          )}
        </header>

        {/* COVER — fully edge-to-edge inside the column with generous
            corner radius. We keep the placeholder color a *very*
            light surface (not a faded purple) so it never reads as
            grey while the image is loading. */}
        {post.cover_image_url && (
          <figure className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden bg-[#FAF6FB] mb-5">
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

        {/* BYLINE STRIP — clean, no card wrapper.
            Previously this sat inside a tinted card that read as a
            grey block on the page. Now it's a transparent row sitting
            between two hairline rules in solid brand purple, the way
            Substack / Vercel's own blog handles bylines. */}
        <div className="mb-7 py-3 border-y border-[#7B2D8E]/15">
          {profileHref ? (
            <Link
              href={profileHref}
              className="flex items-center gap-3 min-w-0 -mx-1 px-1 py-0.5 rounded-lg group"
              aria-label={`View ${authorName}'s profile`}
            >
              <AuthorAvatar
                name={authorName}
                src={post.author_avatar_url}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-[#1a0d1f] truncate group-hover:text-[#7B2D8E] transition-colors">
                  {authorName}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[#1a0d1f]/55 truncate flex items-center gap-1.5">
                  <span>{formatDate(post.published_at)}</span>
                  <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-[#1a0d1f]/30" />
                  <Clock className="w-3 h-3 text-[#7B2D8E]" aria-hidden />
                  <span className="tabular-nums">
                    {post.reading_minutes} min read
                  </span>
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <AuthorAvatar
                name={authorName}
                src={post.author_avatar_url}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-[#1a0d1f] truncate">
                  {authorName}
                </p>
                <p className="mt-0.5 text-[11.5px] text-[#1a0d1f]/55 truncate flex items-center gap-1.5">
                  <span>{formatDate(post.published_at)}</span>
                  <span aria-hidden className="w-0.5 h-0.5 rounded-full bg-[#1a0d1f]/30" />
                  <Clock className="w-3 h-3 text-[#7B2D8E]" aria-hidden />
                  <span className="tabular-nums">
                    {post.reading_minutes} min read
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ARTICLE BODY — `.blog-prose` styles every tag rendered by
            `lib/markdown.ts`. */}
        <div
          className="blog-prose"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* ──────────────────────────────────────────────────────────
            SHARE ROW — clean, no faded card.
            Title → solid brand-purple border-top rule → row of pill
            buttons that have a 1px solid purple border (not a tinted
            background). Removes the "grey card" feeling of the old
            version while keeping the same affordances. ──────── */}
        <div className="mt-10 pt-6 border-t border-[#7B2D8E]/20">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-[#7B2D8E]" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7B2D8E]">
              Share this story
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white border border-[#7B2D8E]/30 text-[12px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" aria-hidden />
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white border border-[#7B2D8E]/30 text-[12px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white transition-colors"
            >
              <Twitter className="w-3 h-3" aria-hidden />
              Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white border border-[#7B2D8E]/30 text-[12px] font-semibold text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white transition-colors"
            >
              <Facebook className="w-3 h-3" aria-hidden />
              Facebook
            </a>
            <CopyLinkButton url={shareUrl} />
          </div>
        </div>

        {/* Back link — bumped up to a real button. Solid purple,
            confident. Replaces the previous faded text link. */}
        <div className="mt-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#7B2D8E] text-white text-[12px] font-semibold hover:bg-[#6B2278] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Journal
          </Link>
        </div>
      </article>

      {/* Comments — community thread for the post. Mounted directly
          after the article so readers don't have to scroll past the
          CTA to share their thoughts. The component owns its own
          fetch + auth lifecycle (see components/blog/blog-comments.tsx). */}
      <BlogComments postId={post.id} />

      {/* Recommended posts — always renders. We populate `related`
          server-side from same-category neighbours, then top up from
          the latest published posts so this rail never appears empty.
          Heading bumped from a tiny eyebrow to a proper section title
          so readers see it as a navigational rail, not metadata. */}
      {related.length > 0 && (
        <section className="mt-12 pt-6 border-t border-[#7B2D8E]/20">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[17px] font-bold text-[#1a0d1f] tracking-tight">
              Recommended for you
            </h2>
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
          booking funnel. Compact dashboard scale, no oversized type. */}
      <section className="mt-10 bg-[#7B2D8E] rounded-2xl p-5 sm:p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 mb-1.5">
          Ready to glow?
        </p>
        <h2 className="text-base sm:text-lg font-semibold leading-snug text-balance">
          Bring this routine to life with Dermaspace.
        </h2>
        <p className="mt-1.5 text-[12.5px] text-white/85 leading-relaxed text-pretty">
          Try Derma AI for an instant treatment recommendation, or book directly with a Dermaspace
          therapist in Victoria Island or Ikoyi.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/derma-ai"
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-white text-[#7B2D8E] text-[12.5px] font-semibold hover:bg-white/90 transition-colors"
          >
            Try Derma AI
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-[#5A1D6A] text-white text-[12.5px] font-semibold hover:bg-[#491657] transition-colors"
          >
            Book a treatment
          </Link>
        </div>
      </section>
    </BlogShell>
  )
}
