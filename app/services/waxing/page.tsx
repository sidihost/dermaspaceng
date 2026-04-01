import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, ChevronRight, Check, Zap, Flame } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Waxing Services',
  description: 'Professional waxing services at Dermaspace Lagos. Strip wax and hot wax techniques for smooth, hair-free skin. Services for both men and women.',
}

const waxingAreas = [
  'Full Body Wax',
  'Brazilian Wax',
  'Bikini Wax',
  'Half Leg Wax',
  'Full Leg Wax',
  'Arm Wax',
  'Underarm Wax',
  'Upper Lip',
  'Full Face Wax',
  'Back Wax',
  'Chest Wax',
]

export default function WaxingPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          {/* Back link */}
          <Link 
            href="/services" 
            className="inline-flex items-center gap-1 text-white/70 text-xs uppercase tracking-widest mb-8 hover:text-white transition-colors"
          >
            <span>Services</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">Waxing</span>
          </Link>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Waxing Services
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-lg mx-auto">
            Strip wax and hot wax techniques for smooth, hair-free skin
          </p>
        </div>
      </section>

      {/* Waxing Types */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[#7B2D8E] mb-2">Methods</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Waxing Techniques</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Strip Wax */}
            <div className="group bg-white rounded-2xl p-6 hover:bg-[#7B2D8E] transition-all duration-300">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center mb-5 transition-colors">
                <Zap className="w-7 h-7 text-[#7B2D8E] group-hover:text-white transition-colors" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-white mb-3 transition-colors">Strip Wax</h3>
              <p className="text-sm text-gray-600 group-hover:text-white/80 leading-relaxed mb-5 transition-colors">
                Strip waxing uses a thin layer of warm wax applied to the skin, covered with a cloth or paper strip, then quickly removed against the direction of hair growth.
              </p>
              <ul className="space-y-2 mb-5">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Check className="w-3 h-3 text-[#7B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-white/80 transition-colors">Best for large areas</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Check className="w-3 h-3 text-[#7B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-white/80 transition-colors">Quick and efficient</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Check className="w-3 h-3 text-[#7B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-white/80 transition-colors">Suitable for fine to medium hair</span>
                </li>
              </ul>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] group-hover:text-white transition-colors"
              >
                Book Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Hot Wax */}
            <div className="group bg-white rounded-2xl p-6 hover:bg-[#7B2D8E] transition-all duration-300">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center mb-5 transition-colors">
                <Flame className="w-7 h-7 text-[#7B2D8E] group-hover:text-white transition-colors" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-white mb-3 transition-colors">Hot Wax</h3>
              <p className="text-sm text-gray-600 group-hover:text-white/80 leading-relaxed mb-5 transition-colors">
                Hot wax is applied warm and allowed to cool and harden on the skin before being removed. It grips the hair more effectively and is gentler on the skin.
              </p>
              <ul className="space-y-2 mb-5">
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Check className="w-3 h-3 text-[#7B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-white/80 transition-colors">Best for sensitive areas</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Check className="w-3 h-3 text-[#7B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-white/80 transition-colors">Gentle on skin</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Check className="w-3 h-3 text-[#7B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-white/80 transition-colors">Effective on coarse hair</span>
                </li>
              </ul>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] group-hover:text-white transition-colors"
              >
                Book Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Waxing Areas */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[#7B2D8E] mb-2">Areas</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Treatment Areas</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {waxingAreas.map((area) => (
              <div 
                key={area}
                className="bg-gray-50 rounded-xl p-4 text-center hover:bg-[#7B2D8E]/5 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs uppercase tracking-widest text-[#7B2D8E] mb-2">Ready?</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Book Your Session</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Schedule your waxing appointment today for smooth, hair-free skin
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#7B2D8E] text-white font-medium rounded-full hover:bg-[#6B2D7E] transition-colors"
          >
            Book Appointment
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
