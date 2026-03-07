'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/section-title'

const services = [
  {
    title: 'Body Treatments',
    description: 'Luxurious treatments for complete relaxation',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    href: '/services/body-treatments',
  },
  {
    title: 'Facial Treatment',
    description: 'Rejuvenate with expert facial therapies',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
  },
  {
    title: 'Nail Care',
    description: 'Perfect manicures and pedicures',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    href: '/services/nail-care',
  },
  {
    title: 'Waxing',
    description: 'Smooth, hair-free skin with gentle care',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    href: '/services/waxing',
  },
  {
    title: 'Acne Treatments',
    description: 'Clear skin with targeted solutions',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6468-2-2048x1463.jpg-1024x732-1-dKeUu4w0K7uutGPH5gmeN7nXrcuOu2.webp',
    href: '/services/facial-treatments#acne',
  },
  {
    title: 'Micro Needling',
    description: 'Revolutionary skin rejuvenation',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6468-2-2048x1463.jpg-1024x732-1-dKeUu4w0K7uutGPH5gmeN7nXrcuOu2.webp',
    href: '/services/facial-treatments#microneedling',
  },
]

export default function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visibleCards, setVisibleCards] = useState<number[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0')
            setVisibleCards((prev) => [...new Set([...prev, index])])
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const cards = sectionRef.current?.querySelectorAll('[data-index]')
    cards?.forEach((card) => observer.observe(card))

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 bg-white relative">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Section Header */}
        <SectionTitle
          label="Our Services"
          title="Premium Spa &"
          highlight="Wellness Services"
          description="Discover our range of expertly crafted treatments designed to rejuvenate your body and mind"
        />

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, index) => (
            <Link
              key={service.title}
              href={service.href}
              data-index={index}
              className={cn(
                'group relative rounded-2xl overflow-hidden bg-white border border-gray-100 transition-all duration-500',
                'hover:border-[#7B2D8E]/20 hover:shadow-lg hover:shadow-[#7B2D8E]/5',
                visibleCards.includes(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-gray-900/20 to-transparent" />
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-[#7B2D8E]/0 group-hover:bg-[#7B2D8E]/20 transition-colors duration-300" />
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                  {service.title}
                </h3>
                <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                  {service.description}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[#7B2D8E] font-medium text-xs">
                  <span>Learn More</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
              
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#7B2D8E]/10 to-transparent -translate-y-8 translate-x-8 rotate-45 group-hover:from-[#7B2D8E]/20 transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* View All CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#7B2D8E]/30 text-[#7B2D8E] font-medium text-xs hover:bg-[#7B2D8E] hover:text-white hover:border-[#7B2D8E] transition-all"
          >
            View All Services
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
    </section>
  )
}
