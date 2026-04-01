import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, ArrowRight, ArrowLeft, Zap, Flame } from 'lucide-react'

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
      <section className="relative py-20 md:py-28 bg-[#7B2D8E] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border border-white/30 rounded-full" />
          <div className="absolute top-20 left-20 w-48 h-48 border border-white/20 rounded-full" />
          <div className="absolute bottom-10 right-10 w-40 h-40 border border-white/20 rounded-full" />
          <div className="absolute bottom-20 right-20 w-56 h-56 border border-white/10 rounded-full" />
        </div>
        
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
            <path d="M0 80V40C360 70 720 80 1080 60C1260 50 1380 30 1440 20V80H0Z" fill="#F9FAFB"/>
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          {/* Back button - Elegant pill design */}
          <Link 
            href="/services" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm mb-8 hover:bg-white/20 transition-all duration-300 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Services</span>
          </Link>

          {/* Category badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 mb-6">
            <span className="text-xs font-semibold text-white uppercase tracking-[0.2em]">Hair Removal</span>
          </div>
          
          {/* Title with elegant underline */}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Waxing Services
          </h1>
          
          {/* Beautiful curved underline */}
          <div className="flex justify-center mb-6">
            <svg width="180" height="20" viewBox="0 0 180 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12C30 4 60 4 90 10C120 16 150 16 175 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.5"/>
              <path d="M20 16C50 10 80 10 110 14C130 17 150 15 160 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
          
          <p className="text-base md:text-lg text-white/85 max-w-lg mx-auto leading-relaxed">
            Professional waxing for smooth, hair-free skin using premium techniques
          </p>
          
          {/* Elegant decorative element */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-white/40" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-white/40" />
          </div>
        </div>
      </section>

      {/* Strip Wax Section */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 relative inline-block">
                Strip Wax
                {/* Curved underline */}
                <svg className="absolute -bottom-2 left-0" width="80" height="8" viewBox="0 0 80 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 5C18 2 40 2 60 4C70 5 78 4 78 4" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
                </svg>
              </h2>
              <p className="text-sm text-gray-500 mt-2">Best for large areas like legs and arms</p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {stripWaxServices.map((service, index) => (
              <div 
                key={service.name}
                className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#7B2D8E]/20 transition-all duration-500 overflow-hidden"
              >
                {/* Subtle gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Card number accent */}
                <div className="absolute top-3 right-3 text-4xl font-bold text-gray-100 group-hover:text-[#7B2D8E]/5 transition-colors duration-500">
                  {String(index + 1).padStart(2, '0')}
                </div>
                
                <div className="relative">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 group-hover:text-[#7B2D8E] transition-colors pr-8">
                    {service.name}
                  </h3>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{service.duration}</span>
                    </div>
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] group-hover:gap-2.5 transition-all"
                    >
                      Book
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hot Wax Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 flex items-center justify-center">
              <Flame className="w-6 h-6 text-[#7B2D8E]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 relative inline-block">
                Hot Wax
                {/* Curved underline */}
                <svg className="absolute -bottom-2 left-0" width="70" height="8" viewBox="0 0 70 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 5C15 2 35 2 52 4C62 5 68 4 68 4" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
                </svg>
              </h2>
              <p className="text-sm text-gray-500 mt-2">Best for sensitive areas, gentler on skin</p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {hotWaxServices.map((service, index) => (
              <div 
                key={service.name}
                className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#7B2D8E]/20 transition-all duration-500 overflow-hidden"
              >
                {/* Subtle gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Card number accent */}
                <div className="absolute top-3 right-3 text-4xl font-bold text-gray-100 group-hover:text-[#7B2D8E]/5 transition-colors duration-500">
                  {String(index + 1).padStart(2, '0')}
                </div>
                
                <div className="relative">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 group-hover:text-[#7B2D8E] transition-colors pr-8">
                    {service.name}
                  </h3>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{service.duration}</span>
                    </div>
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] group-hover:gap-2.5 transition-all"
                    >
                      Book
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Beautiful design */}
      <section className="relative py-20 md:py-24 bg-gray-50 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#7B2D8E]/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#7B2D8E]/[0.03] rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          {/* Decorative element */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-[2px] bg-[#7B2D8E]/30 rounded-full" />
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/40" />
            <div className="w-8 h-[2px] bg-[#7B2D8E]/30 rounded-full" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Ready to book your treatment?
          </h2>
          
          {/* Beautiful curved underline */}
          <div className="flex justify-center mb-5">
            <svg width="200" height="16" viewBox="0 0 200 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 10C40 4 80 4 120 8C150 11 180 11 195 7" stroke="#7B2D8E" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.25"/>
            </svg>
          </div>
          
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            Schedule your appointment today and experience total relaxation
          </p>
          
          {/* Beautiful CTA button */}
          <Link
            href="/booking"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#7B2D8E] text-white font-medium rounded-full hover:bg-[#6A2579] transition-all duration-300 group"
          >
            <span>Book Appointment</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
          
          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-gray-400">
            <span>Instant Confirmation</span>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Free Cancellation</span>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Expert Therapists</span>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
