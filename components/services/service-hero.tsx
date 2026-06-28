'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useUserPersonalization } from '@/hooks/use-user-personalization'

interface ServiceHeroProps {
  /** Small uppercase category label shown in the pill, e.g. "Wellness". */
  category: string
  /** Main page title, e.g. "Body Treatments". */
  title: string
  /** Default subtitle shown to guests (and to members with no preferences). */
  subtitle: string
}

/**
 * Shared hero for the static sub-service pages (Body Treatments, Facial
 * Treatments, Nail Care, Waxing).
 *
 * Why this exists:
 *  - The old per-page hero placed the "Back to Services" link and the
 *    category pill as two `inline-flex` siblings inside a `text-center`
 *    block. Both are inline-level, so on narrow screens they flowed onto
 *    the SAME line and collided (visible on mobile). Here each row is a
 *    proper block, so they always stack cleanly.
 *  - It adds light personalization for signed-in members: a time-of-day
 *    greeting eyebrow and a subtitle tailored to their skin profile,
 *    without changing anything for guests / SEO crawlers.
 *
 * Strictly brand purple (#7B2D8E) + white. No gradients, no shadows.
 */
export function ServiceHero({ category, title, subtitle }: ServiceHeroProps) {
  const { isLoggedIn, user, preferences } = useUserPersonalization()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Members with a saved skin profile get a subtitle tuned to them; everyone
  // else sees the page's default copy.
  const personalizedSubtitle = (() => {
    if (!isLoggedIn || !preferences) return subtitle
    const skin = preferences.skinType?.trim().toLowerCase()
    const concern = preferences.concerns?.[0]?.trim().toLowerCase()
    if (skin && concern) return `Tailored for your ${skin} skin and ${concern} goals.`
    if (skin) return `Hand-picked for your ${skin} skin.`
    if (concern) return `Focused on your ${concern} goals.`
    return subtitle
  })()

  return (
    <section className="relative overflow-hidden bg-[#7B2D8E] py-12 sm:py-16 md:py-20">
      {/* Decorative circles (purely visual) */}
      <div className="pointer-events-none absolute top-0 right-0 h-48 w-48 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/5 sm:h-64 sm:w-64" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 translate-y-1/2 -translate-x-1/2 rounded-full bg-white/5 sm:h-48 sm:w-48" aria-hidden />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
        {/* Back link — its own row so it never collides with the pill */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/services"
            className="group inline-flex items-center gap-2 text-sm text-white/90 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Services
          </Link>
        </div>

        {/* Centered headline block */}
        <div className="text-center">
          {/* Personalized greeting eyebrow (members only) */}
          {isLoggedIn && user && (
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
              {greeting}, {user.firstName}
            </p>
          )}

          {/* Category pill */}
          <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5">
            <span className="text-[11px] font-medium uppercase tracking-widest text-white sm:text-xs">
              {category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-pretty text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {title}
          </h1>

          {/* Curved underline */}
          <svg className="mx-auto my-4" width="120" height="8" viewBox="0 0 120 8" fill="none" aria-hidden>
            <path d="M2 6C30 2 90 2 118 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
          </svg>

          {/* Subtitle (personalized for members with a skin profile) */}
          <p className="mx-auto max-w-md text-pretty text-sm text-white/80 sm:text-base">
            {personalizedSubtitle}
          </p>

          {/* Decorative divider */}
          <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
            <div className="h-0.5 w-8 bg-white/30" />
            <div className="h-2 w-2 rounded-full bg-white/50" />
            <div className="h-0.5 w-8 bg-white/30" />
          </div>
        </div>
      </div>
    </section>
  )
}
