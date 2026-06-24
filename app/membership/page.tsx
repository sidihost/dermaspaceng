import { Metadata } from 'next'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
// `Award` replaces `Sparkles`. Design rules forbid sparkle / zap /
// lightning-bolt ornaments. Award reads as a tangible reward and
// stays inside the professional icon vocabulary (Crown, Check, Star).
import { Check, Crown, Percent, Award, Calendar, Users } from 'lucide-react'
import { MEMBERSHIP_PLANS } from '@/lib/membership-plans'
import MembershipPlansInteractive from '@/components/membership/membership-plans-interactive'

export const metadata: Metadata = {
  title: 'Memberships | Dermaspace',
  description:
    'Choose a Dermaspace membership plan to earn Glow Points, unlock priority booking, and access member-only offers. Silver, Gold and Platinum tiers available.',
}

// Cross-cutting perks shown in the "What every member gets" strip below
// the plan grid. These apply to all three tiers — anything tier-specific
// lives on the plan itself in `lib/membership-plans.ts`.
// "What every member gets" — kept generic so it reads true for both
// the site-wide tiers (Silver, Gold) and the Platinum spa
// membership. Anything tier-specific (e.g. spa treatment discounts)
// lives on the plan card itself.
const sharedBenefits = [
  {
    icon: Award,
    title: 'Earn Glow Points',
    description:
      'Every plan grants Glow Points on signup that unlock more of the Dermaspace site. Points are a reward, never a refund — they don\u2019t go to your wallet and aren\u2019t tied to bookings.',
  },
  {
    icon: Calendar,
    title: 'Priority booking',
    description:
      'Skip the queue with priority access — weekday priority on Gold, every-day priority on Platinum.',
  },
  {
    icon: Percent,
    title: 'Member-only offers',
    description:
      'Seasonal discounts and partner promos that only members can see, refreshed throughout the year.',
  },
  {
    icon: Users,
    title: 'Real people, real service',
    description:
      'Members are recognised at every booking, with dedicated booking support on Gold and Platinum.',
  },
]

const terms = [
  'We reserve the right to change or modify our rates and benefits',
  'Memberships are non-refundable, non-exchangeable, and cannot be used to purchase gift vouchers',
  'Pre-booking is required at all times — priority is given to higher tiers first',
  'Funded account cannot be used to purchase beauty products',
  'Reservations are required. All appointments are subject to availability',
]

export default function MembershipPage() {
  return (
    <main>
      <Header />

      {/* Hero
          Compact brand-purple hero — same vibe as the rest of the
          marketing site, with a quiet eyebrow chip. The Crown icon is
          the only ornament; no gradient, no sparkle, no ping. */}
      <section className="relative py-12 md:py-16 bg-[#7B2D8E] overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3"
        />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
            <Crown className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-medium text-white uppercase tracking-widest">
              Memberships
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-balance">
            Memberships that go further across Dermaspace
          </h1>
          <p className="text-sm text-white/85 max-w-2xl mx-auto">
            Two site-wide tiers for everyone who books on Dermaspace —
            plus our flagship Platinum membership at the Dermaspace spa.
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 40"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-6 md:h-10"
            aria-hidden="true"
          >
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Plan grid
          Three plan cards side-by-side on lg+ and stacked on mobile.
          The recommended plan (Gold) gets the brand-purple ring + a
          "Most popular" pill so the eye lands on the middle card —
          standard pricing-page pattern, no flashy ornaments. */}
      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-10">
            <p className="text-xs font-medium text-[#7B2D8E] uppercase tracking-widest mb-1.5">
              Membership plans
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-balance">
              Site memberships, plus a flagship spa tier
            </h2>
            <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">
              Silver and Gold work everywhere on Dermaspace. Platinum is
              our in-house spa membership at Dermaspace, Lagos.
            </p>
          </div>

          {/* Interactive plan stack + Snapchat-style upgrade sheet.
              Tapping a plan (or its "See what's included" affordance)
              opens a full upgrade detail panel with feature cards, an
              expandable benefits row, the glowing subscribe button and
              fine-print terms. */}
          <MembershipPlansInteractive plans={MEMBERSHIP_PLANS} />
        </div>
      </section>

      {/* Shared benefits */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6">
            <p className="text-xs font-medium text-[#7B2D8E] uppercase tracking-widest mb-1">
              What every member gets
            </p>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              The Dermaspace difference
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {sharedBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-xl p-4 border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 transition-colors shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                  <benefit.icon className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {benefit.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-xs font-medium text-[#7B2D8E] uppercase tracking-widest mb-1">
                How it works
              </p>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">
                Start your journey
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Pick a Dermaspace membership and unlock perks across the
                whole site — or step up to Platinum for our flagship spa
                experience in Lagos.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Pick a plan</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Silver or Gold for site-wide perks, Platinum for the Dermaspace spa
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Earn Glow Points</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Your plan grants Glow Points that unlock more of the site. Platinum also funds your wallet for the spa.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Enjoy benefits</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Book on the site with priority access — and member rates at the Dermaspace spa
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                  alt="Spa interior at Dermaspace"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mt-4">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                  alt="Facial treatment in progress"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Terms */}
      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-base font-bold text-gray-900">Terms &amp; conditions</h2>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-5 border border-[#7B2D8E]/10">
            <ul className="space-y-2">
              {terms.map((term, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs text-gray-600">{term}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Questions? Contact{' '}
                <a
                  href="mailto:info@dermaspaceng.com"
                  className="text-[#7B2D8E] font-medium hover:underline"
                >
                  info@dermaspaceng.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
