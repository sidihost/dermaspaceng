// ---------------------------------------------------------------------------
// components/blog/post-card.tsx
//
// Reusable card used on the blog index, category pages and the related-posts
// rail. We support two visual variants:
//
//   featured  — full-width hero card with a cover image and a serif headline
//               overlay. Reserved for the top slot on /blog so the page has
//               an editorial "wow" moment without resorting to gradients or
//               decorative SVG.
//   compact   — a clean horizontal row with a small 96px cover thumbnail
//               on the right (when one exists), a serif title, and a tight
//               meta row. Falls back to a text-only row when the post has
//               no cover image, so the cards never look broken.
//
// Why we re-introduced cover imagery
// ----------------------------------
// The previous text-only design was clean but flat — users rated the index
// as "looks like an empty list". Bringing back covers (especially on the
// featured slot) gives the page the visual rhythm a spa journal needs,
// while keeping body cards small enough that they don't bloat the page on
// slow Lagos connections (next/image lazy-loads them all except the hero).
// ---------------------------------------------------------------------------

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Clock } from 'lucide-react'
import type { BlogPost } from '@/lib/blog'

function formatDate(d: Date | string | null) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  // ---------------------------------------------------------------------
  // Featured variant
  //
  // Edge-to-edge cover image on top, then a clean white block beneath it
  // with category eyebrow, serif title and meta. The whole card is one
  // anchor so taps anywhere navigate.
  // ---------------------------------------------------------------------
  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group block rounded-3xl overflow-hidden bg-white border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-[0_8px_28px_-12px_rgba(123,45,142,0.18)] transition-all"
      >
        {post.cover_image_url ? (
          <div className="relative w-full aspect-[16/10] bg-gray-100 overflow-hidden">
            <Image
              src={post.cover_image_url}
              alt={post.cover_image_alt ?? post.title}
              fill
              priority
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, 768px"
            />
            {/* Tiny "Featured" pill so the slot is legible even without
                category info. Sits on the cover, not below — keeps the
                following block focused on the title + meta. */}
            <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wider text-[#7B2D8E] shadow-sm">
              Featured
            </span>
          </div>
        ) : (
          // Fallback "tinted" block when there's no cover so featured
          // posts still feel intentional. Single-tone, no gradient.
          <div className="w-full aspect-[16/10] bg-[#7B2D8E]/[0.07] flex items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B2D8E]">
              Featured
            </span>
          </div>
        )}

        <div className="p-5 sm:p-6">
          {post.category_name && (
            <span
              className="inline-block text-[10.5px] font-bold uppercase tracking-[0.18em] mb-2.5"
              style={{ color: post.category_accent || '#7B2D8E' }}
            >
              {post.category_name}
            </span>
          )}

          <h2 className="font-serif text-[1.4rem] sm:text-[1.75rem] leading-[1.15] text-gray-900 text-balance group-hover:text-[#7B2D8E] transition-colors">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-3 text-[14px] sm:text-[15px] text-gray-600 leading-relaxed line-clamp-2 text-pretty">
              {post.excerpt}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2 text-[11.5px] text-gray-500">
            <span className="font-medium text-gray-700">
              {post.author_name ?? 'Dermaspace Editorial'}
            </span>
            <span aria-hidden>·</span>
            <span>{formatDate(post.published_at)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden />
              {post.reading_minutes} min
            </span>
          </div>
        </div>
      </Link>
    )
  }

  // ---------------------------------------------------------------------
  // Compact (default) variant
  //
  // Horizontal row: text on the left, optional 96×96 cover thumbnail on
  // the right. Uses a soft hairline divider so the list reads like a
  // journal table of contents rather than a stack of boxes.
  // ---------------------------------------------------------------------
  const hasCover = !!post.cover_image_url

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block py-5 first:pt-0 border-b border-gray-100 last:border-b-0 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          {post.category_name && (
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-[0.16em] mb-2"
              style={{ color: post.category_accent || '#7B2D8E' }}
            >
              {post.category_name}
            </span>
          )}

          <h2 className="font-serif text-[1.05rem] sm:text-[1.2rem] leading-snug text-gray-900 text-balance group-hover:text-[#7B2D8E] transition-colors">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-1.5 text-[13.5px] text-gray-600 leading-relaxed line-clamp-2 text-pretty">
              {post.excerpt}
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-gray-500">
            <span>{post.author_name ?? 'Dermaspace'}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(post.published_at)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden />
              {post.reading_minutes} min
            </span>
          </div>
        </div>

        {hasCover ? (
          // 96×96 thumb gives the row a magazine-style anchor without
          // dominating the layout. Rounded square, lazy-loaded, soft
          // hover lift on the parent rather than the image itself.
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100">
            <Image
              src={post.cover_image_url!}
              alt={post.cover_image_alt ?? post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
              sizes="96px"
            />
          </div>
        ) : (
          // No cover → a subtle arrow affordance so the row still
          // signals "tap to read".
          <ArrowUpRight
            aria-hidden
            className="w-4 h-4 mt-1 flex-shrink-0 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
          />
        )}
      </div>
    </Link>
  )
}
