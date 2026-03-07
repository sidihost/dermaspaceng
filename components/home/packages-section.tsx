'use client'

import Link from 'next/link'
import { Check, ArrowRight, Clock, CreditCard } from 'lucide-react'

const packages = [
  {
    name: 'Dermaspace',
    tier: 'Bronze Experience',
    type: '(Single)',
    duration: '2 Hours',
    price: '77,000',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Deep Cleansing Facial',
    ],
  },
  {
    name: 'Dermaspace',
    tier: 'Silver Experience',
    type: '(Single)',
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
    name: 'Dermaspace',
    tier: 'Gold Experience',
    type: '(Single)',
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
    <section className="py-16 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-0.5 bg-[#7B2D8E]" />
            <div className="text-[#7B2D8E]">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9 9H2l6 4.5-2 7.5 6-4.5 6 4.5-2-7.5 6-4.5h-7z" />
              </svg>
            </div>
            <div className="w-12 h-0.5 bg-[#7B2D8E]" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            <span className="text-[#7B2D8E]">OUR</span> PACKAGES
          </h2>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {packages.map((pkg, idx) => (
            <div
              key={idx}
              className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
                pkg.popular 
                  ? 'border-2 border-[#7B2D8E] shadow-lg' 
                  : 'border border-gray-200 hover:border-[#7B2D8E]/50'
              }`}
            >
              {pkg.popular && (
                <span className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider bg-[#D4A853] text-white px-3 py-1 rounded-full z-10">
                  Popular
                </span>
              )}
              
              {/* Purple Header */}
              <div className="bg-gradient-to-br from-[#7B2D8E] to-[#9B3DAE] p-6 text-center text-white">
                <p className="text-base font-semibold mb-1">{pkg.name}</p>
                <p className="text-xl font-bold mb-1">{pkg.tier}</p>
                <p className="text-sm opacity-80">{pkg.type}</p>
                
                {/* Duration & Price Box */}
                <div className="mt-4 bg-white/20 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 opacity-70" />
                    <div className="text-left">
                      <p className="text-xs opacity-70">Duration</p>
                      <p className="text-sm font-semibold">{pkg.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 opacity-70" />
                    <div className="text-right">
                      <p className="text-xs opacity-70">Price</p>
                      <p className="text-sm font-semibold">N{pkg.price}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* White Body */}
              <div className="bg-white p-6">
                <ul className="space-y-4 mb-6">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded bg-[#7B2D8E] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/booking"
                  className="block w-full py-3 text-center text-base font-semibold text-white bg-[#7B2D8E] rounded-xl hover:bg-[#5A1D6A] transition-colors"
                >
                  BOOK NOW
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-base font-medium text-[#7B2D8E] hover:underline"
          >
            View all packages including couples
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
