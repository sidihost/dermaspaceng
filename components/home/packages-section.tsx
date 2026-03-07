'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const packages = [
  {
    name: 'Bronze Experience',
    type: 'Single',
    price: '77,000',
    duration: '2 Hours',
    features: [
      'Deep Tissue Massage/Swedish Massage',
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
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth N20,000',
    ],
    popular: false,
  },
  {
    name: 'Gold Experience',
    type: 'Single',
    price: '141,000',
    duration: '3 Hours 30 Mins',
    features: [
      'Deep Tissue Massage/Swedish Massage',
      'Detox Body Scrub (Salt/Sugar) + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax treatment worth N20,000',
    ],
    popular: true,
  },
]

export function PackagesSection() {
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
    <section ref={sectionRef} className="py-24 bg-white relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-30">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
            Spa Packages
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-balance">
            Choose Your <span className="gradient-text">Experience</span>
          </h2>
          <p className="mt-6 text-lg text-gray-600 text-pretty">
            Indulge in our carefully curated spa packages designed for ultimate relaxation and rejuvenation
          </p>
        </div>

        {/* Packages Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <div
              key={pkg.name}
              className={cn(
                'relative rounded-2xl border-2 transition-all duration-500 overflow-hidden',
                pkg.popular 
                  ? 'border-[#7B2D8E] bg-gradient-to-b from-[#7B2D8E]/5 to-white' 
                  : 'border-gray-200 bg-white hover:border-[#7B2D8E]/30',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute top-0 left-0 right-0 bg-[#7B2D8E] text-white text-center py-2 text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className={cn('p-8', pkg.popular && 'pt-14')}>
                {/* Package Name */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                  <span className="text-sm text-[#7B2D8E] font-medium">{pkg.type}</span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-sm text-gray-500">Starting from</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">N{pkg.price}</span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 mb-6 text-gray-600">
                  <Clock className="w-5 h-5 text-[#7B2D8E]" />
                  <span>{pkg.duration}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-[#7B2D8E]" />
                      </div>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  asChild
                  className={cn(
                    'w-full rounded-full h-12',
                    pkg.popular 
                      ? 'bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white' 
                      : 'bg-white border-2 border-[#7B2D8E] text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white'
                  )}
                >
                  <Link href="/booking">Book Now</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Packages */}
        <div className="mt-12 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-[#7B2D8E] font-semibold hover:underline"
          >
            View All Packages & Couple Experiences
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
