'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Star, Sparkles } from 'lucide-react'

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
    <section className="relative min-h-[70svh] lg:min-h-[85svh] bg-[#FDFBF9] overflow-hidden">
      {/* Background Slider */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-out ${
              index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
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
            {/* Enhanced Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/40 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-[#7B2D8E]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-1/4 w-48 h-48 bg-[#7B2D8E]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 min-h-[70svh] lg:min-h-[85svh] flex flex-col">
        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="max-w-xl">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
                  <Sparkles className="w-4 h-4 text-[#7B2D8E]" />
                  <span className="text-xs font-medium text-white uppercase tracking-wider">Premium Skincare & Wellness</span>
                </div>

                {/* Title with Animation */}
                <div className="relative mb-6 min-h-[140px] sm:min-h-[160px]">
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className={`transition-all duration-700 ease-out ${
                        index === currentSlide
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-10 absolute top-0 left-0'
                      }`}
                    >
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                        {slide.title}
                        <br />
                        <span className="relative inline-block mt-3">
                          <span className="relative z-10 text-[#7B2D8E] bg-white px-4 py-2 rounded-xl">{slide.highlight}</span>
                        </span>
                      </h1>
                    </div>
                  ))}
                </div>

                {/* Description with Animation */}
                <div className="relative mb-8 min-h-[70px]">
                  {slides.map((slide, index) => (
                    <p
                      key={index}
                      className={`text-base sm:text-lg text-white/80 leading-relaxed max-w-md transition-all duration-700 delay-150 ${
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
                    className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#7B2D8E] hover:bg-[#6A2579] text-white text-sm font-semibold rounded-full transition-all duration-300 shadow-xl shadow-[#7B2D8E]/30 hover:shadow-[#7B2D8E]/50 hover:scale-[1.02]"
                  >
                    Book Your Experience
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <Link
                    href="/services"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white text-sm font-semibold rounded-full transition-all duration-300 border border-white/30"
                  >
                    Explore Services
                  </Link>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center gap-5 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
                        <Image src="/images/client-1.jpg" alt="Happy client" width={40} height={40} className="object-cover w-full h-full" />
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
                        <Image src="/images/client-2.jpg" alt="Happy client" width={40} height={40} className="object-cover w-full h-full" />
                      </div>
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
                        <Image src="/images/client-3.jpg" alt="Happy client" width={40} height={40} className="object-cover w-full h-full" />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-lg">5K+</div>
                    </div>
                    <span className="text-sm text-white/80 font-medium">Happy Clients</span>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-white">4.9</span>
                    <span className="text-sm text-white/60">(500+ reviews)</span>
                  </div>
                </div>
              </div>

              {/* Right Side - Feature Cards (Desktop) */}
              <div className="hidden lg:flex flex-col gap-4 items-end">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 max-w-xs transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">2 Premium Locations</p>
                      <p className="text-white/60 text-sm">Lagos, Nigeria</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 max-w-xs transform hover:scale-105 transition-transform mr-12">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Expert Specialists</p>
                      <p className="text-white/60 text-sm">Certified professionals</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-5">
              {/* Slide Counter */}
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-white">
                  {String(currentSlide + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="w-28 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/50">Auto-playing</span>
                </div>
                <span className="text-sm text-white/50">
                  / {String(slides.length).padStart(2, '0')}
                </span>
              </div>

              {/* Slide Title Preview */}
              <div className="hidden md:flex items-center gap-6">
                {slides.map((slide, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`text-sm font-medium transition-all duration-300 ${
                      index === currentSlide
                        ? 'text-white'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {slide.highlight}
                  </button>
                ))}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-3">
                <button
                  onClick={prevSlide}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300 border border-white/20 hover:scale-110"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-11 h-11 rounded-full bg-white hover:bg-white/90 flex items-center justify-center text-[#7B2D8E] transition-all duration-300 hover:scale-110"
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
