'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import { useGeo } from '@/lib/geo-context'

const laserTreatments = [
  {
    title: 'Laser Hair Removal',
    desc: 'Permanent hair reduction for smooth, flawless skin',
    image: '/images/laser-hair-removal-ng.jpg',
    price: 20000,
  },
  {
    title: 'Skin Rejuvenation',
    desc: 'Brighten and restore your natural glow',
    image: '/images/laser-rejuvenation-ng.jpg',
    price: 20000,
  },
  {
    title: 'Carbon Peel',
    desc: 'Hollywood-favorite treatment for radiant skin',
    image: '/images/carbon-peel-ng.jpg',
    price: 30000,
  },
]

const benefits = [
  'FDA-approved technology',
  'Suitable for all skin types',
  'Long-lasting results',
  'Professional certified staff',
]

export default function LaserSection() {
  const { formatPrice } = useGeo()
  
  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Advanced Technology"
          title="Laser"
          highlight="Tech"
          description="Experience cutting-edge laser treatments for hair removal, skin rejuvenation, and the famous Hollywood Carbon Peel."
        />

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left - Feature Image with Overlay */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="/images/laser-hero-ng.jpg"
                alt="Laser Treatment at Dermaspace"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/80 via-[#7B2D8E]/20 to-transparent" />
              
              {/* Floating Card */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                    <span className="text-white text-lg font-bold">{formatPrice(1).charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Starting from</p>
                    <p className="text-lg font-bold text-gray-900">{formatPrice(20000)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                      </div>
                      <span className="text-[10px] text-gray-600">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right - Treatment Cards */}
          <div className="space-y-4">
            {laserTreatments.map((treatment, index) => (
              <Link
                key={treatment.title}
                href="/laser-tech"
                className="group flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-md transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={treatment.image}
                    alt={treatment.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-0.5 rounded-full">
                      {index === 2 ? 'Popular' : 'Advanced'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#7B2D8E] transition-colors mb-0.5">
                    {treatment.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-1">{treatment.desc}</p>
                  <p className="text-xs font-semibold text-[#7B2D8E]">From {formatPrice(treatment.price)}</p>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#7B2D8E] group-hover:translate-x-1 transition-all flex-shrink-0" />
              </Link>
            ))}

            {/* CTA Button */}
            <Link
              href="/laser-tech"
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              View All Laser Treatments
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
