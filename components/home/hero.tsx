'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react'

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
    <section className="relative min-h-[75svh] lg:min-h-[80svh] bg-[#FDFBF9] overflow-hidden">
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-[75svh] lg:min-h-[80svh] flex flex-col">
        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
            <div className="max-w-2xl">
              {/* Title with Animation */}
              <div className="relative mb-6 min-h-[120px] sm:min-h-[140px]">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-500 ease-out ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-8 absolute top-0 left-0'
                    }`}
                  >
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1]">
                      {slide.title}
                      <br />
                      <span className="text-[#7B2D8E] bg-white/95 px-3 py-1 rounded-lg inline-block mt-2">{slide.highlight}</span>
                    </h1>
                  </div>
                ))}
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
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={scrollToBooking}
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] hover:bg-[#6A2579] text-white text-sm font-semibold rounded-full transition-all duration-300 shadow-lg"
                >
                  Book Appointment
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white text-sm font-semibold rounded-full transition-all duration-300 border border-white/20"
                >
                  View Services
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6">
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
                  <span className="text-sm text-white/70">Happy Clients</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-[#7B2D8E] fill-[#7B2D8E]" />
                    ))}
                  </div>
                  <span className="text-sm text-white/70 ml-1">4.9 (500+ reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-md border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              {/* Slide Counter */}
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-white">
                  {String(currentSlide + 1).padStart(2, '0')}
                </span>
                <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#7B2D8E] transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-white/50">
                  / {String(slides.length).padStart(2, '0')}
                </span>
              </div>

              {/* Slide Dots */}
              <div className="hidden md:flex items-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? 'w-6 bg-[#7B2D8E]'
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300"
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
