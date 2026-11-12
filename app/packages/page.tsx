'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Check, ArrowRight, Users, User, Heart, Gift, Flower2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGeo } from '@/lib/geo-context'
import FavoriteButton from '@/components/favorite-button'
import {
  CardHangingOrnament,
  CardSnowflakeWatermark,
  HolidayCornerSnowflakes,
  HolidayHeroDivider,
  PackageBookButton,
  PackagesHeroFestiveArt,
} from '@/components/packages/christmas-package-accents'

interface UserData {
  firstName: string
  lastName: string
}

interface Preferences {
  preferredServices?: string[]
  companionType?: string // 'single' | 'couple' – drives which section we lead with
}

interface SpaPackage {
  name: string
  type: 'Single' | 'Couple'
  price: number
  duration: string
  features: string[]
  popular: boolean
  color: string
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const singlePackages: SpaPackage[] = [
  {
    name: 'Gold Experience',
    type: 'Single',
    price: 150000,
    duration: '3 Hours 30 Mins',
    features: [
      '1 Hour Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 25,000',
    ],
    popular: true,
    color: '#7B2D8E',
  },
  {
    name: 'Silver Experience',
    type: 'Single',
    price: 110000,
    duration: '2 Hours 50 Mins',
    // Silver is a "pick one" between the massage OR the body scrub — not
    // both. Explicit OR wording matches the official marketing card.
    features: [
      '1 Hour Deep Tissue Massage/Swedish Massage OR Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 25,000',
    ],
    popular: false,
    color: '#9CA3AF',
  },
  {
    name: 'Bronze Experience',
    type: 'Single',
    price: 80000,
    duration: '2 Hours',
    features: [
      '1 Hour Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
    color: '#B87333',
  },
]

const couplePackages: SpaPackage[] = [
  {
    name: 'Gold Experience',
    type: 'Couple',
    price: 290000,
    duration: '3 Hours 30 Mins',
    features: [
      'Couple 1 Hour Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 25,000',
    ],
    popular: true,
    color: '#7B2D8E',
  },
  {
    name: 'Silver Experience',
    type: 'Couple',
    price: 210000,
    duration: '2 Hours 50 Mins',
    features: [
      '1 Hour Deep Tissue Massage/Swedish Massage OR Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 25,000',
    ],
    popular: false,
    color: '#9CA3AF',
  },
  {
    name: 'Bronze Experience',
    type: 'Couple',
    price: 160000,
    duration: '2 Hours',
    features: [
      '1 Hour Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
    color: '#B87333',
  },
]

function PackageCard({ pkg, formatPrice }: { pkg: SpaPackage; formatPrice: (amount: number) => string }) {
  const TypeIcon = pkg.type === 'Couple' ? Users : User

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-white transition-colors duration-300 ${
        pkg.popular
          ? 'border border-[#7B2D8E]'
          : 'border border-gray-200 hover:border-[#7B2D8E]/40'
      }`}
    >
      {/* Tier accent bar — uses each package's own color */}
      <div className="h-1 w-full" style={{ backgroundColor: pkg.color }} />

      {/* Removable Christmas ornament accent suspended from the tier bar */}
      <CardHangingOrnament popular={pkg.popular} accentColor={pkg.color} rightClass="right-12" />

      {/* Removable subtle snowflake watermark in lower card whitespace */}
      <CardSnowflakeWatermark popular={pkg.popular} />

      {/* Favorite toggle pinned to the top-right. Composite itemId
          ("{name}-{type}") keeps Gold Single / Gold Couple distinct in
          the member's favorites list. */}
      <div className="absolute top-3 right-3 z-10">
        <FavoriteButton
          itemType="package"
          itemId={`${pkg.name}-${pkg.type}`.toLowerCase().replace(/\s+/g, '-')}
          label={`${pkg.name} (${pkg.type})`}
          href="/packages"
          variant="solid"
          size="sm"
        />
      </div>

      {/* Subtle flat header band on the popular tier */}
      <div className={`relative flex flex-1 flex-col p-4 ${pkg.popular ? 'bg-[#7B2D8E]/[0.02]' : ''}`}>
        {/* Eyebrow: tier dot + type + (optional) Popular flag. pr-16
            leaves room for the hanging ornament and favorite heart. */}
        <div className="flex items-center gap-2 pr-16">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pkg.color }} />
            <TypeIcon className="w-3 h-3" />
            {pkg.type}
          </span>
          {pkg.popular && (
            <span className="rounded-full bg-[#7B2D8E] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              Popular
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="mt-2.5 text-base font-bold tracking-tight text-gray-900">{pkg.name}</h3>

        {/* Price */}
        <div className="mt-2">
          <span className="text-2xl font-bold leading-none tracking-tight text-gray-900">
            {formatPrice(pkg.price)}
          </span>
        </div>

        {/* Meta chips: duration + treatment count */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-[11px] font-medium text-[#7B2D8E]">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {pkg.duration}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-[11px] font-medium text-[#7B2D8E]">
            <Flower2 className="h-3.5 w-3.5 shrink-0" />
            {pkg.features.length} treatment{pkg.features.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Divider */}
        <div className="mt-4 mb-4 h-px w-full bg-gray-100" />

        <ul className="space-y-2 mb-5 flex-1 relative z-[1]">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10">
                <Check className="w-2.5 h-2.5 text-[#7B2D8E]" strokeWidth={3} />
              </span>
              <span className="text-xs leading-relaxed text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>

        <PackageBookButton href="/booking" popular={pkg.popular} />
      </div>
    </div>
  )
}

export default function PackagesPage() {
  const { formatPrice } = useGeo()

  // Auth + preference loading follows the same pattern as the subservice
  // hero (components/services/subservice-hero.tsx) so logged-in visitors
  // see a greeting + tailored copy instead of a generic marketing block.
  const [user, setUser] = useState<UserData | null>(null)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            const prefRes = await fetch('/api/user/preferences')
            if (prefRes.ok) {
              const prefData = await prefRes.json()
              setPreferences(prefData.preferences ?? null)
            }
          }
        }
      } catch {
        // Guest — silently fall back to the generic hero below.
      } finally {
        setIsAuthLoading(false)
      }
    }
    load()
  }, [])

  const isFavoriteCategory = preferences?.preferredServices?.some((p) =>
    ['packages', 'spa-packages', 'experiences', 'spa'].includes(p)
  )
  const prefersCouple = preferences?.companionType === 'couple'

  const leadPackages = prefersCouple ? couplePackages : singlePackages
  const followPackages = prefersCouple ? singlePackages : couplePackages
  const leadHeading = prefersCouple ? 'Couple Packages' : 'Single Packages'
  const leadSubtitle = prefersCouple ? 'Share the experience together' : 'Individual pampering sessions'
  const followHeading = prefersCouple ? 'Single Packages' : 'Couple Packages'
  const followSubtitle = prefersCouple ? 'Individual pampering sessions' : 'Share the experience together'
  const LeadIcon = prefersCouple ? Users : User
  const FollowIcon = prefersCouple ? User : Users

  return (
    <main>
      <Header />

      {/* Hero Section — solid brand purple with removable flat Christmas ornament framing */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        <PackagesHeroFestiveArt />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          {isAuthLoading ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                <Gift className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-medium text-white uppercase tracking-widest">Spa Packages</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
                Choose Your Experience
              </h1>
              <p className="text-sm md:text-base text-white/85 max-w-lg mx-auto">
                Carefully curated spa packages for ultimate relaxation
              </p>
            </>
          ) : user ? (
            <>
              {isFavoriteCategory ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 mb-4">
                  <Heart className="w-3.5 h-3.5 text-white fill-white" />
                  <span className="text-xs font-medium text-white uppercase tracking-widest">Your Favorite Category</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                  <Gift className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs font-medium text-white uppercase tracking-widest">Spa Packages</span>
                </div>
              )}

              <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
                {getTimeGreeting()}, {user.firstName}
              </h1>

              {/* Curved underline accent — mirrors the subservice hero. */}
              <svg className="mx-auto mb-4" width="120" height="8" viewBox="0 0 120 8" fill="none" aria-hidden="true">
                <path d="M2 6C30 2 90 2 118 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5"/>
              </svg>

              <p className="text-sm md:text-base text-white/90 max-w-lg mx-auto">
                {isFavoriteCategory
                  ? 'You love our packages — here are the latest tiers tailored to your preferences.'
                  : prefersCouple
                    ? `Couple experiences are up first — because sharing a spa day together beats almost anything else.`
                    : `Curated bundles that combine our signature treatments for deeper relaxation and better value.`}
              </p>

              {/* Contextual CTAs into the member's world. */}
              <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-white text-[#7B2D8E] text-xs font-semibold hover:bg-white/90 transition-colors"
                >
                  Book a package
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-white/10 text-white text-xs font-semibold border border-white/20 hover:bg-white/15 transition-colors"
                >
                  Your dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                <Gift className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-medium text-white uppercase tracking-widest">Spa Packages</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
                Choose Your <span className="text-white/90">Experience</span>
              </h1>
              <p className="text-sm md:text-base text-white/85 max-w-lg mx-auto">
                Carefully curated spa packages for ultimate relaxation
              </p>
            </>
          )}

          {/* Removable holiday snowflake divider */}
          <HolidayHeroDivider />
        </div>
      </section>

      {/* Lead section — swaps order based on the member's companion type
          preference so the first thing a "couple" member sees is the
          couple packages. Guests / single members see singles first. */}
      <section id={prefersCouple ? 'couples' : 'single'} className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <LeadIcon className="w-4 h-4 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{leadHeading}</h2>
              <p className="text-xs text-gray-500">{leadSubtitle}</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leadPackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} formatPrice={formatPrice} />
            ))}
          </div>
        </div>
      </section>

      <section id={prefersCouple ? 'single' : 'couples'} className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
              <FollowIcon className="w-4 h-4 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{followHeading}</h2>
              <p className="text-xs text-gray-500">{followSubtitle}</p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {followPackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} formatPrice={formatPrice} />
            ))}
          </div>
        </div>
      </section>

      {/* Gift Cards Callout — flat framed surface with removable corner snowflakes */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#7B2D8E]/20 bg-[#7B2D8E]/[0.025] p-6 sm:p-8">
            <HolidayCornerSnowflakes />
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div className="relative aspect-[4/3] w-full max-w-xs mx-auto lg:mx-0 rounded-xl overflow-hidden bg-white border border-[#7B2D8E]/10 p-3">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/f52f1634-hero-1.png-OVi0BQIsdP8fE20E3t5LI9cQ6RGcgA.webp"
                  alt="Gift Cards"
                  fill
                  sizes="320px"
                  referrerPolicy="no-referrer"
                  className="object-contain"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7B2D8E]/10 border border-[#7B2D8E]/15 mb-4">
                  <Gift className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Gift Cards</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {user ? `Gift wellness to someone you love` : 'Give the Gift of Wellness'}
                </h2>
                <p className="text-sm text-gray-600 mb-5">
                  {user
                    ? `Send a Dermaspace gift card in ${user.firstName}'s name and let them choose their perfect spa experience.`
                    : 'Surprise your loved ones with a Dermaspace gift card. Let them choose their perfect spa experience.'}
                </p>
                <Button
                  asChild
                  className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg px-5 h-9 text-xs"
                >
                  <Link href="/contact" className="flex items-center gap-2">
                    Inquire About Gift Cards
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
