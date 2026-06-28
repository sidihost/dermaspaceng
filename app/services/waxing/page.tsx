import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ServiceHero } from '@/components/services/service-hero'
// The decorative treatment icon here was previously `Zap`, then `Flower2`.
// Switched to `Flower2` — reads as spa-calm and keeps `Flower2` out of the
// product surface per brand direction.
import { Clock, ArrowRight, Flower2, Flame } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Waxing Services',
  description: 'Professional waxing services at Dermaspace Lagos. Strip wax and hot wax techniques for smooth, hair-free skin.',
}

const stripWaxServices = [
  { name: 'Full Body Wax', duration: '120 mins' },
  { name: 'Full Leg Wax', duration: '45 mins' },
  { name: 'Half Leg Wax', duration: '30 mins' },
  { name: 'Full Arm Wax', duration: '30 mins' },
  { name: 'Underarm Wax', duration: '15 mins' },
  { name: 'Upper Lip Wax', duration: '10 mins' },
  { name: 'Full Face Wax', duration: '30 mins' },
  { name: 'Back Wax', duration: '45 mins' },
  { name: 'Chest Wax', duration: '30 mins' },
]

const hotWaxServices = [
  { name: 'Brazilian Wax', duration: '30 mins' },
  { name: 'Bikini Wax', duration: '20 mins' },
  { name: 'Hollywood Wax', duration: '45 mins' },
]

export default function WaxingPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <ServiceHero
        category="Hair Removal"
        title="Waxing Services"
        subtitle="Professional waxing for smooth, hair-free skin using premium techniques"
      />

      {/* Strip Wax Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 inline-block relative">
                Strip Wax
                <svg className="absolute -bottom-1 left-0" width="70" height="6" viewBox="0 0 70 6" fill="none">
                  <path d="M2 4C18 2 52 2 68 4" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
                </svg>
              </h2>
              <p className="text-xs text-gray-500 mt-1">Best for large areas like legs and arms</p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {stripWaxServices.map((service) => (
              <div 
                key={service.name}
                className="group bg-white rounded-xl border border-gray-100 p-4 hover:border-[#7B2D8E]/30 transition-all duration-300"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 group-hover:text-[#7B2D8E] transition-colors">
                  {service.name}
                </h3>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{service.duration}</span>
                  </div>
                  <Link
                    href="/booking"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:gap-2 transition-all"
                  >
                    Book
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hot Wax Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 inline-block relative">
                Hot Wax
                <svg className="absolute -bottom-1 left-0" width="60" height="6" viewBox="0 0 60 6" fill="none">
                  <path d="M2 4C15 2 45 2 58 4" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
                </svg>
              </h2>
              <p className="text-xs text-gray-500 mt-1">Best for sensitive areas, gentler on skin</p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {hotWaxServices.map((service) => (
              <div 
                key={service.name}
                className="group bg-white rounded-xl border border-gray-100 p-4 hover:border-[#7B2D8E]/30 transition-all duration-300"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 group-hover:text-[#7B2D8E] transition-colors">
                  {service.name}
                </h3>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{service.duration}</span>
                  </div>
                  <Link
                    href="/booking"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:gap-2 transition-all"
                  >
                    Book
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          {/* Decorative element */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-0.5 bg-[#7B2D8E]/30" />
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/40" />
            <div className="w-8 h-0.5 bg-[#7B2D8E]/30" />
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Ready to book your treatment?
          </h2>
          
          {/* Curved underline */}
          <svg className="mx-auto mb-4" width="160" height="8" viewBox="0 0 160 8" fill="none">
            <path d="M2 6C40 2 120 2 158 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.25"/>
          </svg>
          
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Schedule your appointment today and experience total relaxation
          </p>
          
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl hover:bg-[#6A2579] transition-colors group"
          >
            Book Appointment
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
