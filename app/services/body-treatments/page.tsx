import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, ArrowRight, ChevronRight, Flame, Sparkles, Dumbbell, Droplets, Heart, Footprints, Baby } from 'lucide-react'

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
    icon: Sparkles,
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
            <span className="text-xs font-medium text-white uppercase tracking-widest">Wellness</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Body Treatments
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            Relaxing treatments designed for complete rejuvenation and wellness
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
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Our Treatments</h2>
            <p className="text-sm text-gray-500 mt-1">Choose from our range of body treatments</p>
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
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{treatment.duration}</span>
                    </div>
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
            Schedule your appointment today and experience total relaxation
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
