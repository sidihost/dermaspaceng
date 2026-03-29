'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, Star } from 'lucide-react'

const slides = [
  {
    image: '/images/hero-1.jpg',
    title: 'Reveal Your',
    highlight: 'Natural Glow',
    description: 'Experience transformative skincare treatments designed to reveal your natural radiance.',
  },
  {
    image: '/images/hero-2.jpg',
    title: 'Indulge in',
    highlight: 'Pure Relaxation',
    description: 'Unwind with our signature body treatments and spa experiences crafted for total rejuvenation.',
  },
  {
    image: '/images/hero-3.jpg',
    title: 'Expert Care for',
    highlight: 'Radiant Skin',
    description: 'Professional facials and treatments tailored to your unique skin needs by certified specialists.',
  },
  {
    image: '/images/hero-4.jpg',
    title: 'Your Wellness',
    highlight: 'Sanctuary Awaits',
    description: 'Step into our serene spaces designed for your complete relaxation and transformation.',
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
    setTimeout(() => setIsTransitioning(false), 500)
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
    <section className="relative bg-[#FDFBF9]">
      {/* Hero Image Area */}
      <div className="relative h-[450px] sm:h-[500px] lg:h-[550px] overflow-hidden">
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
              sizes="100vw"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-xl">
              {/* Title with Animation */}
              <div className="relative mb-4 min-h-[100px] sm:min-h-[120px]">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-500 ease-out ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-6 absolute top-0 left-0'
                    }`}
                  >
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
                      {slide.title}
                      <br />
                      <span className="relative inline-block mt-1">
                        <span className="text-[#7B2D8E] bg-white px-3 py-0.5 rounded-md">{slide.highlight}</span>
                        <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                          <path d="M2 9C30 4 60 2 100 5C140 8 170 6 198 3" stroke="#7B2D8E" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </span>
                    </h1>
                  </div>
                ))}
              </div>

              {/* Description with Animation */}
              <div className="relative mb-6 min-h-[48px]">
                {slides.map((slide, index) => (
                  <p
                    key={index}
                    className={`text-sm sm:text-base text-white/80 leading-relaxed max-w-md transition-all duration-500 delay-75 ${
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
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={scrollToBooking}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] hover:bg-[#6A2579] text-white text-sm font-semibold rounded-full transition-all duration-300 shadow-lg shadow-[#7B2D8E]/25"
                >
                  Book Appointment
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-100 text-[#7B2D8E] text-sm font-semibold rounded-full transition-all duration-300"
                >
                  View Services
                </Link>
              </div>

              {/* Trust Indicators - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <Image src="/images/client-1.jpg" alt="Happy client" width={28} height={28} className="object-cover w-full h-full" />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <Image src="/images/client-2.jpg" alt="Happy client" width={28} height={28} className="object-cover w-full h-full" />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm">
                      <Image src="/images/client-3.jpg" alt="Happy client" width={28} height={28} className="object-cover w-full h-full" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-[10px] font-bold border-2 border-white">5K+</div>
                  </div>
                  <span className="text-xs text-white/70">Happy Clients</span>
                </div>
                <div className="h-4 w-px bg-white/30" />
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-[#7B2D8E] fill-[#7B2D8E]" />
                    ))}
                  </div>
                  <span className="text-xs text-white/70 ml-1">4.9 (500+ reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Slide Counter */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#7B2D8E]">
                {String(currentSlide + 1).padStart(2, '0')}
              </span>
              <span className="text-xs text-gray-400">
                / {String(slides.length).padStart(2, '0')}
              </span>
            </div>

            {/* Slide Navigation - Progress bars */}
            <div className="flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className="relative group flex flex-col items-center"
                  aria-label={`Go to slide: ${slide.highlight}`}
                >
                  {/* Slide title - only on larger screens */}
                  <span className={`hidden lg:block text-xs font-medium mb-1 transition-colors ${
                    index === currentSlide ? 'text-[#7B2D8E]' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                    {slide.highlight}
                  </span>
                  {/* Progress bar */}
                  <div className="w-12 sm:w-16 lg:w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                    {index === currentSlide ? (
                      <div 
                        className="h-full bg-[#7B2D8E] rounded-full transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    ) : index < currentSlide ? (
                      <div className="h-full bg-[#7B2D8E] w-full rounded-full" />
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-all duration-300"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="w-9 h-9 rounded-full bg-[#7B2D8E] hover:bg-[#6A2579] flex items-center justify-center text-white transition-all duration-300"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
