'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const galleryItems = [
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
    alt: 'VI Reception',
    location: 'Victoria Island',
    title: 'Grand Reception',
    description: 'Where your relaxation journey begins',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg',
    alt: 'Ikoyi Reception',
    location: 'Ikoyi',
    title: 'Welcome Lounge',
    description: 'Elegant comfort awaits you',
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Auto play
  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % galleryItems.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? galleryItems.length - 1 : prev - 1))
    setIsAutoPlaying(false)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % galleryItems.length)
    setIsAutoPlaying(false)
  }

  return (
    <section className="py-20 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Our Spaces"
          title="Step Inside"
          highlight="Dermaspace"
          description="Explore our beautifully designed spaces where luxury meets tranquility."
        />

        {/* Main Carousel */}
        <div className="relative mb-8">
          {/* Main Image Container */}
          <div 
            ref={carouselRef}
            className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden bg-gray-100"
          >
            {galleryItems.map((item, index) => (
              <div
                key={item.alt}
                className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                  index === currentIndex 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-105'
                }`}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-full object-cover"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B2D8E] rounded-full text-xs font-medium text-white mb-3">
                        <MapPin className="w-3 h-3" />
                        {item.location}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-white/80">
                        {item.description}
                      </p>
                    </div>
                    
                    {/* Slide Counter */}
                    <div className="hidden md:flex items-center gap-2 text-white/80">
                      <span className="text-2xl font-bold text-white">{String(currentIndex + 1).padStart(2, '0')}</span>
                      <span className="text-sm">/</span>
                      <span className="text-sm">{String(galleryItems.length).padStart(2, '0')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation Arrows */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              style={{ opacity: 1 }}
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              style={{ opacity: 1 }}
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>
          </div>

          {/* Dot Indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {galleryItems.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-8 bg-[#7B2D8E]' 
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {galleryItems.map((item, index) => (
            <button
              key={item.alt}
              onClick={() => goToSlide(index)}
              className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                index === currentIndex 
                  ? 'ring-2 ring-[#7B2D8E] ring-offset-2' 
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={item.src}
                alt={item.alt}
                className="w-full h-full object-cover"
              />
              {index === currentIndex && (
                <div className="absolute inset-0 bg-[#7B2D8E]/20" />
              )}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#6B2278] transition-colors"
          >
            View Full Gallery
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
