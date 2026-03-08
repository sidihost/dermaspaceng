'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Award } from 'lucide-react'

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#FDFBF9]">
      {/* Subtle decorative elements */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-[#7B2D8E] rounded-full opacity-60" />
      <div className="absolute top-40 right-20 w-3 h-3 bg-[#7B2D8E]/30 rounded-full" />

      {/* Hero Text Content */}
      <div className="relative max-w-4xl mx-auto px-4 pt-10 pb-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 mb-6">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#7B2D8E]">
            <Award className="w-3.5 h-3.5 text-white" />
          </span>
          <span className="text-sm font-medium text-gray-700">Lagos No.1 Spa & Wellness</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] mb-6">
          Your Journey to{' '}
          <span className="relative inline-block text-[#7B2D8E]">
            Skin Confidence
            <svg 
              className="absolute -bottom-2 left-0 w-full" 
              viewBox="0 0 200 12" 
              fill="none"
            >
              <path 
                d="M2 8C50 2 150 2 198 8" 
                stroke="#7B2D8E" 
                strokeWidth="3" 
                strokeLinecap="round"
                strokeOpacity="0.4"
              />
            </svg>
          </span>
          <span className="block mt-2">Starts Here</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
          Experience exceptional skincare treatments tailored just for you. 
          From relaxing facials to rejuvenating body therapies.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={scrollToBooking}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
          >
            Book Appointment
            <ArrowRight className="w-5 h-5" />
          </button>
          <Link
            href="/services"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-full hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors shadow-sm"
          >
            Explore Services
          </Link>
        </div>
      </div>

      {/* Image Mockup Section - After Hero Text */}
      <div className="relative max-w-6xl mx-auto px-4 pb-12">
        <div className="relative max-w-lg mx-auto">
          {/* Purple curved accent on left */}
          <div className="absolute -left-2 top-4 bottom-4 w-1.5 bg-gradient-to-b from-[#7B2D8E] via-[#9B4DAE] to-[#7B2D8E] rounded-full" />
          
          {/* Main Image Card */}
          <div className="relative ml-4 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="relative aspect-[4/3] md:aspect-[16/10]">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                alt="Spa facial treatment"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Rating Badge - Top Right */}
            <div className="absolute top-4 right-4 bg-white rounded-2xl shadow-lg px-3 py-2 border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {['A', 'S', 'M'].map((letter, i) => (
                    <div 
                      key={letter} 
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        background: i === 0 ? '#7B2D8E' : i === 1 ? '#9B4DAE' : '#B76DC2'
                      }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">4.9 Rating</p>
                  <p className="text-xs text-gray-500">500+ reviews</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gift Card Floating Element - Bottom Left */}
          <div className="absolute -bottom-4 left-0 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
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

        {/* Stats Row - After Image */}
        <div className="flex items-center justify-center gap-8 md:gap-12 mt-14 pt-10 border-t border-gray-100 max-w-xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6 text-[#7B2D8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-3xl font-bold text-gray-900">5K+</div>
            </div>
            <div className="text-sm text-gray-500 mt-1">Happy Clients</div>
          </div>
          <div className="w-px h-14 bg-gray-200" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6 text-[#7B2D8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-3xl font-bold text-gray-900">7+</div>
            </div>
            <div className="text-sm text-gray-500 mt-1">Years Experience</div>
          </div>
          <div className="w-px h-14 bg-gray-200" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6 text-[#7B2D8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="text-3xl font-bold text-gray-900">2</div>
            </div>
            <div className="text-sm text-gray-500 mt-1">Locations</div>
          </div>
        </div>
      </div>
    </section>
  )
}
