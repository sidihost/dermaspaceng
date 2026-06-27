// ---------------------------------------------------------------------------
// components/blog/blog-personalized.tsx
//
// Logged-in-only personalization rails for the blog index. Mounts above
// the public search/list and quietly renders nothing for guests (or while
// the member has no data yet), so the public page is untouched.
//
// What it shows when signed in:
//   * A time-of-day greeting with the member's first name + a one-line
//     subtitle derived from their skin profile.
//   * "Recommended for you"  — posts matched to skin type + concerns.
//   * "Continue reading"     — their most recently opened posts.
//   * "Saved"                — posts they've hearted.
//
// Design: brand purple (#7B2D8E) + neutrals only. No gradients, no shadows,
// matching the rest of the journal. Rails are horizontal scrollers so they
// stay compact on mobile and never push the public list far down the page.
// ---------------------------------------------------------------------------

'use client'

import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Clock, BookMarked, History, Heart } from 'lucide-react'

interface CardPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image_url: string | null
  cover_image_alt: string | null
  category_name: string | null
  category_accent: string | null
  reading_minutes: number
}

interface PersonalizedResponse {
  isLoggedIn: boolean
  firstName: string | null
  greeting: string
  skinType: string | null
  concerns: string[]
  recommended: CardPost[]
  recent: CardPost[]
  saved: CardPost[]
}

const fetcher = async (url: string): Promise<PersonalizedResponse | null> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

// One compact post tile used across all three rails. Fixed width so the
// row scrolls horizontally with a consistent rhythm.
function RailCard({ post }: { post: CardPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex-shrink-0 w-[208px] rounded-xl overflow-hidden bg-white border border-gray-200 hover:border-[#7B2D8E]/40 transition-colors"
    >
      <div className="relative w-full aspect-[16/10] bg-[#7B2D8E]/[0.06]">
        {post.cover_image_url ? (
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="208px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookMarked className="w-6 h-6 text-[#7B2D8E]/30" aria-hidden />
          </div>
        )}
      </div>
      <div className="p-3">
        {post.category_name && (
          <span className="inline-block text-[9.5px] font-bold uppercase tracking-[0.16em] mb-1 text-[#7B2D8E]">
            {post.category_name}
          </span>
        )}
        <h3 className="text-[12.5px] font-semibold leading-snug text-gray-900 line-clamp-2 text-pretty group-hover:text-[#7B2D8E] transition-colors">
          {post.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1 text-[10.5px] text-gray-400">
          <Clock className="w-2.5 h-2.5" aria-hidden />
          <span>{post.reading_minutes} min read</span>
        </div>
      </div>
    </Link>
  )
}

function Rail({
  icon,
  title,
  posts,
}: {
  icon: React.ReactNode
  title: string
  posts: CardPost[]
}) {
  if (posts.length === 0) return null
  return (
    <section className="mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[#7B2D8E]" aria-hidden>
          {icon}
        </span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-700">
          {title}
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 sm:-mx-0 sm:px-0 pb-1 scrollbar-none">
        {posts.map((p) => (
          <RailCard key={`${title}-${p.id}`} post={p} />
        ))}
      </div>
    </section>
  )
}

export function BlogPersonalized() {
  const { data } = useSWR<PersonalizedResponse | null>('/api/blog/personalized', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  // Guests, loading, or errored → render nothing. The public list below
  // is the full experience for them.
  if (!data || !data.isLoggedIn) return null

  const hasAnyRail =
    data.recommended.length > 0 || data.recent.length > 0 || data.saved.length > 0

  // Build the skin-profile subtitle if we have one.
  const subtitle =
    data.skinType && data.concerns.length > 0
      ? `Hand-picked for your ${data.skinType.toLowerCase()} skin and ${data.concerns[0].toLowerCase()} goals.`
      : data.skinType
        ? `Tuned to your ${data.skinType.toLowerCase()} skin profile.`
        : data.concerns.length > 0
          ? `Focused on your ${data.concerns[0].toLowerCase()} goals.`
          : 'Your journal, tuned to what you love to read.'

  return (
    <div className="mb-7 rounded-2xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.03] p-4 sm:p-5">
      {/* Greeting */}
      <div className="flex items-center gap-2 mb-1">
        <span className="h-px w-5 bg-[#7B2D8E]" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7B2D8E]">
          For you
        </span>
      </div>
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight text-balance">
        {data.greeting}
        {data.firstName ? `, ${data.firstName}` : ''}.
      </h2>
      <p className="mt-1 mb-4 text-[12.5px] text-gray-600 leading-relaxed text-pretty">
        {subtitle}
      </p>

      {hasAnyRail ? (
        <>
          <Rail
            icon={<Star className="w-3.5 h-3.5" />}
            title="Recommended for you"
            posts={data.recommended}
          />
          <Rail
            icon={<History className="w-3.5 h-3.5" />}
            title="Continue reading"
            posts={data.recent}
          />
          <Rail
            icon={<Heart className="w-3.5 h-3.5" />}
            title="Saved"
            posts={data.saved}
          />
        </>
      ) : (
        <p className="text-[12.5px] text-gray-500 leading-relaxed">
          Start reading and saving posts and they&apos;ll show up here, tailored just for you.
        </p>
      )}
    </div>
  )
}
