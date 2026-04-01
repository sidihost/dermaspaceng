import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, ChevronRight, Flame, Sparkles, Hand, Footprints } from 'lucide-react'

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
            className="inline-flex items-center gap-1 text-white/70 text-xs uppercase tracking-widest mb-8 hover:text-white transition-colors"
          >
            <span>Services</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">Nail Care</span>
          </Link>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Nail Care
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-lg mx-auto">
            Professional manicures and pedicures for beautiful, healthy nails
          </p>
        </div>
      </section>

      {/* Treatments Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[#7B2D8E] mb-2">Explore</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Our Treatments</h2>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {treatments.map((treatment) => {
              const IconComponent = treatment.icon
              return (
                <div 
                  key={treatment.name}
                  className="group bg-white rounded-2xl p-6 hover:bg-[#7B2D8E] transition-all duration-300"
                >
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 group-hover:bg-white/20 flex items-center justify-center mb-5 transition-colors">
                    <IconComponent className="w-7 h-7 text-[#7B2D8E] group-hover:text-white transition-colors" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-white mb-3 transition-colors">
                    {treatment.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 group-hover:text-white/80 leading-relaxed mb-5 transition-colors">
                    {treatment.description}
                  </p>
                  
                  {/* Book Link */}
                  <Link
                    href="/booking"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] group-hover:text-white transition-colors"
                  >
                    Book Now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs uppercase tracking-widest text-[#7B2D8E] mb-2">Ready?</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Book Your Treatment</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Schedule your nail care appointment today for beautiful, healthy nails
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
