'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const galleryItems = [
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
    alt: 'Reception Area',
    location: 'Victoria Island',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg',
    alt: 'Reception Lounge',
    location: 'Ikoyi',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg',
    alt: 'Lobby',
    location: 'Victoria Island',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%284%29-mZaq51DsDVVT7BWQbPsKXjeDJytDMS.jpg',
    alt: 'Lounge Area',
    location: 'Ikoyi',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2811%29-PxOYury3WDyxhPQkF5P1zxryCDeUzW.jpg',
    alt: 'Massage Room',
    location: 'Victoria Island',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%286%29-f9QvkWyo3KI3xcr1QfDkGxiU2DIgqJ.jpg',
    alt: 'Couples Suite',
    location: 'Ikoyi',
  },
]

export default function GalleryPreview() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const nextImage = () => setLightboxIndex(prev => prev !== null ? (prev + 1) % galleryItems.length : null)
  const prevImage = () => setLightboxIndex(prev => prev !== null ? (prev - 1 + galleryItems.length) % galleryItems.length : null)

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Our Spaces"
          title="Step Inside"
          highlight="Dermaspace"
          description="Explore our beautifully designed spaces where luxury meets tranquility."
        />

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
          {galleryItems.map((item, index) => (
            <div 
              key={index}
              onClick={() => openLightbox(index)}
              className={`relative group cursor-pointer rounded-2xl overflow-hidden bg-gray-100 ${
                index === 0 ? 'col-span-2 row-span-2 aspect-[4/3] md:aspect-square' : 'aspect-square'
              }`}
            >
              {/* Image */}
              <img
                src={item.src}
                alt={item.alt}
                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300" />
              
              {/* Zoom Icon */}
              <div className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-50">
                <ZoomIn className="w-4 h-4 text-white" />
              </div>
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7B2D8E] rounded-full">
                    <MapPin className="w-2.5 h-2.5 text-white" />
                    <span className="text-[10px] font-medium text-white">{item.location}</span>
                  </span>
                </div>
                <h3 className={`font-semibold text-white ${index === 0 ? 'text-lg' : 'text-sm'}`}>{item.alt}</h3>
              </div>
              
              {/* Border glow on hover */}
              <div className="absolute inset-0 rounded-2xl border-2 border-white/0 group-hover:border-white/30 transition-all duration-300" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link 
            href="/gallery" 
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-lg hover:bg-[#6B2278] transition-colors"
          >
            View Full Gallery
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          {/* Prev Button */}
          <button
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          {/* Image Container */}
          <div 
            className="max-w-5xl max-h-[85vh] mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryItems[lightboxIndex].src}
              alt={galleryItems[lightboxIndex].alt}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            
            {/* Image Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7B2D8E] rounded-full">
                  <MapPin className="w-2.5 h-2.5 text-white" />
                  <span className="text-[10px] font-medium text-white">{galleryItems[lightboxIndex].location}</span>
                </span>
              </div>
              <h3 className="text-white font-semibold">{galleryItems[lightboxIndex].alt}</h3>
            </div>
          </div>
          
          {/* Next Button */}
          <button
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
          
          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
            <span className="text-white text-sm font-medium">{lightboxIndex + 1} / {galleryItems.length}</span>
          </div>
        </div>
      )}
    </section>
  )
}
