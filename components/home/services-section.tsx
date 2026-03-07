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
    description: 'Luxurious massages and body wraps for complete relaxation and rejuvenation',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    href: '/services/body-treatments',
  },
  {
    title: 'Facial Treatment',
    description: 'Advanced facial therapies to rejuvenate and restore your natural glow',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
  },
  {
    title: 'Nail Care',
    description: 'Professional manicures and pedicures with premium nail artistry',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    href: '/services/nail-care',
  },
  {
    title: 'Waxing',
    description: 'Smooth, hair-free skin with our gentle and effective waxing services',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    href: '/services/waxing',
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
    <section ref={sectionRef} className="py-24 bg-[#faf8fc] relative">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[#7B2D8E]/10" />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <SectionTitle
          label="Our Services"
          title="Premium Spa &"
          highlight="Wellness Services"
          description="Discover our range of expertly crafted treatments designed to rejuvenate your body and mind"
        />

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <Link
              key={service.title}
              href={service.href}
              data-index={index}
              className={cn(
                'group relative rounded-3xl overflow-hidden bg-white transition-all duration-700',
                'hover:shadow-2xl hover:shadow-[#7B2D8E]/10',
                visibleCards.includes(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="relative w-full md:w-2/5 h-64 md:h-auto overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-white/30 md:bg-white/60" />
                </div>

                {/* Content */}
                <div className="flex-1 p-8 flex flex-col justify-center">
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-[#7B2D8E] transition-colors mb-3">
                    {service.title}
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed mb-6">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-2 text-[#7B2D8E] font-semibold">
                    <span>Explore Service</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </div>
              
              {/* Decorative Border */}
              <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-[#7B2D8E]/20 transition-colors pointer-events-none" />
            </Link>
          ))}
        </div>

        {/* View All CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-[#7B2D8E] text-white font-semibold text-lg hover:bg-[#5A1D6A] transition-all shadow-xl shadow-[#7B2D8E]/20"
          >
            View All Services
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#7B2D8E]/10" />
    </section>
  )
}
