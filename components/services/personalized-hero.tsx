'use client'

import { Heart, User } from 'lucide-react'

interface PersonalizedHeroProps {
  isLoggedIn: boolean
  isLoading: boolean
  greeting: string
  subtitle: string
  skinType?: string
  pageType?: 'services' | 'laser'
}

export default function PersonalizedHero({
  isLoggedIn,
  isLoading,
  greeting,
  subtitle,
  skinType,
  pageType = 'services',
}: PersonalizedHeroProps) {
  const title =
    pageType === 'laser' ? 'Laser Technology' : 'Premium Spa Services'
  const defaultSubtitle =
    pageType === 'laser'
      ? 'Advanced laser treatments for lasting results'
      : 'Expertly crafted treatments to rejuvenate your body and mind'
  const guestChip = pageType === 'laser' ? 'Laser Tech' : 'Our Services'

  const showPersonalized = !isLoading && isLoggedIn

  return (
    <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
      {/* Matches the subservice hero — same outlined-ring accents so
          the two heroes feel like a pair instead of two different
          templates. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 w-56 h-56 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 right-10 w-2 h-2 bg-white/30 rounded-full hidden md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-14 left-12 w-2 h-2 bg-white/20 rounded-full hidden md:block"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Eyebrow chip — "Personalized For You" for signed-in users,
            plain category label otherwise. Heart (not Sparkles) lines
            up with the favorites + subservice heroes. */}
        {showPersonalized ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-semibold tracking-[0.15em] text-white uppercase mb-4">
            <Heart className="w-3 h-3 fill-white" aria-hidden="true" />
            Personalized For You
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold tracking-[0.15em] text-white uppercase mb-4">
            {guestChip}
          </span>
        )}

        {/* Title — uses the personalized greeting for signed-in
            users, the brand-level title otherwise. */}
        <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight text-balance">
          {showPersonalized ? greeting : title}
        </h1>

        {/* Hairline accent replaces the old hand-drawn curved SVG so
            the typography leads the composition. */}
        <div
          aria-hidden="true"
          className="mx-auto my-4 h-px w-14 bg-white/40"
        />

        <p className="text-sm md:text-base text-white/85 max-w-md mx-auto text-pretty">
          {showPersonalized ? subtitle : defaultSubtitle}
        </p>

        {/* Skin-type chip — only for logged-in users who told us
            their skin type. Kept below the description so it reads
            like an attributed detail rather than a competing
            headline. */}
        {showPersonalized && skinType && (
          <div className="mt-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/90">
              <User className="w-3 h-3 text-white/80" aria-hidden="true" />
              Skin type
              <span className="font-semibold text-white">{skinType}</span>
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
