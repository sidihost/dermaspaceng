// ---------------------------------------------------------------------------
// components/blog/post-card.tsx
//
// Reusable card used on the blog index, category pages and the related-posts
// rail. Renders a 16:9 cover image, category chip, title, excerpt and meta.
//
// The whole card is one anchor so taps anywhere navigate — important on
// mobile where the user expects "tap card => open post".
// ---------------------------------------------------------------------------

import Link from 'next/link'
import Image from 'next/image'
import { Clock, User as UserIcon } from 'lucide-react'
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
      className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-lg hover:shadow-[#7B2D8E]/5 transition-all"
    >
      {post.cover_image_url && (
        <div className={`relative w-full ${featured ? 'aspect-[16/9]' : 'aspect-[16/10]'} bg-gray-100`}>
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 768px"
          />
          {post.featured && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#7B2D8E] text-white text-[10px] font-semibold uppercase tracking-wide">
              Featured
            </span>
          )}
        </div>
      )}
      <div className="p-4 sm:p-5">
        {post.category_name && (
          <span
            className="inline-block text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: post.category_accent || '#7B2D8E' }}
          >
            {post.category_name}
          </span>
        )}
        <h2
          className={`font-semibold text-gray-900 leading-snug text-balance group-hover:text-[#7B2D8E] transition-colors ${
            featured ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
          }`}
        >
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-2 text-pretty">
            {post.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <UserIcon className="w-3 h-3" aria-hidden />
            {post.author_name ?? 'Dermaspace'}
          </span>
          <span aria-hidden>·</span>
          <span>{formatDate(post.published_at)}</span>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden />
            {post.reading_minutes} min read
          </span>
        </div>
      </div>
    </Link>
  )
}
