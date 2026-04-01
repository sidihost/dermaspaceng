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
          {/* Back link - minimal and elegant */}
          <Link 
            href="/services" 
            className="inline-flex items-center gap-1 text-white/70 text-xs uppercase tracking-widest mb-8 hover:text-white transition-colors"
          >
            <span>Services</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">Body</span>
          </Link>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Body Treatments
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-lg mx-auto">
            Relaxing treatments designed for complete rejuvenation and wellness
          </p>
        </div>
      </section>

      {/* Treatments Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header - Stylish */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[#7B2D8E] mb-2">Explore</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Our Treatments</h2>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  
                  {/* Duration */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 group-hover:bg-white/20 rounded-full mb-4 transition-colors">
                    <Clock className="w-3.5 h-3.5 text-gray-500 group-hover:text-white/80 transition-colors" />
                    <span className="text-xs text-gray-600 group-hover:text-white/80 transition-colors">{treatment.duration}</span>
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
            Schedule your body treatment appointment today and experience total relaxation
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
