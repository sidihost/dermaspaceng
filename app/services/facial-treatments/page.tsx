import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, ArrowRight, ChevronRight, Sparkles, Droplets, Zap, Sun, FlaskConical, Smile, CircleDot, User, Syringe, Beaker, Palette } from 'lucide-react'

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
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          {/* Back link */}
          <Link 
            href="/services" 
            className="inline-flex items-center gap-1 text-white/70 text-xs uppercase tracking-widest mb-8 hover:text-white transition-colors"
          >
            <span>Services</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">Facial</span>
          </Link>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Facial Treatments
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-lg mx-auto">
            Expert facial therapies for radiant, healthy-looking skin
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {treatments.map((treatment) => {
              const IconComponent = treatment.icon
              return (
                <div 
                  key={treatment.name}
                  id={treatment.id}
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
            Schedule your facial treatment appointment today and achieve glowing skin
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
