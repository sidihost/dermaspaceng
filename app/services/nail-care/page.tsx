import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { ArrowRight, ChevronLeft, Droplets, Flower2, Palette, Footprints } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Nail Care Services',
  description: 'Professional nail care services at Dermaspace Lagos. Manicures, pedicures, hot wax treatments, jelly pedicures, and more for beautiful, healthy nails.',
}

const treatments = [
  {
    name: 'Hot Wax Mani-Pedi',
    description: 'This treatment involves the use of heated paraffin wax, mineral oil, and petroleum-based wax to cleanse and exfoliate dead skin cells or calluses leaving the feet smooth and soft.',
    icon: '🔥',
  },
  {
    name: 'Jelly Pedicure',
    description: 'This treatment involves detoxifying, softening, and cleansing the feet while providing relaxing aromatherapy. A luxurious experience for tired feet.',
    icon: '✨',
  },
  {
    name: 'Manicure',
    description: 'This treatment helps boost confidence, prevent fungal infections, and improve blood circulation. Includes nail shaping, cuticle care, and polish application.',
    icon: '💅',
  },
  {
    name: 'Pedicure',
    description: 'Complete foot care treatment including soaking, exfoliation, nail shaping, cuticle care, massage, and polish application for beautiful, healthy feet.',
    icon: '🦶',
  },
]

export default function NailCarePage() {
  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 bg-[#FDFBF9]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link 
            href="/services" 
            className="inline-flex items-center gap-2 text-[#7B2D8E] text-sm font-medium mb-6 hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Services
          </Link>
          <p className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest mb-4">
            Our Services
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Nail <span className="text-[#7B2D8E]">Care</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-0.5 bg-[#D4A853]" />
            <div className="w-2 h-0.5 bg-[#7B2D8E]/30" />
          </div>
          <p className="text-gray-600 max-w-xl mx-auto mb-8">
            Professional manicures and pedicures for beautiful, healthy nails.
          </p>
          <Button
                asChild
                className="mt-8 bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-full px-8"
              >
                <Link href="/booking" className="flex items-center gap-2">
                  Book Appointment
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/young-woman-getting-her-nails-done-salon-scaled.jpg-768x512-1-dTT1qPz9fJm1tSGBMYraVrKPoDeTdC.webp"
                alt="Nail Care Services"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Treatments Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
              Our Treatments
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
              Nail Care <span className="gradient-text">Services</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {treatments.map((treatment) => (
              <div 
                key={treatment.name}
                className="group bg-white rounded-2xl border border-gray-100 p-8 hover:border-[#7B2D8E]/20 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center mb-6">
                  <Palette className="w-8 h-8 text-[#7B2D8E]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                  {treatment.name}
                </h3>
                <p className="mt-3 text-gray-600 leading-relaxed">
                  {treatment.description}
                </p>
                <Link
                  href="/booking"
                  className="mt-6 inline-flex items-center gap-2 text-[#7B2D8E] font-medium hover:underline"
                >
                  Book Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
