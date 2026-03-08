'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const services = [
  {
    title: 'Body Treatments',
    desc: 'Massages & scrubs for total relaxation',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    href: '/services/body-treatments',
  },
  {
    title: 'Facial Treatments',
    desc: 'Customized facials for glowing skin',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
  },
  {
    title: 'Nail Care',
    desc: 'Manicures & pedicures that last',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    href: '/services/nail-care',
  },
  {
    title: 'Waxing',
    desc: 'Smooth skin that lasts for weeks',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    href: '/services/waxing',
  },
]

export default function ServicesSection() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader 
          badge="Our Services"
          title="What We"
          highlight="Offer"
          description="Indulge in our carefully curated range of treatments designed to rejuvenate your body and soul."
        />

        {/* Services Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group"
            >
              <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-lg transition-all duration-300">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4 md:p-5">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors mb-1 sm:mb-2 font-serif">
                    {service.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 line-clamp-2">
                    {service.desc}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#7B2D8E]">
                    Learn more
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
