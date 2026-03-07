'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Star } from 'lucide-react'

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#FDFBF9]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#7B2D8E] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#D4A853] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            {/* Rating Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-100 mb-5">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-[#D4A853] fill-current" />
                ))}
              </div>
              <span className="text-xs font-medium text-gray-600">4.7 Rating</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-5">
              Your Skin Deserves
              <span className="block text-[#7B2D8E]">The Best Care</span>
            </h1>
            
            <p className="text-base text-gray-600 leading-relaxed mb-7 max-w-md mx-auto lg:mx-0">
              Experience premium skincare treatments tailored just for you. 
              From relaxing facials to rejuvenating body treatments.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={scrollToBooking}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors shadow-lg shadow-[#7B2D8E]/25"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/services"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-gray-700 border border-gray-300 rounded-full hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
              >
                View Services
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center lg:justify-start gap-6 mt-8">
              <div className="text-center">
                <div className="text-lg font-bold text-[#7B2D8E]">5,000+</div>
                <div className="text-[10px] text-gray-500">Happy Clients</div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-lg font-bold text-[#7B2D8E]">7+</div>
                <div className="text-[10px] text-gray-500">Years Experience</div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-lg font-bold text-[#7B2D8E]">2</div>
                <div className="text-[10px] text-gray-500">Locations</div>
              </div>
            </div>
          </div>

          {/* Image Side */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative aspect-[4/5] max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                alt="Spa Treatment"
                fill
                className="object-cover"
                priority
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/20 to-transparent" />
            </div>

            {/* Decorative circle */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#D4A853]/20 rounded-full -z-10" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-[#7B2D8E]/10 rounded-full -z-10" />

            {/* Floating Gift Card */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-3 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#7B2D8E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 12v10H4V12" />
                  <path d="M2 7h20v5H2V7z" />
                  <path d="M12 22V7" />
                  <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Gift Cards</p>
                <p className="text-[10px] text-gray-500">Available Now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
