import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ServiceHero } from '@/components/services/service-hero'
import { LaserHairRemovalIllustration } from '@/components/laser/laser-illustrations'
import {
  Clock,
  ArrowRight,
  Package,
  Tag,
  Shield,
  Crown,
  CheckCircle2,
  Layers,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Laser Package Deals',
  description:
    'Bundled laser hair removal package deals at Dermaspace Lagos. Save on Full Body, Half Body, Chin + Neck, Full Leg + Bikini Line, and multi-area combos.',
}

const packageDeals = [
  {
    name: 'Full Body Laser',
    female: '₦500,000',
    male: '₦600,000',
    duration: '150 mins',
    badge: 'Popular',
    description:
      'Head-to-toe permanent laser hair removal in a single scheduled visit with full cooling aftercare.',
    highlights: ['Face, arms & underarms', 'Torso / bikini area', 'Full legs covered'],
  },
  {
    name: 'Half Body Laser',
    female: '₦300,000',
    male: '₦350,000',
    duration: '90 mins',
    badge: 'Best Value',
    description:
      'Choose upper or lower half-body coverage to target multiple zones seamlessly in one visit.',
    highlights: ['Flexible upper or lower split', 'Faster multi-zone glide', 'Melanin-safe diode laser'],
  },
  {
    name: 'Chin + Neck Laser',
    female: '₦70,000',
    male: '₦90,000',
    duration: '45 mins',
    badge: 'Promo',
    description:
      'Targeted lower-face and neck bundle designed to clear recurring beard-line or hormonal hair and ingrowns.',
    highlights: ['Chin contour & jawline', 'Full front or back neck', 'Ideal for ingrown hair relief'],
  },
  {
    name: 'Full Leg + Bikini Line Laser',
    female: '₦160,000',
    male: '₦170,000',
    duration: '120 mins',
    badge: 'Promo',
    description:
      'Our favorite holiday-ready pairing for smooth legs and a clean, bump-free bikini perimeter.',
    highlights: ['Upper & lower legs', 'Clean bikini line shaping', 'Bundled promo rate'],
  },
  {
    name: 'Full Arm + Underarm Laser',
    female: '₦120,000',
    male: '₦145,000',
    duration: '75 mins',
    badge: 'Promo',
    description:
      'Even, shadow-free underarms paired with full arm laser hair removal at a combined discount.',
    highlights: ['Full arm coverage', 'Underarm brightening benefit', 'Zero razor burn'],
  },
  {
    name: 'Bikini Line + Belly Line Laser',
    female: '₦50,000',
    male: '₦70,000',
    duration: '45 mins',
    badge: 'Promo',
    description:
      'Quick torso and bikini-line combination for clean contours with gentle cooling protection.',
    highlights: ['Bikini perimeter', 'Navel / lower belly line', 'Under 45 minutes'],
  },
  {
    name: 'Underarm + Hollywood Laser',
    female: '₦135,000',
    male: '₦145,000',
    duration: '60 mins',
    badge: 'Promo',
    description:
      'Complete intimate Hollywood protocol paired with underarm laser for maximum everyday convenience.',
    highlights: ['Full intimate Hollywood', 'Underarm laser included', 'Single-session combo savings'],
  },
]

export default function LaserPackageDealsPage() {
  return (
    <main>
      <Header />

      <ServiceHero
        category="Laser Packages"
        title="Laser Package Deals"
        subtitle="Bigger areas, bigger savings — pre-bundled multi-zone laser protocols at discounted rates"
      />

      {/* Overview Feature Strip */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-2xl border border-gray-100 bg-gray-50 p-5 md:p-7">
            <div className="lg:col-span-5 relative aspect-[4/3] rounded-xl overflow-hidden border border-[#7B2D8E]/15 bg-[#7B2D8E]">
              <LaserHairRemovalIllustration className="absolute inset-0 w-full h-full" />
            </div>

            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-[11px] font-semibold uppercase tracking-wider mb-3">
                <Tag className="w-3.5 h-3.5" />
                Multi-Area Savings
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                Pair zones in one appointment and save more
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                Treating complementary areas together reduces total clinic visits and lowers your per-area cost. All bundles use our melanin-safe diode laser systems across Victoria Island and Ikoyi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {[
                  { icon: Package, label: '7 curated bundles' },
                  { icon: Layers, label: 'All prices VAT inclusive' },
                  { icon: Shield, label: 'Female & Male rates' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-xl bg-white border border-gray-100 px-3 py-2.5"
                    >
                      <Icon className="w-4 h-4 text-[#7B2D8E] shrink-0" />
                      <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-[#6A2579] transition-colors"
                >
                  Book a Package
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/services/laser-hair-removal"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#7B2D8E] text-xs sm:text-sm font-medium rounded-xl border border-[#7B2D8E]/25 hover:border-[#7B2D8E] transition-colors"
                >
                  Browse Individual Zones
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 inline-block relative">
              Our Laser Packages
              <svg
                className="absolute -bottom-2 left-0 right-0 mx-auto"
                width="100"
                height="6"
                viewBox="0 0 100 6"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 4C25 2 75 2 98 4"
                  stroke="#7B2D8E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeOpacity="0.3"
                />
              </svg>
            </h2>
            <p className="text-sm text-gray-500 mt-3">
              Select a multi-area bundle designed around your schedule and skin goals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packageDeals.map((deal) => (
              <div
                key={deal.name}
                className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-[#7B2D8E]/30 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center group-hover:bg-[#7B2D8E]/15 transition-colors">
                      <Package className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7B2D8E] text-white text-[10px] font-semibold uppercase tracking-wider">
                      <Crown className="w-3 h-3" />
                      {deal.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-[#7B2D8E] transition-colors">
                    {deal.name}
                  </h3>

                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    {deal.description}
                  </p>

                  <ul className="space-y-1.5 mb-4">
                    {deal.highlights.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#7B2D8E] shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-2 mb-3 rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-gray-400">
                        Female
                      </span>
                      <span className="text-sm font-bold text-[#7B2D8E]">{deal.female}</span>
                    </div>
                    <div className="border-l border-gray-200 pl-2.5">
                      <span className="block text-[10px] uppercase tracking-wider text-gray-400">
                        Male
                      </span>
                      <span className="text-sm font-bold text-gray-800">{deal.male}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{deal.duration}</span>
                    </div>
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:gap-2 transition-all"
                    >
                      Book Package
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4" aria-hidden="true">
            <div className="w-8 h-0.5 bg-[#7B2D8E]/30" />
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/40" />
            <div className="w-8 h-0.5 bg-[#7B2D8E]/30" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Not sure which bundle fits you?
          </h2>

          <svg className="mx-auto mb-4" width="160" height="8" viewBox="0 0 160 8" fill="none" aria-hidden="true">
            <path d="M2 6C40 2 120 2 158 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.25" />
          </svg>

          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Our certified laser therapists will tailor a safe multi-zone schedule for your skin tone and goals.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6A2579] transition-colors group"
            >
              Book Appointment
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/laser-tech"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#7B2D8E] text-sm font-medium rounded-xl border border-[#7B2D8E]/25 hover:border-[#7B2D8E] transition-colors"
            >
              View All Laser Treatments
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
