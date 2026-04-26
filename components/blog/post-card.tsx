// ---------------------------------------------------------------------------
// components/blog/post-card.tsx
//
// Reusable card used on the blog index, category pages and the related-posts
// rail. We support two visual variants:
//
//   featured  — full-width hero card with a cover image and headline below.
//   compact   — a clean horizontal row with a small 80px cover thumbnail
//               on the right (when one exists). Falls back to a text-only
//               row when the post has no cover image.
//
// Typography
// ----------
// Earlier iterations leaned on Playfair Display for headlines, which made
// the index feel like a print magazine — the user said it looked "big" and
// asked for the same dashboard-scale typography we use everywhere else in
// the app. We now use the project's primary `font-sans` (Lexend Deca) at
// dashboard sizes:
//
//   featured:  text-[15.5px] sm:text-[17px]  (≈ dashboard h2)
//   compact:   text-[14.5px]                  (≈ dashboard list-row title)
//
// No serif, no `text-xl+`. The card stays calm so the cover image and the
// excerpt do the visual work.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Clock } from 'lucide-react'
import type { BlogPost } from '@/lib/blog'
import { AuthorAvatar } from './author-avatar'

function formatDate(d: Date | string | null) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  // ---------------------------------------------------------------------
  // Featured variant — cover image + compact text block. Same scale we
  // use on dashboard "section card" headers, just with a larger image.
  // ---------------------------------------------------------------------
  if (featured) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group block rounded-2xl overflow-hidden bg-white border border-gray-100 hover:border-[#7B2D8E]/30 transition-all"
      >
        {post.cover_image_url ? (
          <div className="relative w-full aspect-[16/10] bg-gray-100 overflow-hidden">
            <Image
              src={post.cover_image_url}
              alt={post.cover_image_alt ?? post.title}
              fill
              priority
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 768px"
            />
            <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wider text-[#7B2D8E]">
              Featured
            </span>
          </div>
        ) : (
          <div className="w-full aspect-[16/10] bg-[#7B2D8E]/[0.07] flex items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B2D8E]">
              Featured
            </span>
          </div>
        )}

        <div className="p-4 sm:p-5">
          {post.category_name && (
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-[0.16em] mb-2"
              style={{ color: post.category_accent || '#7B2D8E' }}
            >
              {post.category_name}
            </span>
          )}

          <h2 className="text-[15.5px] sm:text-[17px] font-semibold leading-snug text-gray-900 text-balance group-hover:text-[#7B2D8E] transition-colors">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-1.5 text-[13px] sm:text-[13.5px] text-gray-600 leading-relaxed line-clamp-2 text-pretty">
              {post.excerpt}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 text-[11.5px] text-gray-500">
            {/* Author chip — generated avatar matches the byline on
                the detail page so the author identity is consistent
                across every blog surface. */}
            <AuthorAvatar
              name={post.author_name}
              src={post.author_avatar_url}
              size={20}
            />
            <span className="font-medium text-gray-700 truncate">
              {post.author_name ?? 'Dermaspace Editorial'}
            </span>
            <span aria-hidden>·</span>
            <span className="truncate">{formatDate(post.published_at)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3" aria-hidden />
              {post.reading_minutes} min
            </span>
          </div>
        </div>
      </Link>
    )
  }

  // ---------------------------------------------------------------------
  // Compact (default) variant — horizontal row, dashboard density.
  // ---------------------------------------------------------------------
  const hasCover = !!post.cover_image_url

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block py-4 first:pt-0 border-b border-gray-100 last:border-b-0 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {post.category_name && (
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5"
              style={{ color: post.category_accent || '#7B2D8E' }}
            >
              {post.category_name}
            </span>
          )}

          <h2 className="text-[14.5px] font-semibold leading-snug text-gray-900 text-balance group-hover:text-[#7B2D8E] transition-colors">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-1 text-[12.5px] text-gray-600 leading-relaxed line-clamp-2 text-pretty">
              {post.excerpt}
            </p>
          )}

          <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-gray-500">
            <AuthorAvatar
              name={post.author_name}
              src={post.author_avatar_url}
              size={16}
            />
            <span className="truncate">{post.author_name ?? 'Dermaspace'}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{formatDate(post.published_at)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-0.5 flex-shrink-0">
              <Clock className="w-2.5 h-2.5" aria-hidden />
              {post.reading_minutes}m
            </span>
          </div>
        </div>

        {hasCover ? (
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
            <Image
              src={post.cover_image_url!}
              alt={post.cover_image_alt ?? post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
              sizes="80px"
            />
          </div>
        ) : (
          <ArrowUpRight
            aria-hidden
            className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
          />
        )}
      </div>
    </Link>
  )
}
