'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import FavoriteButton from '@/components/favorite-button'

const services = [
  {
    title: 'Body Treatments',
    desc: 'Massages, scrubs and steam',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    href: '/services/body-treatments',
  },
  {
    title: 'Facial Treatments',
    desc: 'Cleansing, peels and acne care',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
  },
  {
    title: 'Nail Care',
    desc: 'Mani, pedi, gel and soak-off',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    href: '/services/nail-care',
  },
  {
    title: 'Waxing',
    desc: 'Full body, Brazilian and face',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    href: '/services/waxing',
  },
]

export default function ServicesSection() {
  return (
    // Standard home-section rhythm: 48px mobile, 64px desktop.
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Services"
          title="What we"
          highlight="do"
          description="Facials, massages, nails and waxing. Four things, done properly."
        />

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group"
            >
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#7B2D8E]/30 transition-all duration-300">
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Save-for-later heart sits on top-right so users can
                      shortlist a category without leaving the homepage. */}
                  <div className="absolute top-3 right-3 z-10">
                    <FavoriteButton
                      itemType="category"
                      itemId={service.href}
                      label={service.title}
                      href={service.href}
                      variant="overlay"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-[#7B2D8E] transition-colors mb-1">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {service.desc}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#7B2D8E]">
                    Learn more
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
