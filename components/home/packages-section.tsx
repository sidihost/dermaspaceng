'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Check, User } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import { useGeo } from '@/lib/geo-context'

const packages = [
  {
    name: 'Bronze Experience',
    type: 'Single',
    duration: '2 Hours',
    price: 80000,
    color: '#CD7F32',
    features: [
      '1 Hour Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
  },
  {
    name: 'Silver Experience',
    type: 'Single',
    duration: '2 Hours 50 Mins',
    price: 110000,
    color: '#C0C0C0',
    // Silver lets the guest pick ONE between the massage and the body
    // scrub — it's not both. Previously listed as two separate bullets
    // which was causing refund requests from the Ikoyi branch because
    // customers expected all four treatments. Combined into a single
    // "OR" line so the option is unmistakable.
    features: [
      '1 Hour Deep Tissue Massage/Swedish Massage OR Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 25,000',
    ],
  },
  {
    name: 'Gold Experience',
    type: 'Single',
    duration: '3 Hours 30 Mins',
    price: 150000,
    color: '#7B2D8E',
    features: [
      '1 Hour Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 25,000',
    ],
    popular: true,
  },
]

export default function PackagesSection() {
  const { formatPrice } = useGeo()
  
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Packages"
          title="Pick a"
          highlight="package"
          description="Combine treatments into one visit and save."
        />

        {/* Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {packages.map((pkg, idx) => {
            const treatmentCount = pkg.features.length
            return (
              <div
                key={idx}
                className={`group relative flex flex-col rounded-2xl bg-white p-5 transition-colors duration-300 ${
                  pkg.popular
                    ? 'ring-2 ring-[#7B2D8E] border border-transparent'
                    : 'border border-gray-200 hover:border-[#7B2D8E]/50'
                }`}
              >
                {/* Eyebrow: type chip + (optional) Most Popular flag */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7B2D8E]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#7B2D8E]">
                    <User className="w-3 h-3" />
                    {pkg.type}
                  </span>
                  {pkg.popular && (
                    <span className="rounded-full bg-[#7B2D8E] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Most Popular
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold tracking-tight text-gray-900">{pkg.name}</h3>

                {/* Price + compact meta line */}
                <div className="mt-4">
                  <span className="block text-[10px] font-medium uppercase tracking-wider text-gray-400">Starting from</span>
                  <span className="mt-1 block text-[28px] font-bold leading-none tracking-tight text-gray-900">
                    {formatPrice(pkg.price)}
                  </span>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    <span>{pkg.duration}</span>
                    <span className="text-gray-300" aria-hidden>&middot;</span>
                    <span>{treatmentCount} treatment{treatmentCount > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 h-px w-full bg-gray-100" />

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-[#7B2D8E]/10">
                        <Check className="w-2.5 h-2.5 text-[#7B2D8E]" strokeWidth={3} />
                      </span>
                      <span className="text-[13px] leading-relaxed text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/booking"
                  className={`group/btn flex items-center justify-center gap-2 w-full h-11 text-center text-sm font-semibold rounded-xl transition-colors ${
                    pkg.popular
                      ? 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A]'
                      : 'bg-white text-[#7B2D8E] border border-[#7B2D8E]/30 hover:bg-[#7B2D8E] hover:text-white hover:border-[#7B2D8E]'
                  }`}
                >
                  Book Now
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] hover:underline"
          >
            View all packages including couples
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
