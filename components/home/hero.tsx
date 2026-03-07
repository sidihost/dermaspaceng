'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star } from 'lucide-react'

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <p className="text-sm font-medium text-[#7B2D8E] uppercase tracking-wide mb-4">
              Premium Spa Experience
            </p>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Your Journey to
              <span className="text-[#7B2D8E]"> Radiant Skin </span>
              Starts Here
            </h1>
            
            <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Experience world-class skincare treatments at Dermaspace. Our expert 
              estheticians combine luxury with results-driven therapies for your 
              ultimate wellness journey.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-6 mb-8">
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-[#D4A853] text-[#D4A853]" />
                  ))}
                </div>
                <span className="text-sm text-gray-600">5-Star</span>
              </div>
              <span className="text-gray-300">|</span>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-[#7B2D8E]">5+</span> Years
              </div>
              <span className="text-gray-300">|</span>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-[#7B2D8E]">2</span> Locations
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button
                onClick={scrollToBooking}
                size="lg"
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-8 h-12"
              >
                Book Appointment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8 h-12 border-[#7B2D8E] text-[#7B2D8E] hover:bg-[#7B2D8E]/5"
              >
                <Link href="/services">View Services</Link>
              </Button>
            </div>
          </div>

          {/* Images */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/5]">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                    alt="Spa Interior"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="relative rounded-2xl overflow-hidden aspect-square">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp"
                    alt="Nail Care"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="relative rounded-2xl overflow-hidden aspect-square">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                    alt="Facial Treatment"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative rounded-2xl overflow-hidden aspect-[4/5]">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-african-woman-resting-relaxing-with-sea-salt-back-spa-salon-5-768x512-1.jpg-qzDnc9aVQiTjypUgkMMu2l5wqwyRZG.webp"
                    alt="Body Treatment"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
