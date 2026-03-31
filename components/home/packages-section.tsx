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
    price: 77000,
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
    price: 97000,
    color: '#C0C0C0',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 20,000',
    ],
  },
  {
    name: 'Gold Experience',
    type: 'Single',
    duration: '3 Hours 30 Mins',
    price: 141000,
    color: '#7B2D8E',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth 20,000',
    ],
    popular: true,
  },
]

export default function PackagesSection() {
  const { formatPrice } = useGeo()
  
  return (
    <section className="py-16 bg-white">
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
                  <div className="text-xl font-bold text-gray-900">{formatPrice(pkg.price)}</div>
                </div>

                {/* Duration */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#7B2D8E]/10 rounded-full mb-4">
                  <Clock className="w-3 h-3 text-[#7B2D8E]" />
                  <span className="text-xs font-medium text-[#7B2D8E]">{pkg.duration}</span>
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
