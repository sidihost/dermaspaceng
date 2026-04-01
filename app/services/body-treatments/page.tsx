import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, ArrowRight, ArrowLeft, Flame, Sparkles, Dumbbell, Droplets, Heart, Footprints, Baby } from 'lucide-react'

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
            <span className="text-xs font-semibold text-white uppercase tracking-[0.2em]">Wellness</span>
          </div>
          
          {/* Title with elegant underline */}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Body Treatments
          </h1>
          
          {/* Beautiful curved underline */}
          <div className="flex justify-center mb-6">
            <svg width="180" height="20" viewBox="0 0 180 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12C30 4 60 4 90 10C120 16 150 16 175 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.5"/>
              <path d="M20 16C50 10 80 10 110 14C130 17 150 15 160 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
          
          <p className="text-base md:text-lg text-white/85 max-w-lg mx-auto leading-relaxed">
            Relaxing treatments designed for complete rejuvenation and wellness
          </p>
          
          {/* Elegant decorative element */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-white/40" />
            <div className="w-2 h-2 rounded-full bg-white/50" />
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-white/40" />
          </div>
        </div>
      </section>

      {/* Treatments Grid */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 relative inline-block">
              Our Treatments
              {/* Beautiful curved underline */}
              <svg className="absolute -bottom-3 left-1/2 -translate-x-1/2" width="140" height="12" viewBox="0 0 140 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 8C30 3 60 3 90 6C110 8 130 8 135 5" stroke="#7B2D8E" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.4"/>
              </svg>
            </h2>
            <p className="text-gray-500 mt-5 max-w-md mx-auto">Choose from our range of premium body treatments</p>
          </div>

          {/* Grid Layout - Improved cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {treatments.map((treatment, index) => {
              const IconComponent = treatment.icon
              return (
                <div 
                  key={treatment.name}
                  className="group relative bg-white rounded-3xl border border-gray-100 p-6 hover:border-[#7B2D8E]/20 transition-all duration-500 overflow-hidden"
                >
                  {/* Subtle gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Card number accent */}
                  <div className="absolute top-4 right-4 text-6xl font-bold text-gray-100 group-hover:text-[#7B2D8E]/5 transition-colors duration-500">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  
                  <div className="relative flex gap-5">
                    {/* Icon with elegant design */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#7B2D8E]/5 flex items-center justify-center flex-shrink-0 group-hover:from-[#7B2D8E]/15 group-hover:to-[#7B2D8E]/10 transition-all duration-500">
                      <IconComponent className="w-6 h-6 text-[#7B2D8E]" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-[#7B2D8E] transition-colors duration-300">
                        {treatment.name}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                        {treatment.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Footer with elegant divider */}
                  <div className="relative flex items-center justify-between mt-5 pt-4">
                    {/* Gradient divider */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{treatment.duration}</span>
                    </div>
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B2D8E]/5 text-sm font-medium text-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white transition-all duration-300 group/btn"
                    >
                      Book Now
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA - Beautiful design */}
      <section className="relative py-20 md:py-24 bg-white overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#7B2D8E]/[0.03] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#7B2D8E]/[0.03] rounded-full blur-3xl" />
        </div>
        
        {/* Top decorative curve */}
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
            <path d="M0 0V30C360 50 720 60 1080 45C1260 37 1380 20 1440 10V0H0Z" fill="#F9FAFB"/>
          </svg>
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
