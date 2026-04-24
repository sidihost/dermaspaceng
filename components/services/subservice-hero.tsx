'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, Flower2 } from 'lucide-react'

interface User {
  firstName: string
  lastName: string
}

interface Preferences {
  preferredServices?: string[]
  skinType?: string
}

interface SubserviceHeroProps {
  title: string
  description: string
  category: string
  // Keys that map to the dashboard's "preferredServices" checklist so
  // we can light up a "Your Favorite" badge when this page matches
  // something the user already told us they care about.
  preferenceKeys?: string[]
}

export default function SubserviceHero({
  title,
  description,
  category,
  preferenceKeys = [],
}: SubserviceHeroProps) {
  const [user, setUser] = useState<User | null>(null)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            const prefRes = await fetch('/api/user/preferences')
            if (prefRes.ok) {
              const prefData = await prefRes.json()
              setPreferences(prefData.preferences)
            }
          }
        }
      } catch {
        // Not logged in — fall through to the guest hero.
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const isFavoriteCategory =
    preferences?.preferredServices?.some((pref) =>
      preferenceKeys.includes(pref),
    ) ?? false

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Skin-type chip only makes sense on pages where skin is the thing
  // we'd treat (facials, body work). Avoids showing "Skin type · Oily"
  // on a nail-care or waxing hero where it's just noise.
  const lowerTitle = title.toLowerCase()
  const showSkinType =
    !!preferences?.skinType &&
    (lowerTitle.includes('facial') || lowerTitle.includes('body'))

  return (
    <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
      {/* Decorative ring accents — outlined circles instead of filled
          blobs keep the brand colour feeling clean without needing a
          gradient or extra colours. */}
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

      <div className="relative z-10 max-w-4xl mx-auto px-4">
        {/* Top bar: back link anchored left, category / favorite chip
            anchored right. The previous layout centered both inside
            the same `text-center` container which made the chip
            visually crash into the back link on mobile. */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-white/90 text-sm font-medium hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </Link>

          {!isLoading && user && isFavoriteCategory ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-semibold tracking-[0.15em] text-white uppercase">
              <Heart className="w-3 h-3 fill-white" aria-hidden="true" />
              Your Favorite
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold tracking-[0.15em] text-white uppercase">
              <Flower2 className="w-3 h-3" aria-hidden="true" />
              {category}
            </span>
          )}
        </div>

        {/* Centered title + description. The category title ALWAYS
            stays as H1 — even for logged-in users — so the page is
            still navigable ("where am I?") without relying on the
            URL. Personalization is surfaced underneath as chips. */}
        <div className="text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight text-balance">
            {title}
          </h1>

          {/* Hairline accent replaces the old hand-drawn curved SVG
              — a single straight line reads more premium and doesn't
              compete with the headline. */}
          <div
            aria-hidden="true"
            className="mx-auto my-4 h-px w-14 bg-white/40"
          />

          <p className="text-sm md:text-base text-white/85 max-w-md mx-auto text-pretty">
            {description}
          </p>

          {/* Personalization row. Stays hidden entirely for guests so
              the layout collapses to the original compact size. For
              logged-in users we show a time-aware greeting chip plus
              (when relevant) their skin type, so the hero actually
              earns the extra vertical space. */}
          {!isLoading && user && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/90">
                {getTimeGreeting()},{' '}
                <span className="font-semibold text-white">
                  {user.firstName}
                </span>
              </span>
              {showSkinType && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/90">
                  Skin type
                  <span className="font-semibold text-white">
                    {preferences?.skinType}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
