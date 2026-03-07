'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Check, User } from 'lucide-react'

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
    color: '#D4A853',
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
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A853] mb-2">
            Spa Packages
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Our Packages
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {packages.map((pkg, idx) => (
            <div
              key={idx}
              className={`relative bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg ${
                pkg.popular 
                  ? 'ring-2 ring-[#7B2D8E] shadow-md' 
                  : 'border border-gray-200'
              }`}
            >
              {pkg.popular && (
                <div className="bg-[#7B2D8E] text-white text-[10px] font-bold uppercase tracking-wide text-center py-1.5">
                  Most Popular
                </div>
              )}
              
              <div className="p-5">
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${pkg.color}20` }}
                  >
                    <User className="w-5 h-5" style={{ color: pkg.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{pkg.name}</h3>
                    <p className="text-[10px] text-[#7B2D8E]">{pkg.type}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-[10px] text-gray-500">Starting from</span>
                  <div className="text-xl font-bold text-gray-900">N{pkg.price}</div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs">{pkg.duration}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mt-0.5">
                        <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                      </div>
                      <span className="text-[11px] text-gray-600 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/booking"
                  className={`block w-full py-2.5 text-center text-xs font-semibold rounded-lg transition-colors ${
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
