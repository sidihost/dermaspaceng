'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/section-title'

const packages = [
  {
    name: 'Bronze Experience',
    type: 'Single',
    price: '77,000',
    duration: '2 Hours',
    features: [
      'Deep Tissue/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
  },
  {
    name: 'Silver Experience',
    type: 'Single',
    price: '97,000',
    duration: '3 Hours 50 Mins',
    features: [
      'Deep Tissue/Swedish Massage',
      'Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax (N20,000 value)',
    ],
    popular: false,
  },
  {
    name: 'Gold Experience',
    type: 'Single',
    price: '141,000',
    duration: '3 Hours 30 Mins',
    features: [
      'Deep Tissue/Swedish Massage',
      'Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax (N20,000 value)',
    ],
    popular: true,
  },
]

export default function PackagesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 bg-white relative overflow-hidden">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
      
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-72 h-72 opacity-20">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 relative z-10">
        {/* Section Header */}
        <SectionTitle
          label="Spa Packages"
          title="Choose Your"
          highlight="Experience"
          description="Indulge in our carefully curated spa packages designed for ultimate relaxation"
        />

        {/* Packages Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {packages.map((pkg, index) => (
            <div
              key={pkg.name}
              className={cn(
                'relative rounded-2xl border transition-all duration-500 overflow-hidden',
                pkg.popular 
                  ? 'border-[#7B2D8E] bg-gradient-to-b from-[#7B2D8E]/5 to-white' 
                  : 'border-gray-200 bg-white hover:border-[#7B2D8E]/30',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#7B2D8E] to-[#C41E8E] text-white text-center py-1.5 text-[10px] font-medium uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className={cn('p-6', pkg.popular && 'pt-10')}>
                {/* Package Name */}
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900">{pkg.name}</h3>
                  <span className="text-[10px] text-[#7B2D8E] font-medium uppercase tracking-wider">{pkg.type}</span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Starting from</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">N{pkg.price}</span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1.5 mb-5 text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  <span className="text-xs">{pkg.duration}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mt-0.5">
                        <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                      </div>
                      <span className="text-xs text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  asChild
                  size="sm"
                  className={cn(
                    'w-full rounded-full h-10 text-xs',
                    pkg.popular 
                      ? 'bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white' 
                      : 'bg-white border border-[#7B2D8E]/30 text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white'
                  )}
                >
                  <Link href="/booking">Book Now</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Packages */}
        <div className="mt-10 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-1.5 text-[#7B2D8E] font-medium text-xs hover:underline"
          >
            View All Packages & Couple Experiences
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
    </section>
  )
}
