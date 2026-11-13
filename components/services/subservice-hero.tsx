'use client'

// ---------------------------------------------------------------------------
// SubserviceHero
//
// The hero band that sits at the top of every category landing page
// (`/services/facial`, `/services/nail-care`, …). It introduces the
// category, gives the visitor an obvious way back to the parent
// services index, and (when signed in) personalises the greeting.
//
// Visual language
// ---------------
// • Solid brand purple (#7B2D8E) background — never a faded tint or
//   gradient. The user explicitly asked to drop the "light brand"
//   (white-over-purple) chips that made the surface read as soft
//   lavender, so every chip on the hero is now either solid white
//   (with purple text) or a hairline outlined white pill — nothing
//   in between. That choice is intentional: solid white pills on
//   solid purple read as decisive app-bar buttons.
// • One typographic hierarchy: tiny eyebrow → big white headline →
//   single hairline rule → description → personalisation chips.
// • Decoration is white-on-purple at very low opacity (rings, soft
//   spotlight) and never colored, so the surface stays brand-pure.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import {
  Heart,
  Flower2,
  Sunrise,
  Sun,
  Moon,
  Droplet,
} from 'lucide-react'
import { ServiceBackBar } from './service-back-bar'

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

  // Returns the greeting label + a matching lucide icon so the
  // personalisation chip carries actual meaning rather than a
  // decorative dot. The icon set stays inside the brand palette
  // (purple glyphs on solid white pills).
  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return { label: 'Good morning', Icon: Sunrise }
    if (hour < 17) return { label: 'Good afternoon', Icon: Sun }
    return { label: 'Good evening', Icon: Moon }
  }

  // Skin-type chip only makes sense on pages where skin is the thing
  // we'd treat (facials, body work). Avoids showing "Skin type · Oily"
  // on a nail-care or waxing hero where it's just noise.
  const lowerTitle = title.toLowerCase()
  const showSkinType =
    !!preferences?.skinType &&
    (lowerTitle.includes('facial') || lowerTitle.includes('body'))

  return (
    <>
      <ServiceBackBar title={title} />
      <section className="relative bg-[#7B2D8E] overflow-hidden py-11 md:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-24 w-64 h-64 rounded-full border border-white/10"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4">
          {/* Centred title block. */}
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              {!isLoading && user && isFavoriteCategory ? (
                <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white text-[#7B2D8E] text-[10px] font-bold tracking-[0.16em] uppercase">
                  <Heart className="w-3 h-3 fill-[#7B2D8E] text-[#7B2D8E]" aria-hidden="true" />
                  Your Favorite
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white text-[#7B2D8E] text-[10px] font-bold tracking-[0.16em] uppercase">
                  <Flower2 className="w-3 h-3" aria-hidden="true" />
                  {category}
                </span>
              )}
            </div>

            <h1 className="text-[28px] md:text-5xl font-bold text-white leading-[1.1] tracking-tight text-balance">
              {title}
            </h1>

            <span
              aria-hidden="true"
              className="block mx-auto mt-4 mb-4 h-px w-12 bg-white/45"
            />

            <p className="text-[14px] md:text-[16px] text-white/90 max-w-md mx-auto leading-relaxed text-pretty">
              {description}
            </p>

            {!isLoading && user && (() => {
              const { label: greetingLabel, Icon: GreetingIcon } = getTimeGreeting()
              return (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-[#7B2D8E] text-[12px]">
                    <GreetingIcon aria-hidden className="w-3.5 h-3.5" />
                    <span>
                      {greetingLabel},{' '}
                      <span className="font-semibold">{user.firstName}</span>
                    </span>
                  </span>
                  {showSkinType && (
                    <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-[#7B2D8E] text-[12px]">
                      <Droplet aria-hidden className="w-3.5 h-3.5" />
                      <span>
                        Skin type{' '}
                        <span className="font-semibold">
                          {preferences?.skinType}
                        </span>
                      </span>
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </section>
    </>
  )
}
