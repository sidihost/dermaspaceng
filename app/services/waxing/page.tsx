import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, ChevronLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-[#7B2D8E] via-[#9B4DAE] to-[#5A1D6A] overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-300/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        </div>
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <Link 
            href="/services" 
            className="inline-flex items-center gap-2 text-white/90 text-sm font-medium mb-6 hover:text-white transition-all bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full backdrop-blur-sm border border-white/20"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Services
          </Link>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-white/50" />
            <span className="text-white/60 text-xs uppercase tracking-widest font-medium">Smooth Skin</span>
            <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-white/50" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Waxing Services
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Strip wax and hot wax techniques for smooth, hair-free skin
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/10">Strip Wax</span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/10">Hot Wax</span>
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/10">Full Body</span>
          </div>
        </div>
      </section>

      {/* Waxing Types */}
      <section className="py-8 md:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Strip Wax */}
            <div className="bg-gradient-to-br from-[#FBF8F4] to-white rounded-2xl p-8 border border-gray-100">
              <div className="w-14 h-14 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-[#7B2D8E]">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Strip Wax</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Strip waxing uses a thin layer of warm wax applied to the skin, covered with a cloth or paper strip, then quickly removed against the direction of hair growth. Ideal for larger body areas.
              </p>
              <ul className="space-y-3">
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
            <div className="bg-gradient-to-br from-[#FBF8F4] to-white rounded-2xl p-8 border border-gray-100">
              <div className="w-14 h-14 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-[#7B2D8E]">
                  <path d="M12 2c-2.5 4-4 6-4 9a4 4 0 0 0 8 0c0-3-1.5-5-4-9Z" />
                  <path d="M12 22v-5" />
                  <path d="M8 22h8" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Hot Wax</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Hot wax is applied warm and allowed to cool and harden on the skin before being removed. It grips the hair more effectively and is gentler on the skin, making it perfect for sensitive areas.
              </p>
              <ul className="space-y-3">
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
      <section className="py-8 md:py-12 bg-gradient-to-b from-white to-[#FBF8F4]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
              Treatment Areas
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Waxing <span className="gradient-text">Options</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {waxingAreas.map((area) => (
              <div 
                key={area}
                className="bg-white rounded-xl border border-gray-100 p-4 text-center hover:border-[#7B2D8E]/20 hover:bg-[#7B2D8E]/5 transition-colors cursor-pointer"
              >
                <span className="text-gray-700 font-medium">{area}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              asChild
              className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-8"
            >
              <Link href="/booking" className="flex items-center gap-2">
                Book Your Waxing Session
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
