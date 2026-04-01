import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, ArrowRight, Sparkles, Droplets, Zap, Sun, FlaskConical, Smile, CircleDot, User, Syringe, Beaker, Palette } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Facial Treatments',
  description: 'Expert facial treatments at Dermaspace Lagos. Deep cleansing, hydra facial, acne treatment, microneedling, chemical peels, and more.',
}

const treatments = [
  {
    name: 'Deep Cleansing Facial',
    description: 'This maintenance facial treatment is designed to cleanse clogged pores, steam, extract, mask, hydrate, and protect for healthy-looking skin.',
    duration: '60 mins',
    icon: Sparkles,
  },
  {
    name: 'Acne Facial',
    description: 'A correctional facial customized for acne-prone skin to help cleanse, steam, exfoliate, extract, mask, tone, and moisturize for healthy-looking skin.',
    duration: '75 mins',
    icon: Droplets,
  },
  {
    name: 'Detoxifying Facial',
    description: 'This correctional facial is customized for acne-prone skin. With the use of hydra-device, the skin is detoxified using AHAs & BHAs fluids to cleanse the skin.',
    duration: '90 mins',
    icon: Zap,
  },
  {
    name: 'Signature Facial Rejuvenation',
    description: 'This facial treatment aims to brighten, tighten, and eliminate the dullness of the skin. It consists of a four-layer facelift that will leave the skin rejuvenated and revitalized.',
    duration: '90 mins',
    icon: Sun,
  },
  {
    name: 'Signature Facial Rejuvenation Plus (Milk Peel)',
    description: 'This signature treatment is a peel with zero downtime. It tackles fine lines and dull complexion, hence helps to restore loss of skin tone.',
    duration: '90 mins',
    icon: FlaskConical,
  },
  {
    name: 'Gommage Facial',
    description: 'This signature correctional facial is an exfoliating and resurfacing treatment. It works like a peel by dissolving all surface impurities with a cocktail of acids.',
    duration: '75 mins',
    icon: CircleDot,
  },
  {
    name: 'Hydrojelly Facial',
    description: 'This facial treatment is an effective anti-inflammatory treatment that naturally soothes the skin and is appropriate after intense treatments such as extraction.',
    duration: '60 mins',
    icon: Smile,
  },
  {
    name: 'Hydra Facial',
    description: 'A revitalizing, hydrating, pore-vacuuming facial that gets you glowing almost immediately. Completely customizable treatment perfect for all skin types.',
    duration: '60 mins',
    icon: Droplets,
  },
  {
    name: 'Dermaspace Acne Treatment Package',
    id: 'acne',
    description: 'Includes a series of mild to invasive sessions with an expert esthetician or dermatologist to treat persistent or severe acne.',
    duration: 'Multiple Sessions',
    icon: Beaker,
  },
  {
    name: 'Gentleman Facial',
    description: 'This maintenance facial treatment is designed to cleanse clogged pores, steam, extract, mask, hydrate, shampoo, and condition the beards.',
    duration: '75 mins',
    icon: User,
  },
  {
    name: 'Microneedling',
    id: 'microneedling',
    description: 'A dermaroller procedure that uses small needles to prick the skin. The purpose is to generate new collagen and skin tissue for smoother, firmer, and more toned skin.',
    duration: '60 mins',
    icon: Syringe,
  },
  {
    name: 'Acnelan Peel',
    description: 'An intensive treatment pack designed for the medical professional to treat acne-prone and seborrhoeic skin. It deep cleanses blocked pores and removes impurities.',
    duration: '90 mins',
    icon: FlaskConical,
  },
  {
    name: 'Hyperpigmentation Peel',
    description: 'This advanced skincare treatment is a skin exfoliant procedure that involves the chemical removal of keratinized structures of the epidermis.',
    duration: '75 mins',
    icon: Palette,
  },
]

export default function FacialTreatmentsPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
            <path d="M0 60V30C240 50 480 60 720 50C960 40 1200 10 1440 30V60H0Z" fill="#F9FAFB"/>
          </svg>
        </div>
        
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
            <span className="text-xs font-medium text-white uppercase tracking-widest">Skin Care</span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
            Facial Treatments
          </h1>
          
          {/* Curved underline */}
          <div className="flex justify-center mb-4">
            <svg width="120" height="12" viewBox="0 0 120 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 8C20 2 40 2 60 6C80 10 100 10 118 4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.6"/>
            </svg>
          </div>
          
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
            Expert facial therapies for radiant, healthy-looking skin
          </p>
          
          {/* Decorative dots */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>
        </div>
      </section>

      {/* Treatments Grid */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 relative inline-block">
              Our Treatments
              {/* Curved underline */}
              <svg className="absolute -bottom-2 left-1/2 -translate-x-1/2" width="100" height="8" viewBox="0 0 100 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 6C25 2 50 2 75 4C85 5 95 6 98 4" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
              </svg>
            </h2>
            <p className="text-sm text-gray-500 mt-3">Choose from our range of facial treatments</p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {treatments.map((treatment, index) => {
              const IconComponent = treatment.icon
              return (
                <div 
                  key={treatment.name}
                  id={treatment.id}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#7B2D8E]/30 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#7B2D8E]/15 transition-colors">
                      <IconComponent className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="text-sm font-semibold text-gray-900 mb-1.5 group-hover:text-[#7B2D8E] transition-colors">
                        {treatment.name}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {treatment.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{treatment.duration}</span>
                    </div>
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B2D8E] group-hover:gap-2 transition-all"
                    >
                      Book Now
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-14 bg-white overflow-hidden">
        {/* Top curve */}
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
            <path d="M0 0V20C360 35 720 40 1080 30C1260 25 1380 15 1440 10V0H0Z" fill="#F9FAFB"/>
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Ready to book your treatment?
          </h2>
          
          {/* Curved underline */}
          <div className="flex justify-center mb-4">
            <svg width="80" height="8" viewBox="0 0 80 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6C20 2 40 2 60 4C70 5 78 4 78 4" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Schedule your appointment today and achieve glowing skin
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
