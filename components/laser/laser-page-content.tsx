'use client'

/**
 * Laser page content
 * ------------------
 * The previous version of this page was structured like a long
 * marketing landing page — alternating section backgrounds tinted
 * `bg-[#7B2D8E]/[0.03]` (which renders as a muddy grey-purple),
 * `py-10` vertical rhythm, decorative SVG curves, oversized feature
 * cards ("Fast Results", "Gentle Care") that filled the screen on
 * mobile, and pricing cards with `p-5` padding + low-opacity rank
 * numbers that wasted space. After feedback that the page felt
 * "big" and didn't read like an app when logged in, this rewrite:
 *
 *   • Drops every faded `7B2D8E/0.0X` section background — sections
 *     now sit on plain white, separated by their own section header.
 *   • Compresses vertical rhythm from `py-10` → `py-6`.
 *   • Replaces the four full-width feature cards with a single
 *     compact 2×2 grid of small cards on mobile, each with a 36×36
 *     icon tile and 13/12px copy.
 *   • Replaces every `bg-[#7B2D8E]/10` light eyebrow chip with a
 *     solid brand-purple chip + white text.
 *   • Replaces `text-gray-400` / `text-[#7B2D8E]/40` weak greys with
 *     real ink colours (`#1a0d1f` and brand purple at 60–70%).
 *   • Pricing cards become dense single-row rows on mobile (rank +
 *     name on top, prices + duration on bottom) with `p-3` padding,
 *     so 22 services fit comfortably without feeling like a brochure.
 *   • Removes the decorative `CurvedDecoration` SVG layers entirely.
 */

import Image from 'next/image'
import Link from 'next/link'
import {
  Clock,
  ArrowRight,
  Phone,
  Shield,
  Timer,
  Heart,
  Droplets,
  Focus,
  Crown,
  Fingerprint,
  Feather,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserPersonalization } from '@/hooks/use-user-personalization'
import PersonalizedHero from '@/components/services/personalized-hero'
import RecommendedForYou from '@/components/services/recommended-for-you'
import QuickRebook from '@/components/services/quick-rebook'
import SkinCareTips from '@/components/services/skin-care-tips'

// ───────────────────────────────────────────────────────────────────
// Data
// ───────────────────────────────────────────────────────────────────

const laserHairRemoval = [
  { treatment: 'Chin / Cheeks', female: '40,000', male: '50,000', duration: '30MINS' },
  { treatment: 'Neck', female: '30,000', male: '40,000', duration: '30MINS' },
  { treatment: 'Upper Lip', female: '20,000', male: '30,000', duration: '20MINS' },
  { treatment: 'Nostrils', female: '20,000', male: '20,000', duration: '20MINS' },
  { treatment: 'Half Face', female: '55,000', male: '65,000', duration: '30MINS' },
  { treatment: 'Full Face', female: '70,000', male: '70,000', duration: '45MINS' },
  { treatment: 'Full Arm', female: '100,000', male: '100,000', duration: '1HR' },
  { treatment: 'Half Arm', female: '50,000', male: '60,000', duration: '45MINS' },
  { treatment: 'Under Arm', female: '40,000', male: '40,000', duration: '30MINS' },
  { treatment: 'Chest', female: '40,000', male: '50,000', duration: '30MINS' },
  { treatment: 'Nipples', female: '30,000', male: '40,000', duration: '30MINS' },
  { treatment: 'Full Back', female: '100,000', male: '120,000', duration: '45MINS' },
  { treatment: 'Half Back', female: '60,000', male: '70,000', duration: '45MINS' },
  { treatment: 'Belly', female: '30,000', male: '40,000', duration: '30MINS' },
  { treatment: 'Half Belly', female: '20,000', male: '30,000', duration: '30MINS' },
  { treatment: 'Bikini Line', female: '40,000', male: '60,000', duration: '30MINS' },
  { treatment: 'Brazilian', female: '80,000', male: '100,000', duration: '45MINS' },
  { treatment: 'Hollywood + Bell Line + Butt Hole', female: '100,000', male: '120,000', duration: '45MINS', promo: true },
  { treatment: 'Butt Cheeks', female: '60,000', male: '70,000', duration: '1HR' },
  { treatment: 'Insep', female: '40,000', male: '50,000', duration: '45MINS' },
  { treatment: 'Full Leg', female: '150,000', male: '160,000', duration: '1HR 30MINS' },
  { treatment: 'Half Leg', female: '70,000', male: '70,000', duration: '45MINS' },
]

const laserRejuvenation = [
  { service: 'Chin', female: '20,000', male: '30,000' },
  { service: 'Cheeks (Sideface)', female: '25,000', male: '30,000' },
  { service: 'Neck / Under Arm', female: '30,000', male: '30,000' },
  { service: 'Bikini Line', female: '25,000', male: '30,000' },
  { service: 'Brazilian / Hollywood', female: '30,000', male: '40,000' },
]

const carbonPeel = [
  { treatment: 'Full Face Carbon Peel', price: '200,000', isNew: true },
  { treatment: 'Half Face', price: '120,000', isNew: true },
  { treatment: 'Full Face Acne Laser Treatment', price: '60,000', isNew: true },
  { treatment: 'Half Back Acne Laser', price: '60,000', isNew: true },
  { treatment: 'Full Back Acne Laser', price: '100,000', isNew: true },
  { treatment: 'Elbow', price: '40,000', isNew: true },
  { treatment: 'Knee', price: '40,000', isNew: true },
  { treatment: 'Full Neck Carbon Peel', price: '60,000', isNew: true },
  { treatment: 'Half Neck', price: '30,000', isNew: true },
  { treatment: 'Carbon Laser Under Arm', price: '50,000', isNew: true },
]

const electrolysis = [
  { treatment: 'Chin', icon: Focus },
  { treatment: 'Under Arm', icon: Droplets },
  { treatment: 'Brazilian', icon: Heart },
  { treatment: 'Full Face', icon: Fingerprint },
]

const packageDeals = [
  { service: 'Full Body', female: '500,000', male: '600,000', duration: '2HR 30MINS' },
  { service: 'Half Body', female: '300,000', male: '350,000', duration: '1HR 30MINS' },
  { service: 'Chin + Neck', female: '50,000', male: '70,000', promo: true },
  { service: 'Full Leg + Bikini Line', female: '160,000', male: '170,000', promo: true },
  { service: 'Full Arm + Under Arm', female: '120,000', male: '120,000', promo: true },
  { service: 'Bikini Line + Belly Line', female: '50,000', male: '70,000', promo: true },
  { service: 'Underarm + Hollywood', female: '130,000', male: '140,000', promo: true },
]

const features = [
  { icon: Timer, title: 'Fast Results', description: 'Visible after a few sessions' },
  { icon: Shield, title: 'Safe Tech', description: 'FDA-approved lasers' },
  { icon: Droplets, title: 'Gentle Care', description: 'Minimal discomfort' },
  { icon: Feather, title: 'Long-lasting', description: 'Smooth skin for months' },
]

// ───────────────────────────────────────────────────────────────────
// Tiny presentational helpers
// ───────────────────────────────────────────────────────────────────

/**
 * SectionHeader
 * -------------
 * The compact header shared across every section on the page.
 * Replaces the previous "centered chip + 2xl heading" pattern with
 * an app-style left-aligned "label + heading + optional caption"
 * stack so sections feel like dashboard cards instead of marketing
 * blocks. Eyebrow uses solid brand purple (no faded `/10` tints).
 */
function SectionHeader({
  eyebrow,
  title,
  caption,
}: {
  eyebrow: string
  title: string
  caption?: string
}) {
  return (
    <div className="mb-3">
      <span className="inline-block mb-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-[#7B2D8E]">
        {eyebrow}
      </span>
      <h2 className="text-[15px] sm:text-base font-bold text-[#1a0d1f] tracking-tight leading-tight">
        {title}
      </h2>
      {caption && (
        <p className="mt-0.5 text-[12px] text-[#1a0d1f]/55 leading-snug">
          {caption}
        </p>
      )}
    </div>
  )
}

/**
 * PriceRow
 * --------
 * Dense pricing row used by hair-removal, package, and rejuvenation
 * sections. Single horizontal layout on every viewport: small rank
 * disc → service name → female/male prices → optional duration pill.
 * Padding capped at p-3 so 20+ rows scroll comfortably without each
 * one feeling like its own page.
 */
function PriceRow({
  rank,
  name,
  female,
  male,
  duration,
  badge,
}: {
  rank: number
  name: string
  female: string
  male: string
  duration?: string
  badge?: string | null
}) {
  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-[#7B2D8E]/15 bg-white p-3">
      {/* Rank — solid plum disc, white tabular numerals. */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center">
        <span className="text-[11px] font-bold tabular-nums leading-none">
          {String(rank).padStart(2, '0')}
        </span>
      </div>

      {/* Name + prices */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-[#1a0d1f] truncate">
            {name}
          </h3>
          {badge && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[8.5px] font-bold tracking-wider uppercase">
              {badge}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11.5px]">
          <span className="text-[#1a0d1f]/55">F</span>
          <span className="font-semibold text-[#7B2D8E] tabular-nums">
            &#8358;{female}
          </span>
          <span aria-hidden className="w-px h-3 bg-[#7B2D8E]/20" />
          <span className="text-[#1a0d1f]/55">M</span>
          <span className="font-semibold text-[#7B2D8E] tabular-nums">
            &#8358;{male}
          </span>
        </div>
      </div>

      {duration && (
        <div className="flex-shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-[#7B2D8E]/8 text-[#7B2D8E]">
          <Clock className="w-3 h-3" aria-hidden />
          <span className="text-[10px] font-semibold tabular-nums">
            {duration}
          </span>
        </div>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────────────────────

export default function LaserPageContent() {
  const {
    isLoggedIn,
    isLoading,
    user,
    preferences,
    recentBookings,
    recentServices,
    lastVisitDate,
    laserTips,
    getGreetingMessage,
    getPersonalizedSubtitle,
  } = useUserPersonalization()

  // Filter recent services to only show laser-related ones
  const laserRecentServices = recentServices.filter(
    (service) =>
      service.categoryName.toLowerCase().includes('laser') ||
      service.treatmentName.toLowerCase().includes('laser') ||
      service.categoryName.toLowerCase().includes('hair removal')
  )

  return (
    <>
      {/* Personalized hero — owned by its own component. */}
      <PersonalizedHero
        isLoggedIn={isLoggedIn}
        isLoading={isLoading}
        greeting={getGreetingMessage()}
        subtitle={
          isLoggedIn && preferences
            ? `Advanced laser treatments tailored for your ${preferences.skinType?.toLowerCase() || ''} skin`
            : getPersonalizedSubtitle()
        }
        skinType={preferences?.skinType}
        pageType="laser"
      />

      {/* Recommended For You — only for logged-in users with prefs. */}
      {isLoggedIn && !isLoading && preferences && laserTips.length > 0 && (
        <RecommendedForYou
          skinType={preferences.skinType}
          concerns={preferences.concerns}
          tips={laserTips}
          pageType="laser"
        />
      )}

      {/* Quick Rebook — only for logged-in users with laser history. */}
      {isLoggedIn && !isLoading && laserRecentServices.length > 0 && (
        <QuickRebook
          recentServices={laserRecentServices}
          lastVisitDate={lastVisitDate}
          recentBookings={recentBookings.filter((b) =>
            b.services.some(
              (s) =>
                s.categoryName.toLowerCase().includes('laser') ||
                s.treatmentName.toLowerCase().includes('laser')
            )
          )}
        />
      )}

      {/* ─────────────────────────────────────────────────────────
          Why laser — compact 2×2 grid.
          Was four large stacked cards; now small icon-tile cards
          that fit the mobile fold. Icon tile is solid brand purple
          (white glyph), title 13px, body 11.5px.
          ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHeader
            eyebrow="Why laser"
            title="Real results, gently delivered"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-2.5 rounded-2xl border border-[#7B2D8E]/15 bg-white p-3"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
                  <feature.icon className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-[#1a0d1f] leading-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-[#1a0d1f]/55 leading-snug line-clamp-2">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          Treatment gallery — kept the editorial photo grid, just
          tightened the section padding so it doesn't dominate.
          ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHeader
            eyebrow="Our treatments"
            title="Built for your skin"
            caption="Four core laser services on FDA-cleared machines."
          />
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
            {/* Featured: Laser Hair Removal */}
            <div className="col-span-4 md:col-span-4 relative aspect-[16/11] md:aspect-[16/10] rounded-2xl overflow-hidden group">
              <Image
                src="/images/laser-hair-removal-ng.jpg"
                alt="Laser Hair Removal at Dermaspace"
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F0828]/85 via-[#1F0828]/25 to-transparent" />
              <div className="absolute top-3 left-3">
                <div className="inline-flex items-center gap-1 px-2 h-6 bg-white rounded-full shadow-sm">
                  <Crown className="w-3 h-3 text-[#7B2D8E]" />
                  <span className="text-[10px] font-bold text-[#7B2D8E] uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-base md:text-xl font-bold text-white leading-tight text-balance">
                  Laser Hair Removal
                </h3>
                <p className="text-white/80 text-[11px] md:text-xs mt-0.5">
                  Permanent reduction, safe on deeper tones
                </p>
              </div>
            </div>

            {/* Rejuvenation */}
            <div className="col-span-2 relative aspect-[4/5] md:aspect-auto md:h-auto rounded-2xl overflow-hidden group">
              <Image
                src="/images/laser-rejuvenation-ng.jpg"
                alt="Laser Skin Rejuvenation"
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F0828]/85 via-[#1F0828]/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <span className="text-[9.5px] font-bold tracking-wider text-white/80 uppercase">
                  Brightening
                </span>
                <h4 className="text-sm md:text-base font-bold text-white leading-tight">
                  Skin Rejuvenation
                </h4>
              </div>
            </div>

            {/* Hollywood Peel */}
            <div className="col-span-2 md:col-span-3 relative aspect-[5/4] md:aspect-[16/10] rounded-2xl overflow-hidden group">
              <Image
                src="/images/carbon-peel-ng.jpg"
                alt="Hollywood Carbon Peel"
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F0828]/85 via-[#1F0828]/20 to-transparent" />
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 bg-white text-[#7B2D8E] rounded-full text-[9.5px] font-bold shadow-sm">
                  NEW
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <span className="text-[9.5px] font-bold tracking-wider text-white/80 uppercase">
                  Carbon Laser
                </span>
                <h4 className="text-sm md:text-base font-bold text-white leading-tight">
                  Hollywood Peel
                </h4>
              </div>
            </div>

            {/* Electrolysis */}
            <div className="col-span-2 md:col-span-3 relative aspect-[5/4] md:aspect-[16/10] rounded-2xl overflow-hidden group">
              <Image
                src="/images/laser-treatment.jpg"
                alt="Electrolysis"
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F0828]/85 via-[#1F0828]/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <span className="text-[9.5px] font-bold tracking-wider text-white/80 uppercase">
                  Precision
                </span>
                <h4 className="text-sm md:text-base font-bold text-white leading-tight">
                  Electrolysis
                </h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          Platinum membership — single compact app row.
          Was a huge marketing card with a 24px purple price; now a
          quiet promo strip that fits the surface.
          ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-2xl bg-[#7B2D8E] text-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Crown className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-white/80">
                  VIP Membership
                </span>
                <h2 className="mt-0.5 text-[15px] font-bold text-white leading-tight">
                  Platinum Subscription
                </h2>
                <p className="mt-0.5 text-[12px] text-white/80">
                  &#8358;500,000+ / year — discounts on facials, body,
                  waxing &amp; nails. Fully transferable.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="mt-3 w-full bg-white text-[#7B2D8E] hover:bg-white/90 rounded-full h-10 text-[13px] font-semibold"
            >
              <Link href="/booking">Subscribe</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* VAT Notice — full-width thin bar, kept. */}
      <div className="py-2.5 bg-[#7B2D8E]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-[11px] text-white/90 font-medium">
            All prices are VAT inclusive
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          Laser Hair Removal pricing — dense rows on mobile, two
          columns on tablet, three on desktop. Uses the new PriceRow
          primitive so each entry is a single horizontal row.
          ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHeader
            eyebrow="Pricing"
            title="Laser Hair Removal"
            caption="Female / Male rates per session. Tap a row to book."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {laserHairRemoval.map((item, index) => (
              <PriceRow
                key={item.treatment}
                rank={index + 1}
                name={item.treatment}
                female={item.female}
                male={item.male}
                duration={item.duration}
                badge={item.promo ? 'Promo' : null}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          Package deals — same dense row layout, with `Deal` badge
          on promo entries.
          ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHeader
            eyebrow="Save more"
            title="Package Deals"
            caption="Bundle services and save on every session."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {packageDeals.map((item, index) => (
              <PriceRow
                key={item.service}
                rank={index + 1}
                name={item.service}
                female={item.female}
                male={item.male}
                duration={item.duration}
                badge={item.promo ? 'Deal' : null}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          Rejuvenation — short list, same row primitive (no
          duration column on these).
          ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHeader
            eyebrow="Rejuvenation"
            title="Laser Skin Rejuvenation"
            caption="Even tone and brighter skin in targeted areas."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {laserRejuvenation.map((item, index) => (
              <PriceRow
                key={item.service}
                rank={index + 1}
                name={item.service}
                female={item.female}
                male={item.male}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          Carbon peel — single price column, so this is a custom
          compact card layout (rank disc + name + price chip).
          ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHeader
            eyebrow="Hollywood peel"
            title="Carbon Laser Peel"
            caption="Fast, glass-skin facial powered by carbon laser."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {carbonPeel.map((item, index) => (
              <div
                key={item.treatment}
                className="flex items-center gap-3 rounded-2xl border border-[#7B2D8E]/15 bg-white p-3"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#7B2D8E] text-white flex items-center justify-center">
                  <span className="text-[11px] font-bold tabular-nums leading-none">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold text-[#1a0d1f] truncate">
                      {item.treatment}
                    </h3>
                    {item.isNew && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-[#7B2D8E] text-white text-[8.5px] font-bold tracking-wider uppercase">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] font-bold text-[#7B2D8E] tabular-nums">
                    &#8358;{item.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          Electrolysis — no fixed price; small "contact us" cards.
          ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-6">
        <div className="max-w-5xl mx-auto px-4">
          <SectionHeader
            eyebrow="Permanent solution"
            title="Electrolysis Hair Removal"
            caption="Single-hair accuracy. Contact us for a consult."
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {electrolysis.map((item) => (
              <div
                key={item.treatment}
                className="flex items-center gap-2.5 rounded-2xl border border-[#7B2D8E]/15 bg-white p-3"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
                  <item.icon className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[#1a0d1f] leading-tight truncate">
                    {item.treatment}
                  </span>
                  <span className="block text-[11px] text-[#1a0d1f]/55 leading-snug">
                    Contact for pricing
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skin tips — only for logged-in users. */}
      {isLoggedIn && !isLoading && laserTips.length > 0 && (
        <SkinCareTips
          skinType={preferences?.skinType}
          tips={laserTips}
          pageType="laser"
        />
      )}

      {/* ─────────────────────────────────────────────────────────
          CTA — flat solid-purple block, no decorative SVGs.
          The previous version stacked five SVG curves + dot accents
          inside a tinted card; this one is just a single bold
          surface that fits the rest of the page.
          ───────────────────────────────────────────────────────── */}
      <section className="bg-white py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-3xl bg-[#7B2D8E] text-white p-6 text-center">
            <h2 className="text-[18px] sm:text-xl font-bold leading-tight text-balance">
              {isLoggedIn && user
                ? `Ready to book, ${user.firstName}?`
                : 'Ready to experience laser?'}
            </h2>
            <p className="mt-1.5 text-[12.5px] text-white/80 max-w-md mx-auto">
              {isLoggedIn
                ? 'Schedule your next laser treatment in under a minute.'
                : "Book a consultation and we'll guide you to the right protocol."}
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Button
                asChild
                className="w-full sm:w-auto bg-white text-[#7B2D8E] hover:bg-white/90 rounded-full h-10 px-5 text-[13px] font-semibold"
              >
                <Link href="/booking" className="flex items-center gap-1.5">
                  Book now
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
              <a
                href="tel:+2349017972919"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 h-10 rounded-full border border-white/30 text-[13px] font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                +234 901 797 2919
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
