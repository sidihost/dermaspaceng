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
    <section className="relative min-h-[85vh] sm:min-h-[90vh] bg-[#FDFBF9] overflow-hidden">
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-[85vh] sm:min-h-[90vh] flex flex-col">
        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-20 sm:pb-28">
            <div className="max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E] border border-[#7B2D8E] mb-6">
                <Leaf className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white uppercase tracking-widest">Esthetic & Wellness Centre</span>
              </div>

              {/* Title with Animation */}
              <div className="relative mb-6">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-500 ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-8 absolute top-0 left-0'
                    }`}
                  >
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.15]">
                      {slide.title}
                      <br />
                      <span className="text-[#7B2D8E] bg-white px-3 py-1 rounded-lg inline-block mt-2">{slide.highlight}</span>
                    </h1>
                  </div>
                ))}
              </div>

              {/* Decorative Curve */}
              <div className="flex items-center gap-2 mb-6">
                <svg width="80" height="8" viewBox="0 0 80 8" fill="none">
                  <path d="M1 6C20 2 60 2 79 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
              </div>

              {/* Description with Animation */}
              <div className="relative mb-8 min-h-[60px]">
                {slides.map((slide, index) => (
                  <p
                    key={index}
                    className={`text-base sm:text-lg text-white/80 leading-relaxed max-w-lg transition-all duration-500 delay-100 ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-6 absolute top-0 left-0'
                    }`}
                  >
                    {slide.description}
                  </p>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <button
                  onClick={scrollToBooking}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#7B2D8E] hover:bg-[#6A2579] text-white text-sm font-semibold rounded-full transition-all duration-300 shadow-lg shadow-[#7B2D8E]/30"
                >
                  Book Your Visit
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-white/90 text-[#7B2D8E] text-sm font-semibold rounded-full transition-all duration-300"
                >
                  Explore Services
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-bold border-2 border-white">5K</div>
                    <div className="w-8 h-8 rounded-full bg-[#9B4DB0] flex items-center justify-center border-2 border-white">
                      <span className="text-white text-xs">+</span>
                    </div>
                  </div>
                  <span className="text-sm text-white/70">Happy Clients</span>
                </div>
                <div className="w-px h-6 bg-white/30" />
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#7B2D8E] fill-[#7B2D8E]" />
                  <span className="text-sm font-semibold text-white">4.9</span>
                  <span className="text-sm text-white/70">Rating</span>
                </div>
                <div className="w-px h-6 bg-white/30 hidden sm:block" />
                <div className="flex items-center gap-1.5 hidden sm:flex">
                  <MapPin className="w-4 h-4 text-white" />
                  <span className="text-sm text-white/70">2 Locations in Lagos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#7B2D8E]/90 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              {/* Slide Counter */}
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-white">
                  {String(currentSlide + 1).padStart(2, '0')}
                </span>
                <div className="w-24 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-white/50">
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

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors border border-white/20"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors border border-white/20"
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
