'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Star, Leaf } from 'lucide-react'

const slides = [
  {
    image: '/images/hero-1.jpg',
    title: 'Reveal Your',
    highlight: 'Natural Glow',
    description: 'Experience transformative skincare treatments designed to reveal your natural radiance and boost your confidence.',
  },
  {
    image: '/images/hero-2.jpg',
    title: 'Indulge in',
    highlight: 'Pure Relaxation',
    description: 'Unwind with our signature body treatments, massages and spa experiences crafted for total rejuvenation.',
  },
  {
    image: '/images/hero-3.jpg',
    title: 'Expert Care for',
    highlight: 'Radiant Skin',
    description: 'Professional facials and treatments tailored to your unique skin needs by certified specialists.',
  },
]

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [progress, setProgress] = useState(0)

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentSlide) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setProgress(0)
    setTimeout(() => setIsTransitioning(false), 600)
  }, [isTransitioning, currentSlide])

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length)
  }, [currentSlide, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length)
  }, [currentSlide, goToSlide])

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide()
          return 0
        }
        return prev + 1.67
      })
    }, 100)
    return () => clearInterval(progressInterval)
  }, [nextSlide])

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative h-[520px] sm:h-[540px] lg:h-[580px] bg-[#FDFBF9] overflow-hidden">
      {/* Background Slider */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20">
            <div className="max-w-xl">
              {/* Title with Animation */}
              <div className="relative mb-4 min-h-[100px] sm:min-h-[120px]">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-500 ease-out ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-8 absolute top-0 left-0'
                    }`}
                  >
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] drop-shadow-lg">
                      {slide.title}
                      <br />
                      <span className="relative inline-block mt-1">
                        <span className="text-[#7B2D8E] bg-white px-3 py-1 rounded-md">{slide.highlight}</span>
                        <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                          <path d="M2 9C30 4 60 2 100 5C140 8 170 6 198 3" stroke="#7B2D8E" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </span>
                    </h1>
                  </div>
                ))}
              </div>

              {/* Description with Animation */}
              <div className="relative mb-6 min-h-[72px] sm:min-h-[56px]">
                {slides.map((slide, index) => (
                  <p
                    key={index}
                    className={`text-base sm:text-lg text-white max-w-md leading-relaxed drop-shadow-md transition-all duration-500 ease-out ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 absolute top-0 left-0'
                    }`}
                  >
                    {slide.description}
                  </p>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  onClick={scrollToBooking}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] hover:bg-[#6A2579] text-white text-sm font-semibold rounded-full transition-all duration-300"
                >
                  Book Appointment
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-100 text-[#7B2D8E] text-sm font-semibold rounded-full transition-all duration-300"
                >
                  View Services
                </Link>
              </div>

              {/* Trust Indicators - Hidden on mobile */}
              <div className="hidden sm:flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                      <Image src="/images/client-1.jpg" alt="Happy client" width={32} height={32} className="object-cover w-full h-full" />
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                      <Image src="/images/client-2.jpg" alt="Happy client" width={32} height={32} className="object-cover w-full h-full" />
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
                      <Image src="/images/client-3.jpg" alt="Happy client" width={32} height={32} className="object-cover w-full h-full" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-bold border-2 border-white">5K+</div>
                  </div>
                  <span className="text-sm text-white/90">Happy Clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm text-white/90">4.9 Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-white" />
                  <span className="text-sm text-white/90">2 Locations in Lagos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              {/* Slide Counter */}
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-[#7B2D8E]">
                  {String(currentSlide + 1).padStart(2, '0')}
                </span>
                <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#7B2D8E] transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400">
                  / {String(slides.length).padStart(2, '0')}
                </span>
              </div>

              {/* Slide Dots */}
              <div className="flex items-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? 'bg-[#7B2D8E] scale-125'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-all duration-300"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-10 h-10 rounded-full bg-[#7B2D8E] hover:bg-[#6A2579] flex items-center justify-center text-white transition-all duration-300"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
