import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
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
      <section className="relative py-24 bg-gradient-to-br from-[#FBF8F4] via-white to-[#f5f0ff]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <Link 
            href="/services" 
            className="inline-flex items-center gap-2 text-[#7B2D8E] font-medium mb-6 hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Services
          </Link>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-balance">
                <span className="gradient-text">Waxing</span> Services
              </h1>
              <p className="mt-6 text-lg text-gray-600 text-pretty">
                At Dermaspace Esthetic and Wellness Centre, we offer two different wax hair removal techniques - Strip wax and Hot wax. We also offer wax treatments for both women and men (selected areas).
              </p>
              <Button
                asChild
                className="mt-8 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-8"
              >
                <Link href="/booking" className="flex items-center gap-2">
                  Book Appointment
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/beautiful-young-girl-beauty-salon-1024x681.jpg-oxGrqVSRoD400FZKPP5mLOdN42EJvX.webp"
                alt="Waxing Services"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Waxing Types */}
      <section className="py-24 bg-white">
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
                <li className="flex items-center gap-3 text-gray-700">
                  <Check className="w-5 h-5 text-[#7B2D8E]" />
                  <span>Best for large areas</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <Check className="w-5 h-5 text-[#7B2D8E]" />
                  <span>Quick and efficient</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <Check className="w-5 h-5 text-[#7B2D8E]" />
                  <span>Suitable for fine to medium hair</span>
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
                <li className="flex items-center gap-3 text-gray-700">
                  <Check className="w-5 h-5 text-[#7B2D8E]" />
                  <span>Best for sensitive areas</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <Check className="w-5 h-5 text-[#7B2D8E]" />
                  <span>Gentle on skin</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <Check className="w-5 h-5 text-[#7B2D8E]" />
                  <span>Effective on coarse hair</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Waxing Areas */}
      <section className="py-24 bg-gradient-to-b from-white to-[#FBF8F4]">
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
