'use client'

import { Flower2, Heart, User, Wand2 } from 'lucide-react'

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
    pageType === 'laser' ? 'Laser Technology' : 'Our Services'
  const defaultSubtitle =
    pageType === 'laser'
      ? 'Advanced laser treatments for lasting results'
      : 'Expertly crafted treatments to rejuvenate your body and mind'
  const guestChip = pageType === 'laser' ? 'Laser Tech' : 'Our Services'

  const showPersonalized = !isLoading && isLoggedIn

  return (
    <section className="relative py-10 md:py-12 bg-[#7B2D8E] overflow-hidden">
      {/* Matches the compact subservice & marketing heroes — outlined-ring
          accents in crisp white/10 so the hero stays clean and compact. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 w-48 h-48 rounded-full border border-white/10"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Eyebrow chip — "Personalized For You" for signed-in users,
            plain category label otherwise. */}
        {showPersonalized ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[10px] font-semibold tracking-[0.15em] text-white uppercase mb-3">
            <Heart className="w-3 h-3 fill-white" aria-hidden="true" />
            Personalized For You
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold tracking-[0.15em] text-white uppercase mb-3">
            {pageType === 'laser' ? (
              <Wand2 className="w-3 h-3" aria-hidden="true" />
            ) : (
              <Flower2 className="w-3 h-3" aria-hidden="true" />
            )}
            {guestChip}
          </span>
        )}

        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight text-balance">
          {showPersonalized ? greeting : title}
        </h1>

        <div
          aria-hidden="true"
          className="mx-auto my-3 h-px w-12 bg-white/40"
        />

        <p className="text-sm text-white/85 max-w-md mx-auto text-pretty">
          {showPersonalized ? subtitle : defaultSubtitle}
        </p>

        {showPersonalized && skinType && (
          <div className="mt-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-white/90">
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
