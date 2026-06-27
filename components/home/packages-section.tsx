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
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {packages.map((pkg, idx) => (
            <div
              key={idx}
              className={`group relative flex flex-col rounded-2xl overflow-hidden transition-colors duration-300 ${
                pkg.popular
                  ? 'bg-[#7B2D8E] text-white'
                  : 'bg-white border border-gray-200 hover:border-[#7B2D8E]/40'
              }`}
            >
              {/* Brand accent bar */}
              <div className={`h-1.5 w-full ${pkg.popular ? 'bg-white/30' : 'bg-[#7B2D8E]'}`} />

              {pkg.popular && (
                <div className="absolute top-4 right-4 inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Popular
                </div>
              )}

              <div className="relative flex flex-col flex-1 p-6">
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ring-1 ${
                      pkg.popular ? 'bg-white/15 ring-white/25' : 'bg-[#7B2D8E]/10 ring-[#7B2D8E]/20'
                    }`}
                  >
                    <User className={`w-5 h-5 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>{pkg.name}</h3>
                    <p className={`text-[11px] font-medium uppercase tracking-wide ${pkg.popular ? 'text-white/70' : 'text-[#7B2D8E]'}`}>{pkg.type}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className={`text-[10px] uppercase tracking-wide ${pkg.popular ? 'text-white/60' : 'text-gray-400'}`}>Starting from</span>
                  <div className={`text-3xl font-bold tracking-tight ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>{formatPrice(pkg.price)}</div>
                </div>

                {/* Duration */}
                <div className={`inline-flex self-start items-center gap-1.5 px-3 py-1.5 rounded-full mb-5 ${
                  pkg.popular ? 'bg-white/15' : 'bg-[#7B2D8E]/10'
                }`}>
                  <Clock className={`w-3.5 h-3.5 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
                  <span className={`text-xs font-medium ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`}>{pkg.duration}</span>
                </div>

                {/* Divider */}
                <div className={`h-px w-full mb-5 ${pkg.popular ? 'bg-white/15' : 'bg-gray-100'}`} />

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-1">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        pkg.popular ? 'bg-white/20' : 'bg-[#7B2D8E]/10'
                      }`}>
                        <Check className={`w-3 h-3 ${pkg.popular ? 'text-white' : 'text-[#7B2D8E]'}`} />
                      </div>
                      <span className={`text-xs leading-relaxed ${pkg.popular ? 'text-white/90' : 'text-gray-600'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/booking"
                  className={`group/btn flex items-center justify-center gap-2 w-full py-3 text-center text-sm font-semibold rounded-xl transition-all ${
                    pkg.popular
                      ? 'bg-white text-[#7B2D8E] hover:bg-white/90'
                      : 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A]'
                  }`}
                >
                  Book Now
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
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
