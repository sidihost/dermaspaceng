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
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#FDFBF9]">
      {/* Background Decorative Elements */}
      <div className="absolute top-20 right-0 w-[500px] h-[500px] opacity-30 pointer-events-none">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/515516d9-test-bg-shape.png-mDEnwKdxcHNDcbwQLw9hquaTma9U05.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D4A853] mb-4">
              Premium Spa & Wellness
            </p>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Your Skin Deserves
              <span className="block text-[#7B2D8E]">The Best Care</span>
            </h1>
            
            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Experience premium skincare treatments tailored just for you. 
              From relaxing facials to rejuvenating body treatments.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={scrollToBooking}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
              >
                Book Appointment
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                href="/services"
                className="inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold text-gray-700 border border-gray-300 rounded-full hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
              >
                View Services
              </Link>
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
            </div>

            {/* Floating Gift Card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_53-4HJoMu3lPWpxJyT6B7FvcFeZ6FmdXP.webp"
                alt="Gift Cards"
                width={56}
                height={56}
                className="w-14 h-14 object-contain"
              />
              <div>
                <p className="text-sm font-bold text-gray-900">Gift Cards</p>
                <p className="text-xs text-gray-500">Available Now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
