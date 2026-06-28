// ---------------------------------------------------------------------------
// app/blog/for-you/page.tsx
//
// The member's personalized journal. Previously these rails (recommended,
// continue reading, saved) sat inline on top of the public /blog index;
// they now have their own dedicated page so the public journal stays clean
// and content-first, and the personalized space has room to breathe.
//
// The page chrome is server-rendered for layout consistency; the rails
// themselves come from the <BlogPersonalized> client island, which fetches
// the member's data and (in standalone mode) shows a sign-in CTA to guests.
// Not indexed — there's nothing here for crawlers.
// ---------------------------------------------------------------------------

import type { Metadata } from 'next'
import { BlogShell } from '@/components/blog/blog-shell'
import { BlogPersonalized } from '@/components/blog/blog-personalized'

export const metadata: Metadata = {
  title: 'For you — Dermaspace Journal',
  description: 'Your personalized Dermaspace journal: recommendations, reading history, and saved posts.',
  robots: { index: false, follow: false },
}

export default function BlogForYouPage() {
  return (
    <BlogShell crumbs={[{ label: 'For you' }]}>
      <header className="pt-1 pb-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-px w-5 bg-[#7B2D8E]" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7B2D8E]">
            For you
          </span>
        </div>
        <h1 className="text-lg font-semibold leading-tight text-gray-900 text-balance sm:text-xl">
          Your personalized journal
        </h1>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-gray-600 text-pretty">
          Recommendations tuned to your skin profile, the posts you&apos;re still reading, and
          everything you&apos;ve saved — all in one place.
        </p>
      </header>

      <BlogPersonalized standalone />
    </BlogShell>
  )
}
