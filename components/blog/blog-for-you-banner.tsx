// ---------------------------------------------------------------------------
// components/blog/blog-for-you-banner.tsx
//
// Compact, logged-in-only entry point that sits on the public /blog index.
// The full personalization rails (recommended / continue reading / saved)
// now live on their own page at /blog/for-you — this banner is just the
// doorway to it, so the journal index stays clean and content-first.
//
// Renders nothing for guests (or while loading), keeping the public/SEO
// experience identical to before.
// ---------------------------------------------------------------------------

'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { BookMarked, ArrowRight } from 'lucide-react'

interface BannerResponse {
  isLoggedIn: boolean
  firstName: string | null
  greeting: string
  skinType: string | null
  concerns: string[]
}

const fetcher = async (url: string): Promise<BannerResponse | null> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

export function BlogForYouBanner() {
  const { data } = useSWR<BannerResponse | null>('/api/blog/personalized', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  // Guests or loading → render nothing.
  if (!data || !data.isLoggedIn) return null

  const subtitle =
    data.skinType && data.concerns.length > 0
      ? `Hand-picked for your ${data.skinType.toLowerCase()} skin and ${data.concerns[0].toLowerCase()} goals.`
      : data.skinType
        ? `Tuned to your ${data.skinType.toLowerCase()} skin profile.`
        : data.concerns.length > 0
          ? `Focused on your ${data.concerns[0].toLowerCase()} goals.`
          : 'Recommendations, your reading history, and saved posts.'

  return (
    <Link
      href="/blog/for-you"
      className="group mb-7 flex items-center gap-3 rounded-2xl border border-[#7B2D8E]/15 bg-[#7B2D8E]/[0.03] p-4 transition-colors hover:border-[#7B2D8E]/40 sm:p-5"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10">
        <BookMarked className="h-4 w-4 text-[#7B2D8E]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-900">
          {data.greeting}
          {data.firstName ? `, ${data.firstName}` : ''}.
        </p>
        <p className="mt-0.5 truncate text-[12px] text-gray-600">{subtitle}</p>
      </div>
      <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7B2D8E]">
        Your picks
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}
