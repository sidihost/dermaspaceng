'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Check, User, Flower2 } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import { useGeo } from '@/lib/geo-context'
import {
  CardHangingOrnament,
  CardSnowflakeWatermark,
  PackageBookButton,
} from '@/components/packages/christmas-package-accents'

const packages = [
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
]

export default function PackagesSection() {
  const { formatPrice } = useGeo()

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader
          badge="Spa Packages"
          title="Pick a"
          highlight="package"
          description="Bundle our popular treatments into one visit and save."
        />

        {/* Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {packages.map((pkg) => {
            return (
              <div
                key={pkg.name}
                className={`group relative flex flex-col overflow-hidden rounded-xl bg-white transition-colors duration-300 ${
                  pkg.popular
                    ? 'border border-[#7B2D8E]'
                    : 'border border-gray-200 hover:border-[#7B2D8E]/40'
                }`}
              >
                {/* Tier accent bar — uses each package's own color */}
                <div className="h-1 w-full" style={{ backgroundColor: pkg.color }} />

                {/* Removable Christmas ornament accent suspended from the tier bar */}
                <CardHangingOrnament popular={pkg.popular} accentColor={pkg.color} rightClass="right-4" />

                {/* Removable subtle snowflake watermark in lower card whitespace */}
                <CardSnowflakeWatermark popular={pkg.popular} />

                <div className={`relative flex flex-1 flex-col p-4 ${pkg.popular ? 'bg-[#7B2D8E]/[0.02]' : ''}`}>
                  {/* Eyebrow: tier dot + type + (optional) Popular flag */}
                  <div className="flex items-center gap-2 pr-9">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pkg.color }} />
                      <User className="w-3 h-3" />
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

                  {/* Features */}
                  <ul className="space-y-2 mb-5 flex-1 relative z-[1]">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
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
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] hover:underline"
          >
            View all packages &amp; couple options
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
