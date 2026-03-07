'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Zap } from 'lucide-react'
import { SectionTitle } from '@/components/ui/section-title'

const services = [
  {
    title: 'Body Treatments',
    description: 'Full body massages, wraps, and scrubs. Pure relaxation meets rejuvenation.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    href: '/services/body-treatments',
    icon: '💆',
  },
  {
    title: 'Facial Treatments',
    description: 'Custom facials for every skin type. Hydration, brightening, and glow-ups.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
    icon: '✨',
  },
  {
    title: 'Nail Care',
    description: 'Manicures and pedicures that last. Beautiful nails, happy you.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    href: '/services/nail-care',
    icon: '💅',
  },
  {
    title: 'Waxing',
    description: 'Smooth skin that lasts weeks. Gentle on skin, effective always.',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    href: '/services/waxing',
    icon: '🌟',
  },
]

export default function ServicesSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-white">
      {/* Curved Background */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#7B2D8E]/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
        <SectionTitle
          label="Spa & Wellness"
          title="Treatments That"
          highlight="Transform You"
          description="Each service is crafted with care, precision, and the finest products for your skin journey"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {services.map((service, idx) => (
            <Link
              key={service.title}
              href={service.href}
              className="group relative"
              style={{
                animation: `fade-in-up 0.6s ease-out ${idx * 100}ms forwards`,
                opacity: 0,
              }}
            >
              <div className="relative h-full bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-[#7B2D8E]/40 transition-all duration-300 p-6 flex flex-col hover:shadow-xl hover:shadow-[#7B2D8E]/10">
                
                {/* Top Curve Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4A853] via-[#7B2D8E] to-transparent" />

                {/* Image */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6 -mx-6 -mt-6">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
                </div>

                {/* Icon */}
                <div className="text-4xl mb-4">{service.icon}</div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#7B2D8E] transition-colors">
                  {service.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                  {service.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-wider">
                    Learn More
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#D4A853] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
