'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-[90vh] bg-[#FDFBF9] overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-[#7B2D8E]" />
        <div className="absolute bottom-20 right-[15%] w-48 h-48 rounded-full bg-[#7B2D8E]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 pt-8 md:pt-16 pb-12">
        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          
          {/* Left - Text Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Premium Spa & Wellness</span>
            </div>
            
            {/* Headline */}
            <h1 className="text-display font-semibold text-gray-900 mb-5">
              Your Journey to{' '}
              <span className="text-[#7B2D8E]">Radiant Skin</span>{' '}
              Starts Here
            </h1>
            
            {/* Description */}
            <p className="text-body text-gray-600 mb-8 max-w-md mx-auto lg:mx-0">
              Experience exceptional skincare treatments tailored just for you. 
              From relaxing facials to rejuvenating body therapies at our Lagos locations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={scrollToBooking}
                className="btn-hover inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A]"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/services"
                className="btn-hover inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:border-[#7B2D8E] hover:text-[#7B2D8E]"
              >
                View Services
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8 mt-10 pt-8 border-t border-gray-100">
              <div>
                <p className="text-2xl font-semibold text-gray-900">5K+</p>
                <p className="text-xs text-gray-500">Happy Clients</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">7+</p>
                <p className="text-xs text-gray-500">Years Experience</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <p className="text-2xl font-semibold text-gray-900">2</p>
                <p className="text-xs text-gray-500">Locations</p>
              </div>
            </div>
          </div>

          {/* Right - Image */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-200/50">
              <div className="aspect-[4/5] md:aspect-[3/4]">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                  alt="Spa facial treatment"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>

            {/* Rating Card */}
            <div className="absolute -bottom-4 -left-4 md:bottom-6 md:-left-6 bg-white rounded-xl shadow-lg p-3 border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[0, 1, 2].map((i) => (
                    <div 
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: i === 0 ? '#7B2D8E' : i === 1 ? '#9B4DAE' : '#B76DC2' }}
                    >
                      {['A', 'S', 'M'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">4.9</p>
                  <p className="text-[10px] text-gray-500">500+ reviews</p>
                </div>
              </div>
            </div>

            {/* Gift Card Badge */}
            <div className="absolute -top-3 -right-3 md:top-4 md:-right-4 bg-[#7B2D8E] text-white rounded-xl p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 12v10H4V12M2 7h20v5H2V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs font-medium">Gift Cards</span>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 -top-6 -right-6 w-full h-full border-2 border-[#7B2D8E]/10 rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
