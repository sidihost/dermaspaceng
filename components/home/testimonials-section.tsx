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
    <section ref={sectionRef} className="py-20 bg-gradient-to-b from-white to-[#f8f5fc] relative overflow-hidden">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
      
      {/* Background Decoration */}
      <div className="absolute top-20 right-20 opacity-20">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/515516d9-test-bg-shape.png-hMXaTGVS1uqILJSiItT2vqXG3NJ3Z3.webp"
          alt=""
          width={150}
          height={200}
          className="rotate-180 w-auto h-auto"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 relative z-10">
        {/* Section Header */}
        <SectionTitle
          label="Testimonials"
          title="What Our"
          highlight="Clients Say"
          description="Real experiences from our valued customers who have trusted us with their wellness journey"
        />

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={cn(
                'relative bg-white rounded-2xl p-6 border border-gray-100 transition-all duration-500',
                'hover:border-[#7B2D8E]/20 hover:shadow-sm',
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Quote Icon */}
              <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                <Quote className="w-3.5 h-3.5 text-[#7B2D8E]" />
              </div>

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#D4A853] text-[#D4A853]" />
                ))}
              </div>

              {/* Review */}
              <p className="text-xs text-gray-600 leading-relaxed mb-5">
                "{testimonial.review}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-full overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-[10px] text-gray-500">Verified Customer</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
    </section>
  )
}
