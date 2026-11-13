'use client'

import { Bath, Flower2, Gem, Scissors, Shield } from 'lucide-react'
import { useUserPersonalization } from '@/hooks/use-user-personalization'
import { ServiceBackBar } from './service-back-bar'

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
 * Treatments, Nail Care, Waxing, Laser Hair Removal, Laser Package Deals).
 *
 * Places the "Back to Services" navigation in a dedicated, grid-aligned
 * breadcrumb utility strip directly above the hero so it aligns with the
 * page container (`max-w-6xl`) and keeps the `#7B2D8E` hero surface pure,
 * single-tone, and centered. Strictly flat brand colors — zero gradients,
 * zero shadows.
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

  const cat = category.trim().toLowerCase()
  const CategoryIcon =
    cat.includes('laser')
      ? Shield
      : cat.includes('wellness') || cat.includes('body')
        ? Bath
        : cat.includes('beauty') || cat.includes('nail')
          ? Gem
          : cat.includes('hair removal') || cat.includes('wax')
            ? Scissors
            : Flower2

  return (
    <>
      <ServiceBackBar title={title} />

      {/* Pure Single-Tone Brand Purple Hero */}
      <section className="relative overflow-hidden bg-[#7B2D8E] py-11 sm:py-14 md:py-16">
        {/* Crisp hairline decorative rings (zero fill tint so purple stays uniform) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full border border-white/10"
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 text-center">
          {/* Personalized greeting eyebrow (members only) */}
          {isLoggedIn && user && (
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/75">
              {greeting}, {user.firstName}
            </p>
          )}

          {/* Crisp solid white category pill */}
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[#7B2D8E]">
            <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
              {category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-pretty text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {title}
          </h1>

          {/* Clean centered hairline accent */}
          <div aria-hidden="true" className="mx-auto my-4 h-px w-14 bg-white/40" />

          {/* Subtitle (personalized for members with a skin profile) */}
          <p className="mx-auto max-w-md text-pretty text-sm text-white/85 sm:text-base leading-relaxed">
            {personalizedSubtitle}
          </p>
        </div>
      </section>
    </>
  )
}
