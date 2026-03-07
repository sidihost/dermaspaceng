'use client'

import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const galleryItems = [
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
    alt: 'VI Reception',
    location: 'Victoria Island',
    title: 'Grand Reception',
    description: 'Where your relaxation journey begins',
    featured: true,
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg',
    alt: 'Ikoyi Reception',
    location: 'Ikoyi',
    title: 'Welcome Lounge',
    description: 'Elegant comfort awaits you',
    featured: true,
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg',
    alt: 'Nail Station',
    location: 'Victoria Island',
    title: 'Nail Studio',
    description: 'Precision artistry for your nails',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed-1B2YmB1N9JklXqCJgRwJNxRBN10kKZ.jpg',
    alt: 'Treatment Room',
    location: 'Ikoyi',
    title: 'Treatment Suite',
    description: 'Private sanctuary for wellness',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg',
    alt: 'VI Lobby',
    location: 'Victoria Island',
    title: 'Grand Lobby',
    description: 'Modern luxury meets warmth',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%286%29-f9QvkWyo3KI3xcr1QfDkGxiU2DIgqJ.jpg',
    alt: 'Dual Treatment Room',
    location: 'Ikoyi',
    title: 'Couples Suite',
    description: 'Share the experience together',
  },
]

export default function GalleryPreview() {
  const featured = galleryItems.filter(item => item.featured)
  const regular = galleryItems.filter(item => !item.featured)

  return (
    <section className="py-20 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Our Spaces"
          title="Step Inside"
          highlight="Dermaspace"
          description="Explore our beautifully designed spaces where luxury meets tranquility across our two locations."
        />

        {/* Featured Images - Large Cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {featured.map((item) => (
            <div
              key={item.alt}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.src}
                  alt={item.alt}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
                    <MapPin className="w-3 h-3 text-[#7B2D8E]" />
                    {item.location}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#7B2D8E] transition-colors mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Regular Images - Smaller Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {regular.map((item) => (
            <div
              key={item.alt}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={item.src}
                  alt={item.alt}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
                    <MapPin className="w-3 h-3 text-[#7B2D8E]" />
                    {item.location}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold text-gray-900 group-hover:text-[#7B2D8E] transition-colors mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-semibold rounded-full hover:bg-[#6B2278] transition-colors"
          >
            View Full Gallery
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
