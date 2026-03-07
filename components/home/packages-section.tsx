'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Sparkles } from 'lucide-react'

const packages = [
  {
    name: 'Bronze Experience',
    type: 'Single',
    duration: '2 Hours',
    price: '77,000',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
  },
  {
    name: 'Silver Experience',
    type: 'Single',
    duration: '3 Hours 50 Mins',
    price: '97,000',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth N20,000',
    ],
  },
  {
    name: 'Gold Experience',
    type: 'Single',
    duration: '3 Hours 30 Mins',
    price: '141,000',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth N20,000',
    ],
    popular: true,
  },
]

export default function PackagesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-0.5 bg-[#7B2D8E]" />
            <svg className="w-5 h-5 text-[#7B2D8E]/50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className="w-12 h-0.5 bg-[#7B2D8E]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            <span className="text-[#7B2D8E]">OUR</span> PACKAGES
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Choose the perfect spa experience for your needs
          </p>
        </div>

        {/* Cards - Horizontal Scroll on Mobile */}
        <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
          {packages.map((pkg, idx) => (
            <div
              key={idx}
              className={`relative flex-shrink-0 w-[85%] md:w-auto snap-center bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg ${
                pkg.popular 
                  ? 'border-[#7B2D8E] shadow-md' 
                  : 'border-gray-200 hover:border-[#7B2D8E]/30'
              }`}
            >
              {pkg.popular && (
                <div className="absolute top-0 right-0 bg-[#D4A853] text-white text-xs font-bold uppercase tracking-wide px-4 py-1.5 rounded-bl-xl flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Popular
                </div>
              )}
              
              <div className="p-6">
                {/* Package Name */}
                <div className="mb-4">
                  <p className="text-sm text-[#7B2D8E] font-medium uppercase tracking-wide mb-1">Dermaspace</p>
                  <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-500">({pkg.type})</p>
                </div>

                {/* Duration & Price */}
                <div className="flex items-center justify-between py-4 border-y border-gray-100 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{pkg.duration}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#7B2D8E]">N{pkg.price}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-[#D4A853] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-base text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/booking"
                  className={`block w-full py-3.5 text-center text-base font-semibold rounded-xl transition-colors ${
                    pkg.popular
                      ? 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A]'
                      : 'bg-[#7B2D8E]/10 text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white'
                  }`}
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-lg font-medium text-[#7B2D8E] hover:underline"
          >
            View all packages including couples
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
