import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Clock, ArrowRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Facial Treatments',
  description: 'Expert facial treatments at Dermaspace Lagos. Deep cleansing, hydra facial, acne treatment, microneedling, chemical peels, and more.',
}

const treatments = [
  {
    name: 'Deep Cleansing Facial',
    description: 'This maintenance facial treatment is designed to cleanse clogged pores, steam, extract, mask, hydrate, and protect for healthy-looking skin.',
    duration: '60 mins',
  },
  {
    name: 'Acne Facial',
    description: 'A correctional facial customized for acne-prone skin to help cleanse, steam, exfoliate, extract, mask, tone, and moisturize for healthy-looking skin.',
    duration: '75 mins',
  },
  {
    name: 'Detoxifying Facial',
    description: 'This correctional facial is customized for acne-prone skin. With the use of hydra-device, the skin is detoxified using AHAs & BHAs fluids to cleanse the skin, an antioxidant fluid to balance the skin pH and lastly, an appropriate mask is applied depending on the skin concern.',
    duration: '90 mins',
  },
  {
    name: 'Signature Facial Rejuvenation',
    description: 'This facial treatment aims to brighten, tighten, and eliminate the dullness of the skin. It consists of a four-layer facelift that will leave the skin rejuvenated and revitalized.',
    duration: '90 mins',
  },
  {
    name: 'Signature Facial Rejuvenation Plus (Milk Peel)',
    description: 'This signature treatment is a peel with zero downtime. It tackles fine lines and dull complexion, hence helps to restore loss of skin tone.',
    duration: '90 mins',
  },
  {
    name: 'Gommage Facial',
    description: 'This signature correctional facial is an exfoliating and resurfacing treatment. It works like a peel by dissolving all surface impurities with a cocktail of acids leaving the skin brighter, clean, and exfoliated.',
    duration: '75 mins',
  },
  {
    name: 'Hydrojelly Facial',
    description: 'This facial treatment is an effective anti-inflammatory treatment that naturally soothes the skin and is appropriate after intense treatments such as extraction.',
    duration: '60 mins',
  },
  {
    name: 'Hydra Facial',
    description: 'A revitalizing, hydrating, pore-vacuuming facial that gets you glowing almost immediately. It is a completely customizable treatment perfect for all skin types with zero downtime.',
    duration: '60 mins',
  },
  {
    name: 'Dermaspace Acne Treatment Package (Gold/Silver)',
    id: 'acne',
    description: 'Includes a series of mild to invasive sessions with an expert esthetician or dermatologist to treat persistent or severe acne.',
    duration: 'Multiple Sessions',
  },
  {
    name: 'Gentleman Facial',
    description: 'This maintenance facial treatment is designed to cleanse clogged pores, steam, extract, mask, hydrate, shampoo, and condition the beards. Total facial grooming for a gentleman.',
    duration: '75 mins',
  },
  {
    name: 'Microneedling',
    id: 'microneedling',
    description: 'A dermaroller procedure that uses small needles to prick the skin. The purpose of treatment is to generate new collagen and skin tissue for smoother, firmer, and more toned skin. This treatment is most suitable for faces with scars, wrinkles, and large pores.',
    duration: '60 mins',
  },
  {
    name: 'Acnelan Peel',
    description: 'An intensive treatment pack designed for the medical professional to treat acne-prone and seborrhoeic skin. It deep cleanses blocked pores, removes impurities, and improves skin texture.',
    duration: '90 mins',
  },
  {
    name: 'Hyperpigmentation Peel',
    description: 'This advanced skincare treatment is a skin exfoliant procedure that involves the chemical removal of keratinized structures of the epidermis. Perfect for treating dark spots and uneven skin tone.',
    duration: '75 mins',
  },
]

export default function FacialTreatmentsPage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-[#FBF8F4] via-white to-[#f5f0ff]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <Link 
            href="/services" 
            className="inline-flex items-center gap-2 text-[#7B2D8E] font-medium mb-6 hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Services
          </Link>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-balance">
                Facial <span className="gradient-text">Treatments</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 text-pretty">
                Rejuvenate your skin with our expert facial therapies. From deep cleansing to advanced chemical peels, our treatments are designed to give you radiant, healthy-looking skin.
              </p>
            </div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6462-2048x1463.jpg-768x549-2-aOLyIQYjwEGezoOTEw78F0jLOjfkia.webp"
                alt="Facial Treatment"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Treatments List */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="grid gap-6">
            {treatments.map((treatment, index) => (
              <div 
                key={treatment.name}
                id={treatment.id}
                className="group bg-white rounded-xl border border-gray-100 p-6 hover:border-[#7B2D8E]/20 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-sm font-medium text-[#7B2D8E] bg-[#7B2D8E]/10 px-3 py-1 rounded-full">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{treatment.duration}</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                      {treatment.name}
                    </h3>
                    <p className="mt-2 text-gray-600 text-sm leading-relaxed max-w-3xl">
                      {treatment.description}
                    </p>
                  </div>
                  <Button
                    asChild
                    className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full flex-shrink-0"
                  >
                    <Link href="/booking" className="flex items-center gap-2">
                      Book Now
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
