'use client'

import Image from 'next/image'
import { Star, Quote } from 'lucide-react'
import { SectionTitle } from '@/components/ui/section-title'

const testimonials = [
  {
    name: 'Oni Oluwadunni',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/review1-150x150.jpg-wXmVZaQRMC8rwj0jIxzbSlfHHONxRD.webp',
    review: "Had a full body massage here, and it was worth every penny. My attendant was really warm and I loved that she noticed that I was cold.",
    rating: 5,
  },
  {
    name: 'Jekein Lato-Unah',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jekein-lato-unah-150x150.jpeg-Am611knEiHci6H0y3MYuTaVQ0D9dZE.webp',
    review: "Really nice services. Music playlist is awesome. I had a good time, I urge you to do same.",
    rating: 5,
  },
  {
    name: 'Onyinyechi Ibelegbu',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/review1-150x150.jpg-wXmVZaQRMC8rwj0jIxzbSlfHHONxRD.webp',
    review: "Had a great Experience. The SPA therapists are professionals and I loved the ambience.",
    rating: 5,
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-[#FDFBF9]">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <SectionTitle
          label="Testimonials"
          title="What Our"
          highlight="Clients Say"
          description="Real experiences from our valued customers"
        />

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <div
              key={testimonial.name}
              className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-[#7B2D8E]/50 hover:shadow-lg hover:shadow-[#7B2D8E]/10 transition-all duration-300 group"
              style={{
                animation: `fade-in-up 0.6s ease-out ${idx * 100}ms forwards`,
                opacity: 0,
              }}
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#7B2D8E]/10 group-hover:bg-[#7B2D8E]/20 transition-colors mb-4">
                <Quote className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              
              <div className="flex gap-0.5 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D4A853] text-[#D4A853]" />
                ))}
              </div>

              <p className="text-gray-600 mb-6">"{testimonial.review}"</p>

              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-xs text-gray-500">Verified Customer</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
