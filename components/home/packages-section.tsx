'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, Clock, ArrowRight, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/section-title'

const packages = [
  {
    name: 'Bronze Experience',
    type: 'Single',
    price: '77,000',
    duration: '2 Hours',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    features: [
      'Deep Tissue/Swedish Massage',
      'Deep Cleansing Facial',
    ],
    popular: false,
    color: '#CD7F32',
  },
  {
    name: 'Silver Experience',
    type: 'Single',
    price: '97,000',
    duration: '3 Hours 50 Mins',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    features: [
      'Deep Tissue/Swedish Massage',
      'Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax (N20,000 value)',
    ],
    popular: false,
    color: '#C0C0C0',
  },
  {
    name: 'Gold Experience',
    type: 'Single',
    price: '141,000',
    duration: '3 Hours 30 Mins',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp',
    features: [
      'Deep Tissue/Swedish Massage',
      'Detox Body Scrub + Steam',
      'Deep Cleansing Facial',
      'ManiPedi or Wax (N20,000 value)',
    ],
    popular: true,
    color: '#D4A853',
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
    <section ref={sectionRef} className="py-24 bg-white relative overflow-hidden">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[#7B2D8E]/10" />
      
      {/* Background Decorations */}
      <div className="absolute top-20 right-0 w-96 h-96 opacity-5">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        {/* Section Header */}
        <SectionTitle
          label="Spa Packages"
          title="Choose Your Perfect"
          highlight="Experience"
          description="Indulge in our carefully curated spa packages designed for ultimate relaxation and rejuvenation"
        />

        {/* Packages Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <div
              key={pkg.name}
              className={cn(
                'relative rounded-3xl overflow-hidden transition-all duration-700 group',
                pkg.popular ? 'md:-mt-4 md:mb-4' : '',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              )}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Card Background */}
              <div className={cn(
                'absolute inset-0 rounded-3xl transition-all duration-500',
                pkg.popular 
                  ? 'bg-[#7B2D8E] shadow-2xl shadow-[#7B2D8E]/30' 
                  : 'bg-white border-2 border-gray-100 group-hover:border-[#7B2D8E]/30 group-hover:shadow-xl'
              )} />

              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute top-0 left-0 right-0 z-10">
                  <div className="flex items-center justify-center gap-2 py-3 bg-[#D4A853] text-white">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-wide">MOST POPULAR</span>
                  </div>
                </div>
              )}

              <div className={cn('relative p-8', pkg.popular && 'pt-16')}>
                {/* Package Image */}
                <div className="relative h-48 -mx-8 -mt-8 mb-6 overflow-hidden">
                  {pkg.popular && <div className="absolute inset-0 bg-[#5A1D6A] z-0" />}
                  <Image
                    src={pkg.image}
                    alt={pkg.name}
                    fill
                    className={cn(
                      'object-cover transition-transform duration-700 group-hover:scale-110',
                      pkg.popular ? 'opacity-60 mt-8' : ''
                    )}
                  />
                  <div className={cn(
                    'absolute inset-0',
                    pkg.popular 
                      ? 'bg-[#7B2D8E]/40' 
                      : 'bg-white/60'
                  )} />
                </div>

                {/* Package Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: pkg.color }}
                    />
                    <span className={cn(
                      'text-sm font-medium uppercase tracking-wider',
                      pkg.popular ? 'text-white/70' : 'text-[#7B2D8E]'
                    )}>
                      {pkg.type}
                    </span>
                  </div>
                  <h3 className={cn(
                    'text-2xl font-bold',
                    pkg.popular ? 'text-white' : 'text-gray-900'
                  )}>
                    {pkg.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className={cn(
                    'text-sm',
                    pkg.popular ? 'text-white/60' : 'text-gray-500'
                  )}>
                    Starting from
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      'text-4xl font-bold',
                      pkg.popular ? 'text-white' : 'text-gray-900'
                    )}>
                      N{pkg.price}
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div className={cn(
                  'flex items-center gap-2 mb-6 pb-6 border-b',
                  pkg.popular ? 'border-white/20' : 'border-gray-100'
                )}>
                  <Clock className={cn(
                    'w-5 h-5',
                    pkg.popular ? 'text-[#D4A853]' : 'text-[#7B2D8E]'
                  )} />
                  <span className={cn(
                    'text-base font-medium',
                    pkg.popular ? 'text-white' : 'text-gray-700'
                  )}>
                    {pkg.duration}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
                        pkg.popular 
                          ? 'bg-[#D4A853]/20' 
                          : 'bg-[#7B2D8E]/10'
                      )}>
                        <Check className={cn(
                          'w-3.5 h-3.5',
                          pkg.popular ? 'text-[#D4A853]' : 'text-[#7B2D8E]'
                        )} />
                      </div>
                      <span className={cn(
                        'text-base',
                        pkg.popular ? 'text-white/90' : 'text-gray-600'
                      )}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'w-full rounded-full h-14 text-base font-semibold transition-all',
                    pkg.popular 
                      ? 'bg-white text-[#7B2D8E] hover:bg-[#D4A853] hover:text-white shadow-xl' 
                      : 'bg-[#7B2D8E] text-white hover:bg-[#5A1D6A] shadow-lg shadow-[#7B2D8E]/20'
                  )}
                >
                  <Link href="/booking">Book This Package</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Packages */}
        <div className="mt-16 text-center">
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 text-[#7B2D8E] font-semibold text-lg hover:underline underline-offset-4"
          >
            View All Packages & Couple Experiences
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#7B2D8E]/10" />
    </section>
  )
}
