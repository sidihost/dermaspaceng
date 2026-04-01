import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, ArrowLeft, Flame, Sparkles, Hand, Footprints } from 'lucide-react'

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
            <span className="text-white">Nail Care</span>
          </div>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">Beauty</span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 text-balance">
            Nail Care
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto text-balance">
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

      {/* Treatments List */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Available Treatments</h2>
            <span className="text-sm text-gray-500">{treatments.length} services</span>
          </div>

          <div className="space-y-4">
            {treatments.map((treatment) => {
              const IconComponent = treatment.icon
              return (
                <div 
                  key={treatment.name}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#7B2D8E]/20 transition-all"
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/5 flex items-center justify-center flex-shrink-0 group-hover:bg-[#7B2D8E]/10 transition-colors">
                      <IconComponent className="w-6 h-6 text-[#7B2D8E]" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">{treatment.name}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">{treatment.description}</p>
                      <Link
                        href="/booking"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7B2D8E] hover:gap-2.5 transition-all"
                      >
                        Book Now
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
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
            Schedule your nail care appointment today
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
