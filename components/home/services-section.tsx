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
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        <SectionHeader 
          badge="Our Services"
          title="What We"
          highlight="Offer"
          description="Indulge in our carefully curated range of treatments designed to rejuvenate your body and soul."
        />

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group"
            >
              <div className="card-hover bg-white rounded-xl overflow-hidden border border-gray-100">
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
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors mb-1">
                    {service.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {service.desc}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B2D8E]">
                    Learn more
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
