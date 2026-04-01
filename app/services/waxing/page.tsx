import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'

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
        <div className="absolute top-1/2 right-12 w-2 h-2 bg-white/30 rounded-full hidden md:block" />
        <div className="absolute top-1/4 left-12 w-3 h-3 bg-white/20 rounded-full hidden md:block" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          {/* Breadcrumb style back */}
          <div className="flex items-center justify-center gap-2 text-white/60 text-sm mb-6">
            <Link href="/services" className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              <span>Services</span>
            </Link>
            <span>/</span>
            <span className="text-white">Waxing</span>
          </div>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">Smooth Skin</span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 text-balance">
            Waxing Services
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto text-balance">
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
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Waxing Techniques</h2>
            <span className="text-sm text-gray-500">2 methods</span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Strip Wax */}
            <div className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#7B2D8E]/20 transition-all">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Strip Wax</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Strip waxing uses a thin layer of warm wax applied to the skin, covered with a cloth or paper strip, then quickly removed against the direction of hair growth.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#7B2D8E]" />
                  </div>
                  <span className="text-sm">Best for large areas</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#7B2D8E]" />
                  </div>
                  <span className="text-sm">Quick and efficient</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#7B2D8E]" />
                  </div>
                  <span className="text-sm">Suitable for fine to medium hair</span>
                </li>
              </ul>
            </div>

            {/* Hot Wax */}
            <div className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#7B2D8E]/20 transition-all">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Hot Wax</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Hot wax is applied warm and allowed to cool and harden on the skin before being removed. It grips the hair more effectively and is gentler on the skin.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#7B2D8E]" />
                  </div>
                  <span className="text-sm">Best for sensitive areas</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#7B2D8E]" />
                  </div>
                  <span className="text-sm">Gentle on skin</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#7B2D8E]" />
                  </div>
                  <span className="text-sm">Effective on coarse hair</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Waxing Areas */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Treatment Areas</h2>
            <span className="text-sm text-gray-500">{waxingAreas.length} areas</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {waxingAreas.map((area) => (
              <div 
                key={area}
                className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:border-[#7B2D8E]/20 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{area}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-12 bg-[#7B2D8E] overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Ready to Book?</h2>
          <p className="text-sm text-white/70 mb-5">
            Schedule your waxing session today
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#7B2D8E] text-sm font-medium rounded-full hover:bg-gray-100 transition-colors"
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
