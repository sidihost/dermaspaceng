'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Check, User } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const packages = [
  {
    name: 'Bronze Experience',
    type: 'Single',
    duration: '2 Hours',
    price: '77,000',
    color: '#CD7F32',
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
    color: '#C0C0C0',
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
    color: '#7B2D8E',
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
    <section className="py-20 lg:py-24 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Spa Packages"
          title="Our"
          highlight="Packages"
          description="Choose from our signature spa packages crafted for ultimate relaxation and rejuvenation."
        />

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {packages.map((pkg, idx) => (
            <div
              key={idx}
              className={`relative bg-white rounded-xl overflow-hidden transition-all duration-300 ${
                pkg.popular 
                  ? 'ring-2 ring-[#7B2D8E]' 
                  : 'border border-gray-200 hover:border-[#7B2D8E]/30'
              }`}
            >
              {pkg.popular && (
                <div className="bg-[#7B2D8E] text-white text-xs font-bold uppercase tracking-wide text-center py-2">
                  Most Popular
                </div>
              )}
              
              <div className="p-6">
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-5">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${pkg.color}20` }}
                  >
                    <User className="w-6 h-6" style={{ color: pkg.color }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                    <p className="text-sm text-[#7B2D8E]">{pkg.type}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <span className="text-sm text-gray-500">Starting from</span>
                  <div className="text-2xl font-bold text-gray-900">N{pkg.price}</div>
                </div>

                {/* Duration */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7B2D8E]/10 rounded-full mb-5">
                  <Clock className="w-4 h-4 text-[#7B2D8E]" />
                  <span className="text-sm font-medium text-[#7B2D8E]">{pkg.duration}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-[#7B2D8E]" />
                      </div>
                      <span className="text-sm text-gray-600 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/booking"
                  className={`block w-full py-3 text-center text-base font-semibold rounded-xl transition-colors ${
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
            className="inline-flex items-center gap-2 text-base font-semibold text-[#7B2D8E] hover:underline"
          >
            View all packages including couples
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
