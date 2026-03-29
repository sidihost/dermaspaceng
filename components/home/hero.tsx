'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Star, Leaf } from 'lucide-react'

const slides = [
  {
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    title: 'Reveal Your',
    highlight: 'Natural Glow',
    description: 'Experience transformative skincare treatments designed to reveal your natural radiance and boost your confidence.',
  },
  {
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    title: 'Indulge in',
    highlight: 'Pure Relaxation',
    description: 'Unwind with our signature body treatments, massages and spa experiences crafted for total rejuvenation.',
  },
  {
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    title: 'Expert Care for',
    highlight: 'Radiant Skin',
    description: 'Professional facials and treatments tailored to your unique skin needs by certified specialists.',
  },
  {
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
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
        return prev + 1.67 // ~6 seconds
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
    <section className="relative h-[100svh] min-h-[600px] max-h-[900px] w-full overflow-hidden">
      {/* Background Slider */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-20 h-full flex flex-col justify-between px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <Leaf className="w-4 h-4 text-[#7B2D8E]" />
              <span className="text-white/90 text-sm font-medium">Esthetic & Wellness Centre</span>
            </div>

            {/* Title with Animation */}
            <div className="relative h-[140px] sm:h-[180px] mb-6 overflow-hidden">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-500 ${
                    index === currentSlide
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-8'
                  }`}
                >
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                    {slide.title}
                    <br />
                    <span className="text-[#7B2D8E]">{slide.highlight}</span>
                  </h1>
                </div>
              ))}
            </div>

            {/* Decorative Curve */}
            <div className="mb-6">
              <svg width="120" height="12" viewBox="0 0 120 12" fill="none">
                <path
                  d="M2 10C20 2 40 2 60 6C80 10 100 10 118 2"
                  stroke="#7B2D8E"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Description with Animation */}
            <div className="relative h-[80px] mb-8 overflow-hidden">
              {slides.map((slide, index) => (
                <p
                  key={index}
                  className={`absolute inset-0 text-lg sm:text-xl text-white/80 max-w-2xl transition-all duration-500 delay-100 ${
                    index === currentSlide
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-8'
                  }`}
                >
                  {slide.description}
                </p>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={scrollToBooking}
                className="group flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] hover:bg-[#6A2579] text-white font-semibold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Book Your Visit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/services"
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full backdrop-blur-sm transition-all duration-300 border border-white/20"
              >
                Explore Services
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/50 border-2 border-white/30 flex items-center justify-center text-xs text-white font-bold">
                    5K
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white font-bold">
                    +
                  </div>
                </div>
                <span>Happy Clients</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span>4.9 Rating</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>2 Locations in Lagos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex items-center gap-6">
            {/* Slide Counter */}
            <div className="flex items-center gap-2 text-white">
              <span className="text-2xl font-bold">
                {String(currentSlide + 1).padStart(2, '0')}
              </span>
              <div className="w-12 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7B2D8E] transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-white/50">
                / {String(slides.length).padStart(2, '0')}
              </span>
            </div>

            {/* Slide Dots */}
            <div className="hidden sm:flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'bg-white scale-125'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-3">
            <button
              onClick={prevSlide}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-white/30 text-white hover:bg-white/10 transition-all duration-300"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-[#7B2D8E] hover:bg-white/90 transition-all duration-300"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
