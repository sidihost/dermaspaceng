'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import { useGeo } from '@/lib/geo-context'
import {
  LaserHairRemovalIllustration,
  LaserMiniThumb,
} from '@/components/laser/laser-illustrations'

const laserTreatments: Array<{
  title: string
  desc: string
  thumbVariant: 'hair-removal' | 'rejuvenation' | 'carbon-peel'
  price: number
}> = [
  {
    title: 'Laser Hair Removal',
    desc: 'Six sessions, gone for good (mostly)',
    thumbVariant: 'hair-removal',
    price: 20000,
  },
  {
    title: 'Skin Rejuvenation',
    desc: 'Even tone, fewer marks, brighter overall',
    thumbVariant: 'rejuvenation',
    price: 20000,
  },
  {
    title: 'Carbon Peel',
    desc: 'The one celebrities ask for — glass skin, fast',
    thumbVariant: 'carbon-peel',
    price: 30000,
  },
]

const benefits = [
  'FDA-cleared machines',
  'Works on darker skin tones',
  'Results hold for months',
  'Run by certified therapists',
]

export default function LaserSection() {
  const { formatPrice } = useGeo()

  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader
          badge="Laser"
          title="Laser"
          highlight="technology"
          description="Hair removal, skin resurfacing, and the Hollywood Carbon Peel — all run by certified therapists."
        />

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left - Static Dermaspace Laser Illustration with Flat Info Card */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#7B2D8E]/15 bg-[#7B2D8E]">
              <LaserHairRemovalIllustration className="absolute inset-0 w-full h-full" />

              {/* Floating Card (flat solid fill, zero shadow, zero gradient) */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 rounded-xl p-4 border border-[#7B2D8E]/15">
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
                className="group flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-100 hover:border-[#7B2D8E]/40 hover:bg-[#F5ECF8]/25 transition-colors duration-300"
              >
                {/* Thumbnail */}
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-[#7B2D8E]/15">
                  <LaserMiniThumb variant={treatment.thumbVariant} />
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
