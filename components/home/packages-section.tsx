'use client'

import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'

const packages = [
  {
    name: 'Bronze',
    tagline: 'Quick Escape',
    features: ['Deep Tissue Massage', 'Deep Cleansing Facial'],
  },
  {
    name: 'Silver',
    tagline: 'Refresh & Renew',
    features: ['Full Body Massage', 'Body Scrub + Steam', 'Facial', 'ManiPedi or Wax'],
  },
  {
    name: 'Gold',
    tagline: 'Ultimate Indulgence',
    features: ['Premium Massage', 'Detox Body Treatment', 'Advanced Facial', 'Full Nail Service'],
    popular: true,
  },
]

export default function PackagesSection() {
  return (
    <section className="py-20 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
            Spa Packages
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Curated Experiences
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Choose your perfect spa day package
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`relative rounded-2xl p-6 transition-all duration-300 ${
                pkg.popular 
                  ? 'bg-[#7B2D8E] text-white' 
                  : 'bg-white border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-md'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-[#D4A853] text-white px-3 py-1 rounded-full">
                  Popular
                </span>
              )}
              
              <div className="text-center mb-6">
                <h3 className={`text-lg font-bold mb-1 ${pkg.popular ? 'text-white' : 'text-gray-900'}`}>
                  {pkg.name}
                </h3>
                <p className={`text-xs ${pkg.popular ? 'text-white/70' : 'text-gray-500'}`}>
                  {pkg.tagline}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className={`w-4 h-4 flex-shrink-0 ${pkg.popular ? 'text-[#D4A853]' : 'text-[#7B2D8E]'}`} />
                    <span className={`text-xs ${pkg.popular ? 'text-white/90' : 'text-gray-600'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/booking"
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  pkg.popular 
                    ? 'bg-white text-[#7B2D8E] hover:bg-[#D4A853] hover:text-white' 
                    : 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A]'
                }`}
              >
                Book Now
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#7B2D8E] hover:underline"
          >
            View all packages
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  )
}
