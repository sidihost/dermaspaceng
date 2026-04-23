'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react'

const slides = [
  {
    image: '/images/hero-1.jpg',
    eyebrow: 'Skin Care',
    title: 'Skin that feels',
    highlight: 'like yours',
    description:
      'Facials, peels and treatments for Lagos weather and Lagos skin. No gimmicks, just results you can see.',
  },
  {
    image: '/images/hero-2.jpg',
    eyebrow: 'Body & Spa',
    title: 'An afternoon',
    highlight: 'off your shoulders',
    description:
      'Massages, scrubs and steam in a quiet room. You walk out lighter than you walked in.',
  },
  {
    image: '/images/hero-3.jpg',
    eyebrow: 'Therapy',
    title: 'A therapist who',
    highlight: 'knows your skin',
    description:
      'We listen first, recommend second, and build a plan that fits your life.',
  },
]

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [progress, setProgress] = useState(0)

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentSlide) return
      setIsTransitioning(true)
      setCurrentSlide(index)
      setProgress(0)
      setTimeout(() => setIsTransitioning(false), 600)
    },
    [isTransitioning, currentSlide],
  )

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
    <section className="relative h-[480px] sm:h-[520px] lg:h-[560px] bg-white overflow-hidden">
      {/* Background Slider */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className={`object-cover transition-transform duration-[6000ms] ease-out ${
                index === currentSlide ? 'scale-105' : 'scale-100'
              }`}
              priority={index === 0}
            />
          </div>
        ))}

        {/* Editorial overlays — dark bottom-left for copy legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.05) 100%)',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
            <div className="max-w-2xl">
              {/* Eyebrow */}
              <div className="relative mb-2 sm:mb-3 h-5 sm:h-6">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 flex items-center gap-3 transition-all duration-500 ease-out ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 -translate-y-2'
                    }`}
                  >
                    <span className="h-px w-8 bg-white/60" />
                    <span className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.28em] text-white/90">
                      {slide.eyebrow}
                    </span>
                  </div>
                ))}
              </div>

              {/* Title */}
              <div className="relative mb-3 sm:mb-4 min-h-[84px] sm:min-h-[112px] lg:min-h-[140px]">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-700 ease-out ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-6 absolute top-0 left-0'
                    }`}
                  >
                    <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-[1.05] tracking-tight text-balance">
                      {slide.title}
                      <br />
                      <span className="font-serif italic font-normal text-white">
                        {slide.highlight}
                        <span className="text-[#F8B4C8]">.</span>
                      </span>
                    </h1>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="relative mb-4 sm:mb-5 min-h-[48px] sm:min-h-[52px]">
                {slides.map((slide, index) => (
                  <p
                    key={index}
                    className={`text-sm sm:text-base text-white/85 max-w-md leading-relaxed transition-all duration-500 ease-out ${
                      index === currentSlide
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-3 absolute top-0 left-0'
                    }`}
                  >
                    {slide.description}
                  </p>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
                <button
                  onClick={scrollToBooking}
                  className="group inline-flex items-center gap-2 pl-5 pr-2 py-2 bg-white hover:bg-white text-[#7B2D8E] text-sm font-semibold rounded-full transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  Book Appointment
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#7B2D8E] text-white transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-full border border-white/40 hover:bg-white/10 hover:border-white/60 transition-all duration-300"
                >
                  View Services
                </Link>
              </div>

              {/* Trust Indicators - Hidden on mobile */}
              <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80">
                      <Image
                        src="/images/client-1.jpg"
                        alt="Happy client"
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80">
                      <Image
                        src="/images/client-2.jpg"
                        alt="Happy client"
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/80">
                      <Image
                        src="/images/client-3.jpg"
                        alt="Happy client"
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white/80">
                      5K+
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-white/85">
                    Happy Clients
                  </span>
                </div>

                <span aria-hidden="true" className="h-4 w-px bg-white/25" />

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5 text-[#FFD27A] fill-[#FFD27A]"
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-white/85">
                    4.9 Rating
                  </span>
                </div>

                <span aria-hidden="true" className="h-4 w-px bg-white/25" />

                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-xs sm:text-sm text-white/85">
                    2 Locations in Lagos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              {/* Slide Counter + Progress */}
              <div className="flex items-center gap-3">
                <span className="font-serif text-2xl font-semibold text-[#7B2D8E] tabular-nums">
                  {String(currentSlide + 1).padStart(2, '0')}
                </span>
                <div className="w-16 sm:w-24 h-[3px] bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7B2D8E] transition-all duration-100 ease-linear rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-400 tabular-nums">
                  / {String(slides.length).padStart(2, '0')}
                </span>
              </div>

              {/* Current Slide Label — desktop only */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-gray-400">
                  Now showing
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {slides[currentSlide].eyebrow}
                </span>
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-full border border-gray-200 hover:border-[#7B2D8E] hover:text-[#7B2D8E] flex items-center justify-center text-gray-600 transition-all duration-300"
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
