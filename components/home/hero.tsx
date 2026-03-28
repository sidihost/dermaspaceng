'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

const slides = [
  {
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp',
    label: 'Signature Treatment',
    title: 'Where beauty',
    titleAccent: 'meets wellness',
    description: 'Experience transformative skincare treatments designed to reveal your natural radiance.',
  },
  {
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp',
    label: 'Body Treatments',
    title: 'Indulge in',
    titleAccent: 'pure luxury',
    description: 'Relax and rejuvenate with our signature body treatments and spa experiences.',
  },
  {
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp',
    label: 'Expert Skincare',
    title: 'Radiant skin',
    titleAccent: 'starts here',
    description: 'Professional facials and treatments tailored to your unique skin needs.',
  },
  {
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/unnamed%20%2812%29-0e2hkjlXHNekO1q892JaoQdIUJgYqf.jpg',
    label: 'Our Sanctuary',
    title: 'Your wellness',
    titleAccent: 'destination',
    description: 'Step into our serene spaces designed for your complete relaxation.',
  },
]

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const nextSlide = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    setTimeout(() => setIsTransitioning(false), 800)
  }, [isTransitioning])

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentSlide) return
    setIsTransitioning(true)
    setCurrentSlide(index)
    setTimeout(() => setIsTransitioning(false), 800)
  }

  useEffect(() => {
    const interval = setInterval(nextSlide, 6000)
    return () => clearInterval(interval)
  }, [nextSlide])

  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-[100svh] bg-[#FDFBF9]">
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 min-h-[100svh]">
        {/* Left Side - Content */}
        <div className="relative z-10 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-32 lg:py-20 order-2 lg:order-1">
          {/* Small Label */}
          <div className="overflow-hidden mb-6">
            {slides.map((slide, index) => (
              <p
                key={index}
                className={`text-xs font-medium tracking-[0.2em] uppercase text-[#7B2D8E] transition-all duration-700 ${
                  index === currentSlide
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 absolute'
                }`}
              >
                {slide.label}
              </p>
            ))}
          </div>

          {/* Main Title */}
          <div className="mb-6">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`transition-all duration-700 ${
                  index === currentSlide
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-6 absolute pointer-events-none'
                }`}
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif font-normal text-gray-900 leading-[1.1] tracking-tight">
                  {slide.title}
                  <br />
                  <span className="italic text-[#7B2D8E]">{slide.titleAccent}</span>
                </h1>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="overflow-hidden mb-10 max-w-md">
            {slides.map((slide, index) => (
              <p
                key={index}
                className={`text-base sm:text-lg text-gray-600 leading-relaxed transition-all duration-700 delay-100 ${
                  index === currentSlide
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 absolute'
                }`}
              >
                {slide.description}
              </p>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <button
              onClick={scrollToBooking}
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 text-sm font-medium tracking-wide uppercase text-white bg-[#7B2D8E] hover:bg-[#6A2579] transition-all duration-300"
            >
              Book Appointment
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              href="/services"
              className="inline-flex items-center justify-center px-8 py-4 text-sm font-medium tracking-wide uppercase text-gray-900 border border-gray-300 hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-all duration-300"
            >
              Our Services
            </Link>
          </div>

          {/* Slide Indicators */}
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-400 font-medium tabular-nums">
              {String(currentSlide + 1).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-0.5 transition-all duration-500 ${
                    index === currentSlide
                      ? 'w-12 bg-[#7B2D8E]'
                      : 'w-6 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-400 font-medium tabular-nums">
              {String(slides.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="relative h-[50vh] lg:h-auto order-1 lg:order-2 overflow-hidden">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-1000 ease-out ${
                index === currentSlide 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-105'
              }`}
            >
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Subtle overlay for elegance */}
              <div className="absolute inset-0 bg-[#7B2D8E]/5" />
            </div>
          ))}

          {/* Image corner accent */}
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#FDFBF9] hidden lg:block" />
        </div>
      </div>

      {/* Bottom Stats Strip */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-[#FDFBF9]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <div className="px-6 py-5 border-r border-gray-200">
              <p className="text-2xl sm:text-3xl font-serif text-gray-900">5,000+</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Happy Clients</p>
            </div>
            <div className="px-6 py-5 lg:border-r border-gray-200">
              <p className="text-2xl sm:text-3xl font-serif text-gray-900">50+</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Treatments</p>
            </div>
            <div className="px-6 py-5 border-r border-gray-200 border-t lg:border-t-0">
              <p className="text-2xl sm:text-3xl font-serif text-gray-900">7+</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Years Experience</p>
            </div>
            <div className="px-6 py-5 border-t lg:border-t-0">
              <p className="text-2xl sm:text-3xl font-serif text-gray-900">2</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Locations</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
