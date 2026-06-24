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
    tag: 'Relax & restore',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    href: '/services/body-treatments',
  },
  {
    title: 'Facial Treatments',
    desc: 'Cleansing, peels and acne care',
    tag: 'Skin health',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    href: '/services/facial-treatments',
  },
  {
    title: 'Nail Care',
    desc: 'Mani, pedi, gel and soak-off',
    tag: 'Hands & feet',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp',
    href: '/services/nail-care',
  },
  {
    title: 'Waxing',
    desc: 'Full body, Brazilian and face',
    tag: 'Smooth finish',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    href: '/services/waxing',
  },
]

export default function ServicesSection() {
  return (
    // Standard home-section rhythm: 48px mobile, 64px desktop.
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Services"
          title="What we"
          highlight="do"
          description="Facials, massages, nails and waxing. Four things, done properly."
        />

        {/* Services Grid — editorial cards with the title and description
            overlaid on the imagery behind a gradient scrim for a more
            premium feel. Hover lifts the card and reveals a brand ring. */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group relative block rounded-2xl"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-gray-200/80 transition-all duration-300 group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-[#7B2D8E] group-hover:shadow-xl group-hover:shadow-[#7B2D8E]/10">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient scrim so the white text stays legible over any image */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                {/* Category tag */}
                <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#7B2D8E] backdrop-blur-sm">
                  {service.tag}
                </span>

                {/* Save-for-later heart sits on top-right so users can
                    shortlist a category without leaving the homepage. */}
                <div className="absolute right-3 top-3 z-10">
                  <FavoriteButton
                    itemType="category"
                    itemId={service.href}
                    label={service.title}
                    href={service.href}
                    variant="overlay"
                  />
                </div>

                {/* Overlaid content */}
                <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                  <h3 className="text-lg font-bold text-white">
                    {service.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-white/80">
                    {service.desc}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white">
                    Learn more
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Section CTA */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-full bg-[#7B2D8E] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5A1D6A]"
          >
            View all services
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
