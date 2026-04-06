'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const galleryItems = [
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
    alt: 'Reception Area',
    location: 'Victoria Island',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3360.JPG-bJ57ZV3Wl1GImeuHYSeNTlnS0GUCVs.jpeg',
    alt: 'Reception',
    location: 'Ikoyi',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg',
    alt: 'Lobby',
    location: 'Victoria Island',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3358.JPG-v11vKVvcuEj7al4KIOnMq1wd8H5dic.jpeg',
    alt: 'Lounge Area',
    location: 'Ikoyi',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2811%29-PxOYury3WDyxhPQkF5P1zxryCDeUzW.jpg',
    alt: 'Massage Room',
    location: 'Victoria Island',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_3369.JPG-Tv3PEg3TqjOgEem6DAtDw5Pk4MrqA5.jpeg',
    alt: 'Massage Suite',
    location: 'Ikoyi',
  },
]

export default function GalleryPreview() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIndex, setModalIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Open modal with selected image
  const openModal = (index: number) => {
    setModalIndex(index)
    setModalOpen(true)
    setIsPaused(true)
  }

  // Close modal
  const closeModal = () => {
    setModalOpen(false)
    setIsPaused(false)
  }

  // Navigate in modal
  const modalPrev = () => {
    setModalIndex(modalIndex === 0 ? galleryItems.length - 1 : modalIndex - 1)
  }

  const modalNext = () => {
    setModalIndex((modalIndex + 1) % galleryItems.length)
  }

  // Handle keyboard navigation in modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!modalOpen) return
      if (e.key === 'Escape') closeModal()
      if (e.key === 'ArrowLeft') modalPrev()
      if (e.key === 'ArrowRight') modalNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalOpen, modalIndex])

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (isPaused) return
    
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % galleryItems.length
      scrollToIndex(nextIndex)
    }, 4000)

    return () => clearInterval(interval)
  }, [currentIndex, isPaused])

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
    <section className="py-16 md:py-20 bg-white">
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
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {galleryItems.map((item, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[85%] sm:w-[70%] md:w-[45%] lg:w-[30%] snap-center"
              >
                <div 
                  className="relative aspect-[4/5] rounded-2xl overflow-hidden group cursor-pointer"
                  onClick={() => openModal(index)}
                >
                  {/* Image */}
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 85vw, (max-width: 768px) 70vw, (max-width: 1024px) 45vw, 30vw"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#7B2D8E]/0 group-hover:bg-[#7B2D8E]/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                      <ZoomIn className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                  </div>
                  
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

      {/* Fullscreen Modal */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-300"
          onClick={closeModal}
        >
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
            <span className="text-white text-sm font-medium">{modalIndex + 1} / {galleryItems.length}</span>
          </div>

          {/* Main Image Container */}
          <div 
            className="relative w-full h-full max-w-5xl max-h-[85vh] mx-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            <button
              onClick={modalPrev}
              className="absolute left-2 sm:left-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            {/* Image */}
            <div className="relative w-full h-full animate-in zoom-in-95 duration-300">
              <Image
                src={galleryItems[modalIndex].src}
                alt={galleryItems[modalIndex].alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Next Button */}
            <button
              onClick={modalNext}
              className="absolute right-2 sm:right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Bottom Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-8">
            <div className="max-w-5xl mx-auto text-center">
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">
                {galleryItems[modalIndex].alt}
              </h3>
              <div className="flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                <span className="text-white/80">{galleryItems[modalIndex].location}</span>
              </div>
              
              {/* Thumbnail Navigation */}
              <div className="flex items-center justify-center gap-2 mt-6 overflow-x-auto pb-2">
                {galleryItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setModalIndex(index)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-200 ${
                      index === modalIndex 
                        ? 'ring-2 ring-[#7B2D8E] ring-offset-2 ring-offset-black scale-110' 
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
