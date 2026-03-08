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
    size: 'large',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg',
    alt: 'Ikoyi Reception',
    location: 'Ikoyi',
    title: 'Welcome Lounge',
    size: 'medium',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%288%29-7srs2qstY6dOLqJY5AtU5ZfiIrAHDS.jpg',
    alt: 'Nail Station',
    location: 'Victoria Island',
    title: 'Nail Studio',
    size: 'medium',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed-1B2YmB1N9JklXqCJgRwJNxRBN10kKZ.jpg',
    alt: 'Treatment Room',
    location: 'Ikoyi',
    title: 'Treatment Suite',
    size: 'small',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg',
    alt: 'VI Lobby',
    location: 'Victoria Island',
    title: 'Grand Lobby',
    size: 'small',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%286%29-f9QvkWyo3KI3xcr1QfDkGxiU2DIgqJ.jpg',
    alt: 'Dual Treatment Room',
    location: 'Ikoyi',
    title: 'Couples Suite',
    size: 'small',
  },
]

export default function GalleryPreview() {
  return (
    <section className="py-20 bg-[#FDFBF9]">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Our Spaces"
          title="Step Inside"
          highlight="Dermaspace"
          description="Explore our beautifully designed spaces where luxury meets tranquility."
        />

        {/* Bento Grid Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {/* Large Image - spans 2 columns and 2 rows */}
          <div className="col-span-2 row-span-2 relative group rounded-2xl overflow-hidden aspect-square md:aspect-auto">
            <img
              src={galleryItems[0].src}
              alt={galleryItems[0].alt}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7B2D8E] rounded-full text-[10px] font-medium text-white mb-2">
                <MapPin className="w-2.5 h-2.5" />
                {galleryItems[0].location}
              </span>
              <h3 className="text-sm font-semibold text-white">{galleryItems[0].title}</h3>
            </div>
          </div>

          {/* Medium Images */}
          {galleryItems.slice(1, 3).map((item, index) => (
            <div key={index} className="relative group rounded-2xl overflow-hidden aspect-square">
              <img
                src={item.src}
                alt={item.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7B2D8E] rounded-full text-[10px] font-medium text-white mb-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {item.location}
                </span>
                <h3 className="text-xs font-semibold text-white">{item.title}</h3>
              </div>
            </div>
          ))}

          {/* Small Images */}
          {galleryItems.slice(3, 6).map((item, index) => (
            <div key={index} className="relative group rounded-2xl overflow-hidden aspect-square">
              <img
                src={item.src}
                alt={item.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7B2D8E] rounded-full text-[10px] font-medium text-white mb-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {item.location}
                </span>
                <h3 className="text-xs font-semibold text-white">{item.title}</h3>
              </div>
            </div>
          ))}

          {/* View More Card */}
          <Link 
            href="/gallery" 
            className="relative group rounded-2xl overflow-hidden aspect-square bg-[#7B2D8E] flex flex-col items-center justify-center p-4 hover:bg-[#6B2278] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white text-center">View Full Gallery</span>
            <span className="text-xs text-white/70 mt-1">20+ Photos</span>
          </Link>
        </div>

        {/* Location Tags */}
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700">
            <span className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
            Victoria Island
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700">
            <span className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
            Ikoyi
          </span>
        </div>
      </div>
    </section>
  )
}
