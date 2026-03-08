'use client'

import Image from 'next/image'
import { Star } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

const testimonials = [
  {
    name: 'Oni Oluwadunni',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/review1-150x150.jpg-wXmVZaQRMC8rwj0jIxzbSlfHHONxRD.webp',
    review: "Had a full body massage here, and it was worth every penny. My attendant was really warm.",
  },
  {
    name: 'Jekein Lato-Unah',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jekein-lato-unah-150x150.jpeg-Am611knEiHci6H0y3MYuTaVQ0D9dZE.webp',
    review: "Really nice services. Music playlist is awesome. I had a good time.",
  },
  {
    name: 'Onyinyechi Ibelegbu',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/review1-150x150.jpg-wXmVZaQRMC8rwj0jIxzbSlfHHONxRD.webp',
    review: "Had a great Experience. The SPA therapists are professionals.",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-24 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Testimonials"
          title="What Our Clients"
          highlight="Say"
          description="Real experiences from our valued clients who trust us with their wellness journey."
        />

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-lg transition-all"
            >
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#7B2D8E] text-[#7B2D8E]" />
                ))}
              </div>

              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                "{t.review}"
              </p>

              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={t.image}
                    alt={t.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">Verified Client</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
