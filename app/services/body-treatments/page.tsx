import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ServiceHero } from '@/components/services/service-hero'
import { Clock, ArrowRight, Flame, Flower2, Dumbbell, Droplets, Heart, Footprints, Baby } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Body Treatments',
  description: 'Indulge in relaxing body treatments at Dermaspace Lagos. Hot stone massage, Thai massage, detox body scrubs, sports massage, and more.',
}

const treatments = [
  {
    name: 'Hot Stone Massage',
    description: 'This relaxing body massage involves the placing of heated balsamic stones on specific parts of the body followed by relaxing rhythmic kneading. It helps repair damaged soft tissue, improves sleep, and promotes deep relaxation.',
    duration: '60 mins',
    icon: Flame,
  },
  {
    name: 'Thai Massage',
    description: 'This body treatment helps improve muscle flexibility, helps correct posture problems, increases inner energy levels, boosts mental strength, as well as improves breathing.',
    duration: '90 mins',
    icon: Flower2,
  },
  {
    name: 'Sports Massage & Stretching',
    description: 'Sports Massage & Stretching is a type of massage therapy that uses deep tissue techniques to reduce muscular tension, discomfort, and pain. Perfect for athletes and active individuals.',
    duration: '60-90 mins',
    icon: Dumbbell,
  },
  {
    name: 'Detox Body Scrub (Salt/Sugar) + Steam',
    description: 'This signature treatment starts with a steam session. It softens and prepares the skin for exfoliation, followed by intense scrubbing off of dead skin cells using our custom mix of salt or sugar scrub.',
    duration: '45 mins',
    icon: Droplets,
  },
  {
    name: 'Detox Body Scrub + 30mins Massage',
    description: 'This signature treatment starts with a steam session followed by exfoliation using our custom mix of salt or sugar scrub, then a 30 minutes signature deep tissue massage.',
    duration: '75 mins',
    icon: Heart,
  },
  {
    name: 'Pregnancy Massage',
    description: 'A relaxing massage recommended for the second and third trimester to assist in releasing lower back pain and water retention. Gentle and safe for expectant mothers.',
    duration: '60 mins',
    icon: Baby,
  },
  {
    name: 'Reflexology Massage',
    description: 'Complement any spa service with a relaxing pressure-point foot massage designed to heal the body and release energy flow. Perfect for total relaxation and wellness.',
    duration: '30 mins',
    icon: Footprints,
  },
]

export default function BodyTreatmentsPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <ServiceHero
        category="Wellness"
        title="Body Treatments"
        subtitle="Relaxing treatments designed for complete rejuvenation and wellness"
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
            <p className="text-sm text-gray-500 mt-3">Choose from our range of body treatments</p>
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
