// ---------------------------------------------------------------------------
// components/blog/post-card.tsx
//
// Reusable card used on the blog index, category pages and the related-posts
// rail. Renders a 16:9 cover image, category chip, title, excerpt and meta.
//
// The whole card is one anchor so taps anywhere navigate — important on
// mobile where the user expects "tap card => open post".
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PostCard — text-only, app-style.
//
// We deliberately do not show cover images here. The previous design
// rendered a 16:9 hero on every card, which made the index feel like
// a magazine and bloated the page weight on slow connections. The
// user asked for something that "looks like an app" — generous
// whitespace, brand purple as the only accent, and the words doing
// the work. Covers still appear on the article detail page where
// they belong.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { ArrowUpRight, Clock } from 'lucide-react'
import type { BlogPost } from '@/lib/blog'

function formatDate(d: Date | string | null) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block py-5 first:pt-0 last:pb-0 border-b border-gray-100 last:border-b-0 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {post.category_name && (
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#7B2D8E]">
                {post.category_name}
              </span>
            )}
            {post.featured && (
              <>
                {post.category_name && (
                  <span aria-hidden className="text-gray-300 text-[10px]">
                    ·
                  </span>
                )}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#7B2D8E]/10 text-[#7B2D8E] text-[9.5px] font-bold uppercase tracking-wider">
                  Featured
                </span>
              </>
            )}
          </div>

          <h2
            className={`font-semibold text-gray-900 leading-snug text-balance group-hover:text-[#7B2D8E] transition-colors ${
              featured ? 'text-xl sm:text-[1.55rem]' : 'text-[15.5px] sm:text-base'
            }`}
          >
            {post.title}
          </h2>

          {post.excerpt && (
            <p
              className={`mt-1.5 text-gray-600 leading-relaxed text-pretty ${
                featured ? 'text-[14px] line-clamp-3' : 'text-[13px] line-clamp-2'
              }`}
            >
              {post.excerpt}
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-gray-500">
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

        <ArrowUpRight
          aria-hidden
          className="w-4 h-4 mt-1 flex-shrink-0 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
        />
      </div>
    </Link>
  )
}
