'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, X, ChevronLeft, ChevronRight, Heart, Sparkles } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const galleryItems = [
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
    alt: 'Reception Area',
    location: 'Victoria Island',
    description: 'Our stunning reception welcomes you to luxury',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%285%29-VkcyTz8PjMrbdX5bmpmoWDFuRZ8i7A.jpg',
    alt: 'Reception Lounge',
    location: 'Ikoyi',
    description: 'Elegant lounge designed for your comfort',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%287%29-uPAMd1wS5LKr1CBsxxlm5KUOF1iMIh.jpg',
    alt: 'Lobby',
    location: 'Victoria Island',
    description: 'Step into serenity and tranquility',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%284%29-mZaq51DsDVVT7BWQbPsKXjeDJytDMS.jpg',
    alt: 'Lounge Area',
    location: 'Ikoyi',
    description: 'Relax in our beautifully curated spaces',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2811%29-PxOYury3WDyxhPQkF5P1zxryCDeUzW.jpg',
    alt: 'Massage Room',
    location: 'Victoria Island',
    description: 'Where healing touch meets luxury',
  },
  {
    src: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%286%29-f9QvkWyo3KI3xcr1QfDkGxiU2DIgqJ.jpg',
    alt: 'Couples Suite',
    location: 'Ikoyi',
    description: 'Perfect for romantic spa experiences',
  },
]

export default function GalleryPreview() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [liked, setLiked] = useState<number[]>([])
  const cardRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (clientX: number) => {
    setIsDragging(true)
    setStartX(clientX)
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return
    const diff = clientX - startX
    setOffsetX(diff)
  }

  const handleDragEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    const threshold = 100
    if (offsetX > threshold) {
      // Swiped right - like
      setDirection('right')
      if (!liked.includes(currentIndex)) {
        setLiked([...liked, currentIndex])
      }
      setTimeout(() => goToNext(), 300)
    } else if (offsetX < -threshold) {
      // Swiped left - skip
      setDirection('left')
      setTimeout(() => goToNext(), 300)
    }
    
    setOffsetX(0)
  }

  const goToNext = () => {
    setDirection(null)
    setCurrentIndex((prev) => (prev + 1) % galleryItems.length)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length)
  }

  const toggleLike = () => {
    if (liked.includes(currentIndex)) {
      setLiked(liked.filter(i => i !== currentIndex))
    } else {
      setLiked([...liked, currentIndex])
    }
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX)
  const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX)
  const handleTouchEnd = () => handleDragEnd()

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX)
  const handleMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX)
  const handleMouseUp = () => handleDragEnd()
  const handleMouseLeave = () => { if (isDragging) handleDragEnd() }

  const getCardStyle = () => {
    const rotate = offsetX * 0.1
    const opacity = 1 - Math.abs(offsetX) / 500
    
    if (direction === 'right') {
      return { transform: 'translateX(150%) rotate(30deg)', opacity: 0 }
    }
    if (direction === 'left') {
      return { transform: 'translateX(-150%) rotate(-30deg)', opacity: 0 }
    }
    
    return {
      transform: `translateX(${offsetX}px) rotate(${rotate}deg)`,
      opacity: Math.max(opacity, 0.8),
    }
  }

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-white to-[#FDFBF9]">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Our Spaces"
          title="Step Inside"
          highlight="Dermaspace"
          description="Swipe through our beautifully designed spaces"
        />

        {/* Swipeable Card Stack */}
        <div className="relative max-w-md mx-auto mb-10">
          {/* Background Cards (stack effect) */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[2, 1].map((offset) => {
              const index = (currentIndex + offset) % galleryItems.length
              return (
                <div
                  key={`bg-${offset}`}
                  className="absolute w-full aspect-[3/4] rounded-3xl overflow-hidden bg-gray-100 shadow-lg"
                  style={{
                    transform: `scale(${1 - offset * 0.05}) translateY(${offset * 12}px)`,
                    zIndex: 10 - offset,
                    opacity: 1 - offset * 0.2,
                  }}
                >
                  <img
                    src={galleryItems[index].src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )
            })}
          </div>

          {/* Main Card */}
          <div
            ref={cardRef}
            className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none"
            style={{
              ...getCardStyle(),
              transition: isDragging ? 'none' : 'all 0.3s ease-out',
              zIndex: 20,
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {/* Image */}
            <img
              src={galleryItems[currentIndex].src}
              alt={galleryItems[currentIndex].alt}
              className="w-full h-full object-cover"
              draggable={false}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Swipe Indicators */}
            {offsetX > 50 && (
              <div className="absolute top-8 right-8 px-4 py-2 bg-green-500 text-white font-bold rounded-lg rotate-12 border-4 border-white shadow-lg">
                LOVE IT
              </div>
            )}
            {offsetX < -50 && (
              <div className="absolute top-8 left-8 px-4 py-2 bg-gray-500 text-white font-bold rounded-lg -rotate-12 border-4 border-white shadow-lg">
                SKIP
              </div>
            )}
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B2D8E] rounded-full">
                  <MapPin className="w-3 h-3 text-white" />
                  <span className="text-xs font-medium text-white">{galleryItems[currentIndex].location}</span>
                </span>
                <span className="text-xs text-white/70">{currentIndex + 1} of {galleryItems.length}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{galleryItems[currentIndex].alt}</h3>
              <p className="text-sm text-white/80">{galleryItems[currentIndex].description}</p>
            </div>

            {/* Like Badge */}
            {liked.includes(currentIndex) && (
              <div className="absolute top-4 left-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={goToPrev}
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-100"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <button
              onClick={toggleLike}
              className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all ${
                liked.includes(currentIndex) 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white text-gray-400 border border-gray-100'
              }`}
            >
              <Heart className={`w-7 h-7 ${liked.includes(currentIndex) ? 'fill-white' : ''}`} />
            </button>
            
            <button
              onClick={() => { setDirection('right'); setTimeout(goToNext, 300) }}
              className="w-14 h-14 bg-[#7B2D8E] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={goToNext}
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-100"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {galleryItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-6 bg-[#7B2D8E]' 
                    : liked.includes(index)
                    ? 'w-1.5 bg-red-400'
                    : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Liked Counter */}
          {liked.length > 0 && (
            <div className="text-center mt-4">
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                {liked.length} space{liked.length > 1 ? 's' : ''} loved
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link 
            href="/gallery" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#6B2278] transition-colors shadow-lg shadow-purple-200"
          >
            View Full Gallery
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
