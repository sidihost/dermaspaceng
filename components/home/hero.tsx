'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react'

const slides = [
  {
    image: '/images/hero-1.jpg',
    subtitle: 'Premium Skincare',
    title: 'Where Science',
    highlight: 'Meets Beauty',
    description: 'Experience transformative treatments that reveal your skin\'s natural radiance through expert care and advanced techniques.',
  },
  {
    image: '/images/hero-2.jpg',
    subtitle: 'Luxury Wellness',
    title: 'Indulge in',
    highlight: 'Pure Serenity',
    description: 'Escape into a world of relaxation with our signature spa experiences designed for complete mind and body rejuvenation.',
  },
  {
    image: '/images/hero-3.jpg',
    subtitle: 'Expert Treatments',
    title: 'Your Journey to',
    highlight: 'Radiant Skin',
    description: 'Personalized facials and body treatments crafted by certified specialists to address your unique skincare needs.',
  },
]

const stats = [
  { value: '5,000+', label: 'Happy Clients' },
  { value: '4.9', label: 'Star Rating' },
  { value: '50+', label: 'Treatments' },
]

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentSlide) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setTimeout(() => setIsTransitioning(false), 800)
  }, [isTransitioning, currentSlide])

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length)
  }, [currentSlide, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length)
  }, [currentSlide, goToSlide])

  useEffect(() => {
    const autoSlide = setInterval(() => {
      nextSlide()
    }, 6000)
    return () => clearInterval(autoSlide)
  }, [nextSlide])

  return (
    <section className="relative min-h-[100svh] bg-[#faf9f7] overflow-hidden">
      {/* Background Image with Overlay */}
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
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 h-full min-h-[100svh] flex flex-col">
        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left Content */}
              <div className="max-w-2xl">
                {/* Subtitle Badge */}
                <div className="relative mb-6 overflow-hidden h-8">
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className={`absolute transition-all duration-700 ease-out ${
                        index === currentSlide
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 -translate-y-full'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium tracking-wide uppercase">
                        <span className="w-2 h-2 bg-[#7B2D8E] rounded-full animate-pulse" />
                        {slide.subtitle}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Main Title */}
                <div className="relative mb-6 min-h-[180px] sm:min-h-[200px] lg:min-h-[220px]">
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-700 ease-out ${
                        index === currentSlide
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-12'
                      }`}
                    >
                      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-normal text-white leading-[1.1] tracking-tight">
                        {slide.title}
                        <br />
                        <span className="relative inline-block mt-2 text-[#7B2D8E] italic">
                          {slide.highlight}
                          <svg 
                            className="absolute -bottom-2 left-0 w-full h-4" 
                            viewBox="0 0 200 16" 
                            fill="none" 
                            preserveAspectRatio="none"
                          >
                            <path 
                              d="M2 12C40 6 80 4 100 6C150 10 180 8 198 6" 
                              stroke="#7B2D8E" 
                              strokeWidth="2" 
                              strokeLinecap="round"
                              className="opacity-60"
                            />
                          </svg>
                        </span>
                      </h1>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div className="relative mb-8 min-h-[80px] sm:min-h-[72px]">
                  {slides.map((slide, index) => (
                    <p
                      key={index}
                      className={`absolute inset-0 text-lg sm:text-xl text-white/80 max-w-lg leading-relaxed font-light transition-all duration-700 ease-out delay-100 ${
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
                <div className="flex flex-wrap items-center gap-4 mb-12">
                  <Link
                    href="/consultation"
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-[#7B2D8E] hover:bg-[#6A2579] text-white text-base font-medium rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-[#7B2D8E]/25"
                  >
                    Book Consultation
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  <Link
                    href="/services"
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white text-base font-medium rounded-full border border-white/20 transition-all duration-300"
                  >
                    <Play className="w-5 h-5" />
                    Explore Services
                  </Link>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-8 sm:gap-12">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center sm:text-left">
                      <div className="text-3xl sm:text-4xl font-serif text-white font-medium">
                        {stat.value}
                      </div>
                      <div className="text-sm text-white/60 mt-1">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side - Decorative Card (Hidden on mobile) */}
              <div className="hidden lg:block">
                <div className="relative">
                  {/* Floating Card */}
                  <div className="absolute -top-4 -right-4 w-72 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-[#7B2D8E]/20 flex items-center justify-center">
                        <span className="text-2xl">✨</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">Premium Care</div>
                        <div className="text-white/60 text-sm">Certified Specialists</div>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Every treatment is personalized to your unique skin type and concerns.
                    </p>
                  </div>

                  {/* Second Floating Card */}
                  <div className="absolute top-40 -left-8 w-64 bg-white rounded-2xl p-5 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/20 border-2 border-white" />
                        <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/30 border-2 border-white" />
                        <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/40 border-2 border-white" />
                      </div>
                      <span className="text-sm text-gray-600">+2.5k reviews</span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm">&quot;Best spa experience in Lagos!&quot;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              {/* Slide Progress */}
              <div className="flex items-center gap-4">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className="group relative"
                    aria-label={`Go to slide ${index + 1}`}
                  >
                    <div className={`w-16 sm:w-24 h-1 rounded-full overflow-hidden transition-all duration-300 ${
                      index === currentSlide ? 'bg-white/30' : 'bg-white/10'
                    }`}>
                      {index === currentSlide && (
                        <div 
                          className="h-full bg-white rounded-full animate-progress"
                          style={{ animationDuration: '6s' }}
                        />
                      )}
                    </div>
                    <span className={`absolute -top-6 left-0 text-xs font-medium transition-opacity duration-300 ${
                      index === currentSlide ? 'text-white opacity-100' : 'text-white/50 opacity-0 group-hover:opacity-100'
                    }`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </button>
                ))}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-3">
                <button
                  onClick={prevSlide}
                  className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300 border border-white/10"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-12 h-12 rounded-full bg-white hover:bg-white/90 flex items-center justify-center text-[#7B2D8E] transition-all duration-300"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for progress animation */}
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </section>
  )
}
