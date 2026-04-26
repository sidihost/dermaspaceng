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
import { ArticleControls } from '@/components/blog/article-controls'
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

  return (
    <BlogShell crumbs={[{ label: post.title }]}>
      <ReadingProgress />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article>
        {/* ARTICLE HEADER — dashboard scale.
            Eyebrow → headline → dek → byline. Headline lives at
            `text-lg sm:text-xl` (same as a dashboard section title)
            instead of the previous Playfair `text-[1.7rem]+`. The
            byline keeps the generated avatar so the author identity
            still carries weight visually. */}
        <header className="mb-5">
          {post.category_name && (
            <Link
              href={`/blog?category=${post.category_slug}`}
              className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] mb-2 hover:underline"
              style={{ color: post.category_accent || '#7B2D8E' }}
            >
              {post.category_name}
            </Link>
          )}
          <h1 className="text-lg sm:text-xl font-semibold leading-snug text-gray-900 text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-2 text-[13px] sm:text-[13.5px] text-gray-600 leading-relaxed text-pretty">
              {post.excerpt}
            </p>
          )}

          {/* Byline — generated avatar + author + role + date + read
              time. When the post's author has a public username (the
              99% case — `lib/blog.ts` joins `users.username` into the
              row), the avatar + name become a single tappable link
              into the public profile page at `/[username]`. Visitors
              who want to read more from this writer can do that in
              one tap from any article. The "X min read" pill stays a
              non-interactive sibling so the link's hit target is
              the photo + name only, never the metadata. */}
          <div className="mt-4 flex items-center gap-2.5">
            {post.author_username ? (
              <Link
                href={`/${post.author_username}`}
                className="group flex items-center gap-2.5 min-w-0 flex-1 -m-1 p-1 rounded-xl hover:bg-[#7B2D8E]/[0.04] transition-colors"
                aria-label={`View ${authorName}'s profile`}
              >
                <AuthorAvatar
                  name={authorName}
                  src={post.author_avatar_url}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-[#7B2D8E] transition-colors">
                    {authorName}
                  </p>
                  <p className="text-[11.5px] text-gray-500 truncate flex items-center flex-wrap gap-x-1">
                    {post.author_role && (
                      <>
                        <span>{post.author_role}</span>
                        <span aria-hidden>·</span>
                      </>
                    )}
                    <span>@{post.author_username}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(post.published_at)}</span>
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <AuthorAvatar
                  name={authorName}
                  src={post.author_avatar_url}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">
                    {authorName}
                  </p>
                  <p className="text-[11.5px] text-gray-500 truncate flex items-center flex-wrap gap-x-1">
                    {post.author_role && (
                      <>
                        <span>{post.author_role}</span>
                        <span aria-hidden>·</span>
                      </>
                    )}
                    <span>{formatDate(post.published_at)}</span>
                  </p>
                </div>
              </div>
            )}
            <span className="inline-flex items-center gap-1 font-semibold text-[#7B2D8E] bg-[#7B2D8E]/8 px-2 py-0.5 rounded-full text-[11.5px] flex-shrink-0">
              <Clock className="w-3 h-3" aria-hidden />
              <span className="tabular-nums">
                {post.reading_minutes} min read
              </span>
            </span>
          </div>
        </header>

        {/* Reader controls — Listen (text-to-speech) + Resume reading
            (where you left off). Sticky on scroll so the reader can
            pause without scrolling back to the top. Pure client
            component; the article body still SSRs above. */}
        <ArticleControls slug={post.slug} />

        {/* COVER — slightly smaller corner radius for a more app-like
            feel, plus a placeholder bg so layout doesn't jump. */}
        {post.cover_image_url && (
          <figure className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[#7B2D8E]/[0.05] mb-6">
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

        {/* ARTICLE BODY — `.blog-prose` styles every tag rendered by
            `lib/markdown.ts`. */}
        <div
          className="blog-prose"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* SHARE ROW — soft purple-tinted card with the four share
            actions sized like dashboard chips. */}
        <div className="mt-8 rounded-2xl bg-[#7B2D8E]/[0.04] border border-[#7B2D8E]/10 p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Share2 className="w-3.5 h-3.5 text-[#7B2D8E]" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B2D8E]">
              Share this story
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-gray-200 text-[11.5px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" aria-hidden />
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-gray-200 text-[11.5px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
            >
              <Twitter className="w-3 h-3" aria-hidden />
              Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-gray-200 text-[11.5px] font-semibold text-gray-700 hover:border-[#7B2D8E]/40 hover:text-[#7B2D8E] transition-colors"
            >
              <Facebook className="w-3 h-3" aria-hidden />
              Facebook
            </a>
            <CopyLinkButton url={shareUrl} />
          </div>
        </div>

        {/* Back link */}
        <div className="mt-5">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-600 hover:text-[#7B2D8E] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
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
        <section className="mt-12 pt-6 border-t border-gray-100">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Recommended for you
            </h2>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#7B2D8E] hover:underline"
            >
              All posts
              <ArrowUpRight className="w-2.5 h-2.5" aria-hidden />
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
            className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-white text-[#7B2D8E] text-[12.5px] font-semibold hover:bg-gray-100 transition-colors"
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
