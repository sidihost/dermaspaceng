import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Check, Zap, Flame } from 'lucide-react'

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
            className="inline-flex items-center gap-2 text-white/90 text-sm mb-6 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Services
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">Smooth Skin</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Waxing Services
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            Strip wax and hot wax techniques for smooth, hair-free skin
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-8 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Waxing Types */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Waxing Techniques</h2>
            <p className="text-sm text-gray-500 mt-1">Choose the technique that works best for you</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Strip Wax */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-[#7B2D8E]/30 transition-all">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Strip Wax</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                Strip waxing uses a thin layer of warm wax applied to the skin, covered with a cloth or paper strip, then quickly removed against the direction of hair growth.
              </p>
              <ul className="space-y-2 mb-3">
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs text-gray-600">Best for large areas</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs text-gray-600">Quick and efficient</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs text-gray-600">Suitable for fine to medium hair</span>
                </li>
              </ul>
              <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:underline"
                >
                  Book
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Hot Wax */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-[#7B2D8E]/30 transition-all">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                <Flame className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Hot Wax</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                Hot wax is applied warm and allowed to cool and harden on the skin before being removed. It grips the hair more effectively and is gentler on the skin.
              </p>
              <ul className="space-y-2 mb-3">
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs text-gray-600">Best for sensitive areas</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs text-gray-600">Gentle on skin</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                  </div>
                  <span className="text-xs text-gray-600">Effective on coarse hair</span>
                </li>
              </ul>
              <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:underline"
                >
                  Book
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waxing Areas */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Treatment Areas</h2>
            <p className="text-sm text-gray-500 mt-1">We offer waxing for all areas</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {waxingAreas.map((area) => (
              <div 
                key={area}
                className="bg-gray-50 rounded-lg p-3 text-center hover:bg-[#7B2D8E]/5 transition-colors"
              >
                <span className="text-xs font-medium text-gray-700">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Ready to book your session?
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Schedule your waxing appointment today for smooth, hair-free skin
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-full hover:bg-[#5A1D6A] transition-colors"
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
