'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function Hero() {
  const scrollToBooking = () => {
    const bookingSection = document.getElementById('booking-section')
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-[#FDFBF9]">
      {/* Curved Background Shape */}
      <div className="absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/515516d9-test-bg-shape.png-mDEnwKdxcHNDcbwQLw9hquaTma9U05.webp"
          alt=""
          fill
          className="object-cover object-right"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#7B2D8E]/5 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-6 w-fit px-4 py-2 rounded-full bg-[#D4A853]/10 border border-[#D4A853]/30">
              <Sparkles className="w-4 h-4 text-[#D4A853]" />
              <span className="text-sm font-semibold text-[#7B2D8E]">Your Glow Awaits</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.15] mb-6">
              Skincare That Actually
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#7B2D8E] to-[#D4A853]">
                Works for You
              </span>
            </h1>
            
            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
              We believe real beauty comes from healthy, glowing skin. Whether you're battling acne, signs of aging, or just want to pamper yourself, our expert team has the perfect treatment for your unique skin journey.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button
                onClick={scrollToBooking}
                className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-xl px-8 h-12 font-semibold text-base transition-all shadow-lg hover:shadow-xl"
              >
                Start Your Journey
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl px-8 h-12 border-2 border-gray-300 hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 font-semibold"
              >
                <Link href="/services">See All Services</Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col gap-4 pt-8 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-600">Trusted by skin-conscious Lagosians</p>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-[#7B2D8E]">1000+</p>
                  <p className="text-xs text-gray-600">Glowing Clients</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#7B2D8E]">5/5</p>
                  <p className="text-xs text-gray-600">Love Our Service</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Image with Card */}
          <div className="relative h-[500px] lg:h-[600px]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/10 via-[#D4A853]/10 to-transparent rounded-3xl" />
            
            {/* Floating Card */}
            <div className="absolute -bottom-12 -right-6 lg:bottom-0 lg:right-0 w-72 h-auto animate-float">
              <div className="relative">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_54-AxRd8C1URF34xIbchRrcx0COAAEztC.webp"
                  alt="Special Offers"
                  width={300}
                  height={300}
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Background Decorative Shapes */}
            <div className="absolute top-10 left-0 w-64 h-64 bg-[#D4A853]/20 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-20 right-10 w-48 h-48 bg-[#7B2D8E]/15 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </div>

      {/* Bottom Curve Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-white/30 pointer-events-none" />
    </section>
  )
}
