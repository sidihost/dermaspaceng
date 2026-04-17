'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, Check, ArrowRight, Users, User, Heart, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGeo } from '@/lib/geo-context'

const singlePackages = [
  {
    name: 'Gold Experience',
    type: 'Single',
    price: 141000,
    duration: '3 Hours 30 Mins',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 20,000',
    ],
    popular: true,
    color: '#7B2D8E',
  },
  {
    name: 'Silver Experience',
    type: 'Single',
    price: 97000,
    duration: '3 Hours 50 Mins',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 20,000',
    ],
    popular: false,
    color: '#9CA3AF',
  },
  {
    name: 'Bronze Experience',
    type: 'Single',
    price: 77000,
    duration: '2 Hours',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
    color: '#B87333',
  },
]

const couplePackages = [
  {
    name: 'Gold Experience',
    type: 'Couple',
    price: 245000,
    duration: '3 Hours 30 Mins',
    features: [
      'Couple Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 20,000',
    ],
    popular: true,
    color: '#7B2D8E',
  },
  {
    name: 'Silver Experience',
    type: 'Couple',
    price: 185000,
    duration: '2 Hours 30 Mins',
    features: [
      'Deep Tissue Massage/Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 20,000',
    ],
    popular: false,
    color: '#9CA3AF',
  },
  {
    name: 'Bronze Experience',
    type: 'Couple',
    price: 149000,
    duration: '2 Hours',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
    color: '#B87333',
  },
]

interface UserData {
  firstName: string
  lastName: string
}

interface Preferences {
  preferredServices?: string[]
  companionType?: string // 'single' | 'couple' – drives which section we lead with
}

function PackageCard({ pkg, formatPrice }: { pkg: typeof singlePackages[0]; formatPrice: (amount: number) => string }) {
  return (
    <div 
      className={`relative rounded-xl overflow-hidden transition-all ${
        pkg.popular 
          ? 'bg-[#7B2D8E] text-white' 
          : 'bg-white border border-gray-200 hover:border-[#7B2D8E]/40'
      }`}
    >
      {pkg.popular && (
        <div className="bg-white/20 text-white text-center py-1.5 text-[10px] font-semibold uppercase tracking-wide">
          Most Popular
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: pkg.popular ? 'rgba(255,255,255,0.2)' : `${pkg.color}15` }}
          >
            {pkg.type === 'Single' ? (
              <User className="w-4 h-4" style={{ color: pkg.popular ? 'white' : pkg.color }} />
            ) : (
              <Users className="w-4 h-4" style={{ color: pkg.popular ? 'white' : pkg.color }} />
            )}
          </div>
          <div>
            <h3 className={`text-sm font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
            <span className={`text-[10px] ${pkg.popular ? 'text-white/70' : 'text-[#7B2D8E]'}`}>{pkg.type}</span>
          </div>
        </div>

        <div className="mb-4">
          <span className={`text-[10px] ${pkg.popular ? 'text-white/70' : 'text-gray-500'}`}>Starting from</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>{formatPrice(pkg.price)}</span>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4 ${
          pkg.popular 
            ? 'bg-white/20' 
            : 'bg-[#7B2D8E]/10'
        }`}>
          <Clock className={`w-3 h-3 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
          <span className={`text-xs font-medium ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`}>{pkg.duration}</span>
        </div>

        <ul className="space-y-2 mb-5">
          {pkg.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <div className={`flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center mt-0.5 ${
                pkg.popular ? 'bg-white/20' : 'bg-[#7B2D8E]/10'
              }`}>
                <Check className={`w-2 h-2 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
              </div>
              <span className={`text-[11px] leading-relaxed ${pkg.popular ? 'text-white/90' : 'text-gray-600'}`}>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          asChild
          className={`w-full rounded-lg h-9 text-xs ${
            pkg.popular 
              ? 'bg-white text-[#7B2D8E] hover:bg-white/90' 
              : 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A]'
          }`}
        >
          <Link href="/booking">Book Now</Link>
        </Button>
      </div>
    </div>
  )
}

// Time-based greeting shared by the personalized hero states.
function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
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

  // Surface "favorite" state if the user has already told us packages /
  // spa experiences are a thing they love. We pattern-match on a few
  // likely preference keys so this works whether the app stores them as
  // "packages", "spa-packages" or "experiences".
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

      {/* Hero Section — guests see the generic marketing block; logged-in
          members see a personal greeting, a favorite-category flag when
          relevant, and a CTA back into their dashboard. Matches the
          language / layout of the subservice hero so the two feel related. */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-8 w-2 h-2 bg-white/30 rounded-full hidden md:block" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          {isAuthLoading ? (
            // Skeleton placeholders prevent layout shift while /api/auth/me
            // resolves. Keeps the hero height stable whether we end up
            // rendering the guest or member version.
            <>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
                <span className="text-xs font-medium text-white uppercase tracking-widest">Spa Packages</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
                Choose Your Experience
              </h1>
              <p className="text-sm md:text-base text-white/80">
                Carefully curated packages for ultimate relaxation
              </p>
            </>
          ) : user ? (
            <>
              {isFavoriteCategory ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 mb-4">
                  <Heart className="w-3.5 h-3.5 text-white fill-white" />
                  <span className="text-xs font-medium text-white uppercase tracking-widest">Your Favorite</span>
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
                  ? 'We curated these experiences around what you already love. Pick where you want to unwind next.'
                  : prefersCouple
                    ? `Couple experiences are up first — because sharing a day together beats almost anything else.`
                    : `Here are experiences we think you'll love. Book a single session or bring someone along.`}
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
              <p className="text-sm md:text-base text-white/80">
                Carefully curated packages for ultimate relaxation
              </p>
            </>
          )}

          {/* Shared decorative divider below the hero content. */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-8 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Lead section — swaps order based on the member's companion type
          preference so the first thing a "couple" member sees is the
          couple packages. Guests / single members see singles first. */}
      <section className="py-12 bg-white">
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

          <div className="grid md:grid-cols-3 gap-5">
            {leadPackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} formatPrice={formatPrice} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-t border-gray-100">
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

          <div className="grid md:grid-cols-3 gap-5">
            {followPackages.map((pkg) => (
              <PackageCard key={`${pkg.name}-${pkg.type}`} pkg={pkg} formatPrice={formatPrice} />
            ))}
          </div>
        </div>
      </section>

      {/* Gift Cards */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="relative aspect-[4/3] max-w-xs mx-auto lg:mx-0 rounded-xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/f52f1634-hero-1.png-OVi0BQIsdP8fE20E3t5LI9cQ6RGcgA.webp"
                alt="Gift Cards"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
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
      </section>

      <Footer />
    </main>
  )
}
