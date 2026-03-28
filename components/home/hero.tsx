'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles, Star, MapPin, Clock } from 'lucide-react'

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#FDFBF9]">
      {/* Subtle decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-[#7B2D8E]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-[5%] w-80 h-80 bg-[#7B2D8E]/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-120px)] py-12 lg:py-16">
          
          {/* Left Content */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 mb-6 animate-fade-in">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0]">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </span>
              <span className="text-sm font-medium text-gray-700">Lagos&apos; Premier Spa & Wellness</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] mb-6 animate-fade-in-up">
              <span className="block">Where Beauty</span>
              <span className="block mt-1">Meets{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-[#7B2D8E]">Wellness</span>
                  <svg 
                    className="absolute -bottom-2 left-0 w-full" 
                    viewBox="0 0 200 12" 
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path 
                      d="M2 8C50 2 150 2 198 8" 
                      stroke="url(#gradient)" 
                      strokeWidth="4" 
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7B2D8E" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#9B4DB0" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#7B2D8E" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </span>
            </h1>
            
            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in-up delay-100">
              Experience transformative skincare treatments designed to reveal your natural radiance. 
              Indulge in luxury at Dermaspace.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10 animate-fade-in-up delay-200">
              <button
                onClick={scrollToBooking}
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-all duration-300 shadow-lg shadow-[#7B2D8E]/25 hover:shadow-xl hover:shadow-[#7B2D8E]/30 hover:-translate-y-0.5"
              >
                Book Your Experience
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/services"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-full hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-all duration-300"
              >
                Explore Treatments
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 animate-fade-in-up delay-300">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center text-white text-xs font-bold"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="pl-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">5,000+ Happy Clients</p>
                </div>
              </div>
              
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-[#7B2D8E]" />
                <span>2 Locations in Lagos</span>
              </div>
            </div>
          </div>

          {/* Right Content - Image Grid */}
          <div className="order-1 lg:order-2 relative">
            <div className="relative max-w-lg mx-auto lg:max-w-none">
              {/* Main Image Container */}
              <div className="relative">
                {/* Decorative ring */}
                <div className="absolute -inset-3 bg-gradient-to-br from-[#7B2D8E]/20 via-transparent to-[#9B4DB0]/20 rounded-[2rem] blur-xl" />
                
                {/* Main Image */}
                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-scale-in">
                  <div className="aspect-[4/3] relative">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                      alt="Luxury spa facial treatment at Dermaspace"
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                  </div>
                </div>

                {/* Floating Card - Top Right */}
                <div className="absolute -top-4 -right-4 lg:right-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Expert Care</p>
                      <p className="text-xs text-gray-500">7+ Years Experience</p>
                    </div>
                  </div>
                </div>

                {/* Floating Card - Bottom Left */}
                <div className="absolute -bottom-4 -left-4 lg:left-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 12v10H4V12" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 7h20v5H2V7z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 22V7" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Gift Cards</p>
                      <p className="text-xs text-gray-500">Give the gift of wellness</p>
                    </div>
                  </div>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900">4.9</span>
                      <span className="text-xs text-gray-500 ml-1">Rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <div className="relative border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#7B2D8E]">5K+</div>
              <p className="text-sm text-gray-600 mt-1">Happy Clients</p>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#7B2D8E]">50+</div>
              <p className="text-sm text-gray-600 mt-1">Treatments</p>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-[#7B2D8E]">7+</div>
              <p className="text-sm text-gray-600 mt-1">Years Experience</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-2xl sm:text-3xl font-bold text-[#7B2D8E]">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>9-7</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Mon - Sat</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
