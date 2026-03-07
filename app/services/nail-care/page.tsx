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
                Nail <span className="gradient-text">Care</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 text-pretty">
                Perfect manicures and pedicures for beautiful, healthy nails. Our expert nail technicians use premium products and techniques to give you stunning results.
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
