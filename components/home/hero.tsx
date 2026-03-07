'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star, MapPin, Clock, Phone } from 'lucide-react'

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative bg-[#FDFBF9]">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 min-h-[85vh]">
          {/* Content Side */}
          <div className="flex flex-col justify-center px-6 lg:px-12 py-16 lg:py-20">
            <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest mb-6">
              Lagos Premier Spa Destination
            </p>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-[1.1] mb-6">
              Discover Your
              <br />
              <span className="text-[#7B2D8E]">Radiant Self</span>
            </h1>

            <div className="w-16 h-1 bg-[#D4A853] mb-6" />
            
            <p className="text-gray-600 leading-relaxed mb-8 max-w-md">
              Award-winning skincare and wellness treatments crafted 
              by expert estheticians. Two luxurious locations in 
              Victoria Island and Ikoyi.
            </p>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 mb-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-[#D4A853] text-[#D4A853]" />
                <span>5-Star Rated</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#7B2D8E]" />
                <span>Open Daily 9AM-7PM</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={scrollToBooking}
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-8 h-11"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full px-8 h-11 border-gray-300 hover:border-[#7B2D8E] hover:text-[#7B2D8E]"
              >
                <Link href="/services">Explore Services</Link>
              </Button>
            </div>

            {/* Contact Quick Links */}
            <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-gray-200">
              <a href="tel:+2349017972919" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#7B2D8E] transition-colors">
                <Phone className="w-4 h-4" />
                +234 901 797 2919
              </a>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                VI & Ikoyi, Lagos
              </div>
            </div>
          </div>

          {/* Image Side */}
          <div className="relative hidden lg:block">
            {/* Main Image */}
            <div className="absolute inset-0">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                alt="Dermaspace Spa Interior"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-[#7B2D8E]/10" />
            </div>

            {/* Floating Card - App Mockup Style */}
            <div className="absolute bottom-8 left-8 right-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-white/50">
                <div className="flex items-start gap-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                      alt="Facial Treatment"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#7B2D8E] font-medium uppercase tracking-wide mb-1">Featured Treatment</p>
                    <h3 className="font-semibold text-gray-900 mb-1">Deep Cleansing Facial</h3>
                    <p className="text-sm text-gray-500">From N25,000 | 60 mins</p>
                  </div>
                  <Button 
                    onClick={scrollToBooking}
                    size="sm" 
                    className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full text-xs px-4"
                  >
                    Book
                  </Button>
                </div>
              </div>
            </div>

            {/* Small Floating Badge */}
            <div className="absolute top-8 right-8 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 border border-white/50">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D4A853] text-[#D4A853]" />
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-700">500+ Happy Clients</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
