import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ServiceHero } from '@/components/services/service-hero'
import { Clock, ArrowRight, Flame, Flower2, Hand, Footprints, Gem } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nail Care Services',
  description: 'Professional nail care services at Dermaspace Lagos. Manicures, pedicures, hot wax treatments, jelly pedicures, and more for beautiful, healthy nails.',
}

const treatments = [
  {
    name: 'Hot Wax Mani-Pedi',
    description: 'This treatment involves the use of heated paraffin wax, mineral oil, and petroleum-based wax to cleanse and exfoliate dead skin cells or calluses leaving the feet smooth and soft.',
    duration: '90 mins',
    icon: Flame,
  },
  {
    name: 'Jelly Pedicure',
    description: 'This treatment involves detoxifying, softening, and cleansing the feet while providing relaxing aromatherapy. A relaxing experience for tired feet.',
    duration: '60 mins',
    icon: Flower2,
  },
  {
    name: 'Classic Manicure',
    description: 'This treatment helps boost confidence, prevent fungal infections, and improve blood circulation. Includes nail shaping, cuticle care, and polish application.',
    duration: '45 mins',
    icon: Hand,
  },
  {
    name: 'Classic Pedicure',
    description: 'Complete foot care treatment including soaking, exfoliation, nail shaping, cuticle care, massage, and polish application for beautiful, healthy feet.',
    duration: '60 mins',
    icon: Footprints,
  },
  {
    name: 'Gel Polish Manicure',
    description: 'Long-lasting gel polish application that stays chip-free for up to 2 weeks. Includes nail prep, gel application, and LED curing.',
    duration: '60 mins',
    icon: Gem,
  },
  {
    name: 'Gel Polish Pedicure',
    description: 'Durable gel polish for your toes that maintains its shine and color for weeks. Perfect for a lasting, beautiful finish.',
    duration: '75 mins',
    icon: Gem,
  },
]

export default function NailCarePage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <ServiceHero
        category="Beauty"
        title="Nail Care"
        subtitle="Professional nail services for beautiful, healthy hands and feet"
      />

      {/* Treatments Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 inline-block relative">
              Our Treatments
              <svg className="absolute -bottom-2 left-0 right-0 mx-auto" width="100" height="6" viewBox="0 0 100 6" fill="none">
                <path d="M2 4C25 2 75 2 98 4" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
              </svg>
            </h2>
            <p className="text-sm text-gray-500 mt-3">Choose from our range of nail care services</p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {treatments.map((treatment) => {
              const IconComponent = treatment.icon
              return (
                <div 
                  key={treatment.name}
                  className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-[#7B2D8E]/30 transition-all duration-300"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3 group-hover:bg-[#7B2D8E]/15 transition-colors">
                    <IconComponent className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 group-hover:text-[#7B2D8E] transition-colors">
                    {treatment.name}
                  </h3>
                  
                  {/* Description - Full text */}
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    {treatment.description}
                  </p>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{treatment.duration}</span>
                    </div>
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#7B2D8E] hover:gap-2 transition-all"
                    >
                      Book Now
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
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
