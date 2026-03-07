'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Play } from 'lucide-react'

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#FDFBF9]">
      {/* Curved Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-full h-full">
          <svg 
            className="absolute right-0 top-0 h-full w-3/4 hidden lg:block" 
            viewBox="0 0 600 900" 
            fill="none" 
            preserveAspectRatio="xMaxYMid slice"
          >
            <path 
              d="M150 0C50 150 0 300 0 450C0 600 50 750 150 900H600V0H150Z" 
              fill="#7B2D8E" 
              fillOpacity="0.03"
            />
            <path 
              d="M200 0C100 150 50 300 50 450C50 600 100 750 200 900H600V0H200Z" 
              fill="#7B2D8E" 
              fillOpacity="0.05"
            />
          </svg>
        </div>
        
        {/* Subtle decorative elements */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-[#D4A853] rounded-full opacity-60" />
        <div className="absolute top-40 right-20 w-3 h-3 bg-[#7B2D8E]/30 rounded-full" />
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-[#7B2D8E]/20 rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16 w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 mb-6">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#7B2D8E]">
                <Play className="w-2.5 h-2.5 text-white fill-current ml-0.5" />
              </span>
              <span className="text-sm font-medium text-gray-700">Lagos No.1 Spa & Wellness</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-[1.15] mb-5">
              Your Journey to{' '}
              <span className="relative inline-block text-[#7B2D8E]">
                Skin Confidence
                {/* Curved underline */}
                <svg 
                  className="absolute -bottom-2 left-0 w-full" 
                  viewBox="0 0 200 12" 
                  fill="none"
                >
                  <path 
                    d="M2 8C50 2 150 2 198 8" 
                    stroke="#D4A853" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="block mt-1">Starts Here</span>
            </h1>
            
            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Experience exceptional skincare treatments tailored just for you. 
              From relaxing facials to rejuvenating body therapies.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={scrollToBooking}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-all shadow-lg shadow-[#7B2D8E]/25 hover:shadow-xl hover:shadow-[#7B2D8E]/30 hover:-translate-y-0.5"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/services"
                className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-full hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors shadow-sm"
              >
                Explore Services
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8 mt-10 pt-8 border-t border-gray-100">
              <div>
                <div className="text-2xl font-bold text-gray-900">5K+</div>
                <div className="text-xs text-gray-500">Happy Clients</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-gray-900">7+</div>
                <div className="text-xs text-gray-500">Years Experience</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-gray-900">2</div>
                <div className="text-xs text-gray-500">Locations</div>
              </div>
            </div>
          </div>

          {/* Image Side */}
          <div className="relative order-1 lg:order-2">
            {/* Main Image Container with curved shape */}
            <div className="relative max-w-md mx-auto">
              {/* Decorative curved shape behind image */}
              <div className="absolute -inset-4 bg-gradient-to-br from-[#7B2D8E]/10 to-[#D4A853]/10 rounded-[2.5rem] -rotate-3" />
              
              {/* Main Image */}
              <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                  alt="Spa Treatment"
                  fill
                  className="object-cover"
                  priority
                />
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/30 via-transparent to-transparent" />
              </div>

              {/* Floating Card - Gift */}
              <div className="absolute -bottom-4 -left-4 md:left-4 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2D8E] to-[#9B4DAE] flex items-center justify-center">
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

              {/* Floating Card - Rating */}
              <div className="absolute -top-2 -right-2 md:right-4 bg-white rounded-2xl shadow-xl px-4 py-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3].map((i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7B2D8E] to-[#D4A853] border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
                        {['A', 'S', 'M'][i-1]}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">4.9 Rating</p>
                    <p className="text-[10px] text-gray-500">500+ reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg 
          viewBox="0 0 1440 60" 
          fill="none" 
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path 
            d="M0 60L48 55C96 50 192 40 288 35C384 30 480 30 576 33.3C672 36.7 768 43.3 864 45C960 46.7 1056 43.3 1152 38.3C1248 33.3 1344 26.7 1392 23.3L1440 20V60H1392C1344 60 1248 60 1152 60C1056 60 960 60 864 60C768 60 672 60 576 60C480 60 384 60 288 60C192 60 96 60 48 60H0Z" 
            fill="white"
          />
        </svg>
      </div>
    </section>
  )
}
