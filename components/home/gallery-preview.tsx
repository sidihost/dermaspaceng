'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToIndex = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth * 0.85
      scrollRef.current.scrollTo({
        left: index * (cardWidth + 16),
        behavior: 'smooth'
      })
    }
    setCurrentIndex(index)
  }

  const goToPrev = () => {
    const newIndex = currentIndex === 0 ? galleryItems.length - 1 : currentIndex - 1
    scrollToIndex(newIndex)
  }

  const goToNext = () => {
    const newIndex = (currentIndex + 1) % galleryItems.length
    scrollToIndex(newIndex)
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth * 0.85 + 16
      const newIndex = Math.round(scrollRef.current.scrollLeft / cardWidth)
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < galleryItems.length) {
        setCurrentIndex(newIndex)
      }
    }
  }

  return (
    <section className="py-16 md:py-20 bg-[#FDFBF9]">
      <div className="max-w-7xl mx-auto">
        <div className="px-4">
          <SectionHeader 
            badge="Our Spaces"
            title="Step Inside"
            highlight="Dermaspace"
            description="Explore our beautifully designed wellness spaces"
          />
        </div>

        {/* Horizontal Scrollable Gallery */}
        <div className="relative mt-8">
          {/* Scroll Container */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {galleryItems.map((item, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[85%] sm:w-[70%] md:w-[45%] lg:w-[30%] snap-center"
              >
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden group">
                  {/* Image */}
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 85vw, (max-width: 768px) 70vw, (max-width: 1024px) 45vw, 30vw"
                  />
                  
                  {/* Bottom Info Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{item.alt}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#7B2D8E]" />
                          <span className="text-xs text-gray-500">{item.location}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 px-2 py-1 rounded-full">
                        {index + 1}/{galleryItems.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4 mt-6 px-4">
            <button
              onClick={goToPrev}
              className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 text-[#7B2D8E]" />
            </button>
            
            {/* Progress Dots */}
            <div className="flex items-center gap-2">
              {galleryItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'w-6 bg-[#7B2D8E]' 
                      : 'w-2 bg-[#7B2D8E]/30 hover:bg-[#7B2D8E]/50'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="w-10 h-10 bg-[#7B2D8E] rounded-full shadow-md flex items-center justify-center hover:bg-[#6B2278] transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8 px-4">
          <Link 
            href="/gallery" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#6B2278] transition-colors"
          >
            View Full Gallery
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
