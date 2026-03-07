'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { Star, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/section-title'

const testimonials = [
  {
    name: 'Oni Oluwadunni',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/review1-150x150.jpg-wXmVZaQRMC8rwj0jIxzbSlfHHONxRD.webp',
    review: "Had a full body massage here, and it was worth every penny. My attendant was really warm and I loved that she noticed that I was cold. The ambience is also lovely and I particularly enjoyed their music selection.",
    rating: 5,
  },
  {
    name: 'Jekein Lato-Unah',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jekein-lato-unah-150x150.jpeg-Am611knEiHci6H0y3MYuTaVQ0D9dZE.webp',
    review: "Easy direction using google maps. Really nice services. Music playlist is awesome. I had a good time, I urge you to do same.",
    rating: 5,
  },
  {
    name: 'Onyinyechi Ibelegbu',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/review1-150x150.jpg-wXmVZaQRMC8rwj0jIxzbSlfHHONxRD.webp',
    review: "Had a great Experience. The SPA therapists are professionalists and I loved the ambience.",
    rating: 5,
  },
]

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-white to-[#f8f5fc] relative overflow-hidden">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
      
      {/* Background Decoration */}
      <div className="absolute top-40 right-0 w-96 h-96 bg-gradient-to-br from-[#7B2D8E]/5 to-transparent rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 relative z-10">
        {/* Section Header */}
        <SectionTitle
          label="Testimonials"
          title="What Our"
          highlight="Clients Say"
          description="Real experiences from our valued customers who have trusted us with their wellness journey"
        />

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={cn(
                'relative bg-white rounded-3xl p-8 transition-all duration-700',
                'shadow-xl shadow-[#7B2D8E]/5 hover:shadow-2xl hover:shadow-[#7B2D8E]/10',
                'border border-gray-100 hover:border-[#7B2D8E]/20',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              )}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#D4A853]/10 flex items-center justify-center">
                <Quote className="w-5 h-5 text-[#7B2D8E]" />
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#D4A853] text-[#D4A853]" />
                ))}
              </div>

              {/* Review */}
              <p className="text-base text-gray-600 leading-relaxed mb-8">
                "{testimonial.review}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-[#7B2D8E]">Verified Customer</p>
                </div>
              </div>

              {/* Decorative corner */}
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-[#7B2D8E]/5 to-transparent rounded-tl-[100px]" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
    </section>
  )
}
