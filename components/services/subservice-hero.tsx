'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Heart,
  Flower2,
  Sparkles,
  Sunrise,
  Sun,
  Moon,
  Droplet,
} from 'lucide-react'

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

  // Returns the greeting text + the matching lucide icon component
  // so the personalization chip can show "🌅 Good morning, Mill" with
  // a proper glyph instead of a generic colored dot. The icon set
  // stays inside the brand palette (just white-tinted lines on the
  // purple hero) and gives each chip a tiny piece of meaning rather
  // than a pure decorative pip.
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
    <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
      {/* Layered decoration. We stack three things to give the hero
          an app-screen feel without changing its overall size or
          adding new colours:
            1. A radial spotlight tinted with the brand colour at the
               top — gives the surface a subtle depth, like the AI
               assistant's blob does in its own header, instead of a
               flat block of purple.
            2. A faint dotted grid — provides texture so the negative
               space doesn't feel empty. This is the same trick used
               on app-style splash screens (e.g. iOS widget galleries).
            3. Two soft outline rings + a hairline accent stroke that
               curves along the bottom edge, mimicking the rounded
               "section card" feel of a native app surface.
          All decoration uses pure white-with-opacity, so we stay
          inside the existing 3-colour palette (purple, white, off-
          white). */}

      {/* 1. Radial spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% -10%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)',
        }}
      />

      {/* 2. Dotted grid texture — uses CSS background dots so we
          don't ship an SVG asset for a decorative pattern. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.65) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
        }}
      />

      {/* 3. Soft outline rings — kept from the previous version but
          repositioned + sized so they now hint at concentric "app
          screen" framing rather than floating decoration. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full border border-white/[0.06]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full border border-white/10"
      />

      {/* Tiny accent dots (kept from the previous version, but only
          on md+ so mobile stays uncluttered). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-10 right-10 w-1.5 h-1.5 bg-white/40 rounded-full hidden md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-14 left-12 w-1.5 h-1.5 bg-white/25 rounded-full hidden md:block"
      />

      {/* Bottom edge wave — a single thin white stroke curves the
          bottom of the section in a way that mimics a native app
          card sitting against a lighter background. Pure SVG, no
          extra dependency, decorative only. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        height="14"
        viewBox="0 0 1440 14"
        preserveAspectRatio="none"
      >
        <path
          d="M0 8 Q 360 0 720 8 T 1440 8"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          fill="none"
        />
      </svg>

      <div className="relative z-10 max-w-4xl mx-auto px-4">
        {/* Top bar: back link anchored left, category / favorite chip
            anchored right. Both chips share the same height + radius
            so the row reads like a native app navigation bar.

            Back is wrapped in a circular pill (instead of plain
            inline text) so it has the same visual weight as the
            category chip — that symmetry is what makes the row look
            like an app header bar instead of a web breadcrumb. */}
        <div className="flex items-center justify-between mb-7">
          <Link
            href="/services"
            aria-label="Back to services"
            className="inline-flex items-center gap-1.5 h-9 pl-2 pr-3.5 rounded-full bg-white/10 border border-white/15 text-white text-[13px] font-medium backdrop-blur-sm hover:bg-white/15 active:scale-[0.97] transition-all group"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/15">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            </span>
            Back
          </Link>

          {!isLoading && user && isFavoriteCategory ? (
            <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-semibold tracking-[0.15em] text-white uppercase backdrop-blur-sm">
              <Heart className="w-3 h-3 fill-white" aria-hidden="true" />
              Your Favorite
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold tracking-[0.15em] text-white uppercase backdrop-blur-sm">
              <Flower2 className="w-3 h-3" aria-hidden="true" />
              {category}
            </span>
          )}
        </div>

        {/* Centered title + description. We add a small "service"
            eyebrow chip above the H1 — same trick used in app
            onboarding screens — so the headline has visual lift
            without us having to enlarge the type. */}
        <div className="text-center">
          {/* Eyebrow chip. Stays small, pill-shaped, semi-transparent
              so it reads as supporting metadata rather than a button.
              Hidden when the page already shows a "Your Favorite"
              chip on the right (would feel redundant). */}
          {!(isFavoriteCategory && user) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
              <Sparkles aria-hidden className="w-3 h-3 text-white/85" />
              <span className="text-[9.5px] font-bold tracking-[0.2em] text-white/85 uppercase">
                Service
              </span>
            </span>
          )}

          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight text-balance">
            {title}
          </h1>

          {/* Three-dot accent (instead of a single hairline). Reads
              more like an app section divider — feels intentional,
              not generic. */}
          <div
            aria-hidden="true"
            className="mx-auto my-4 inline-flex items-center gap-1.5"
          >
            <span className="block w-1 h-1 rounded-full bg-white/35" />
            <span className="block w-8 h-px bg-white/40" />
            <span className="block w-1 h-1 rounded-full bg-white/60" />
            <span className="block w-8 h-px bg-white/40" />
            <span className="block w-1 h-1 rounded-full bg-white/35" />
          </div>

          <p className="text-sm md:text-base text-white/85 max-w-md mx-auto text-pretty">
            {description}
          </p>

          {/* Personalization row. Stays hidden entirely for guests so
              the layout collapses to the original compact size. For
              logged-in users we show a time-aware greeting chip plus
              (when relevant) their skin type. Each chip carries a
              meaningful glyph (sunrise/sun/moon for the greeting,
              droplet for skin type) instead of an abstract status
              dot — chips now communicate something at a glance
              rather than acting as decorative pips. */}
          {!isLoading && user && (() => {
            const { label: greetingLabel, Icon: GreetingIcon } = getTimeGreeting()
            return (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/90 backdrop-blur-sm">
                  <GreetingIcon aria-hidden className="w-3.5 h-3.5 text-white/85" />
                  {greetingLabel},{' '}
                  <span className="font-semibold text-white">
                    {user.firstName}
                  </span>
                </span>
                {showSkinType && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/90 backdrop-blur-sm">
                    <Droplet aria-hidden className="w-3.5 h-3.5 text-white/85" />
                    Skin type
                    <span className="font-semibold text-white">
                      {preferences?.skinType}
                    </span>
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </section>
  )
}
