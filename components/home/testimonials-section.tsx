'use client'

import Image from 'next/image'
import { Star } from 'lucide-react'

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
    <section className="py-20 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
            Testimonials
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Client Love
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-[#7B2D8E]/30 hover:shadow-md transition-all"
            >
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D4A853] text-[#D4A853]" />
                ))}
              </div>

              <p className="text-base text-gray-600 mb-5 leading-relaxed">
                "{t.review}"
              </p>

              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={t.image}
                    alt={t.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">Verified</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
