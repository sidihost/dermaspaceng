import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, Flame, Sparkles, Hand, Footprints } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nail Care Services',
  description: 'Professional nail care services at Dermaspace Lagos. Manicures, pedicures, hot wax treatments, jelly pedicures, and more for beautiful, healthy nails.',
}

const treatments = [
  {
    name: 'Hot Wax Mani-Pedi',
    description: 'This treatment involves the use of heated paraffin wax, mineral oil, and petroleum-based wax to cleanse and exfoliate dead skin cells or calluses leaving the feet smooth and soft.',
    icon: Flame,
  },
  {
    name: 'Jelly Pedicure',
    description: 'This treatment involves detoxifying, softening, and cleansing the feet while providing relaxing aromatherapy. A relaxing experience for tired feet.',
    icon: Sparkles,
  },
  {
    name: 'Manicure',
    description: 'This treatment helps boost confidence, prevent fungal infections, and improve blood circulation. Includes nail shaping, cuticle care, and polish application.',
    icon: Hand,
  },
  {
    name: 'Pedicure',
    description: 'Complete foot care treatment including soaking, exfoliation, nail shaping, cuticle care, massage, and polish application for beautiful, healthy feet.',
    icon: Footprints,
  },
]

export default function NailCarePage() {
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
            <span className="text-xs font-medium text-white uppercase tracking-widest">Beauty</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Nail Care
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            Professional manicures and pedicures for beautiful, healthy nails
          </p>
          
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-8 h-0.5 bg-white/30" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-8 h-0.5 bg-white/30" />
          </div>
        </div>
      </section>

      {/* Treatments Grid */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Our Treatments</h2>
            <p className="text-sm text-gray-500 mt-1">Choose from our range of nail care services</p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {treatments.map((treatment) => {
              const IconComponent = treatment.icon
              return (
                <div 
                  key={treatment.name}
                  className="group bg-white rounded-xl border border-gray-100 p-4 hover:border-[#7B2D8E]/30 transition-all"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                    <IconComponent className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {treatment.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    {treatment.description}
                  </p>
                  
                  {/* Footer */}
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
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Ready to book your treatment?
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Schedule your nail care appointment today for beautiful, healthy nails
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
