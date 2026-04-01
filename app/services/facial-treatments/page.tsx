import { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Clock, ArrowRight, ArrowLeft, Sparkles, Droplets, Zap, Sun, FlaskConical, Smile, CircleDot, User, Syringe, Beaker, Palette } from 'lucide-react'

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
            <span className="text-white">Facial Treatments</span>
          </div>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
            <span className="text-xs font-medium text-white uppercase tracking-widest">Skin Care</span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 text-balance">
            Facial Treatments
          </h1>
          <p className="text-sm md:text-base text-white/80 max-w-md mx-auto text-balance">
            Expert facial therapies for radiant, healthy-looking skin
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
                  id={treatment.id}
                  className="group bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#7B2D8E]/20 transition-all"
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/5 flex items-center justify-center flex-shrink-0 group-hover:bg-[#7B2D8E]/10 transition-colors">
                      <IconComponent className="w-6 h-6 text-[#7B2D8E]" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900">{treatment.name}</h3>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#7B2D8E]/5 rounded-full flex-shrink-0">
                          <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                          <span className="text-xs font-medium text-[#7B2D8E]">{treatment.duration}</span>
                        </div>
                      </div>
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
            Schedule your facial treatment appointment today
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
