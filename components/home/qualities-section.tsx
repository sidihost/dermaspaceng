'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { Users, Leaf, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/section-title'

const qualities = [
  {
    icon: Users,
    title: 'Professional Staff',
    description: 'Our highly professional staff and comforting ambiance makes Dermaspace the best choice for your rejuvenating experience.',
  },
  {
    icon: Leaf,
    title: 'Comfortable Environment',
    description: 'Step into our spa where comfort takes center stage. With cozy lighting our serene environment invites you to unwind.',
  },
  {
    icon: Award,
    title: 'Premium SPA Services',
    description: 'Body treatments, Facial treatments, Waxing, Nail care, and advanced esthetic treatments such as Acne treatment and Chemical Peel.',
  },
]

export default function QualitiesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 bg-[#FBF8F4] relative overflow-hidden">
      {/* Decorative lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[#7B2D8E]/10" />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image Section */}
          <div className={cn(
            'relative transition-all duration-1000',
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
          )}>
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-[#7B2D8E]/10">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                alt="Dermaspace Spa Interior"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[#7B2D8E]/10" />
            </div>
            
            {/* Stats Card */}
            <div className="absolute -right-4 lg:-right-8 bottom-8 bg-white rounded-2xl p-6 shadow-2xl shadow-[#7B2D8E]/10">
              <p className="text-4xl font-bold text-[#7B2D8E]">2019</p>
              <p className="text-sm text-gray-600 mt-1">Founded with passion</p>
            </div>

            {/* Decorative element */}
            <div className="absolute -left-4 top-1/4 w-20 h-20 rounded-2xl bg-[#D4A853]/20 -z-10" />
          </div>

          {/* Content Section */}
          <div className={cn(
            'transition-all duration-1000 delay-200',
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
          )}>
            {/* Section Header */}
            <SectionTitle
              label="Why Choose Us"
              title="Our"
              highlight="Qualities"
              description="At Dermaspace, we combine expertise with care to deliver exceptional spa experiences that leave you feeling renewed."
              align="left"
            />

            {/* Qualities List */}
            <div className="space-y-6">
              {qualities.map((quality, index) => (
                <div
                  key={quality.title}
                  className={cn(
                    'flex gap-5 p-6 rounded-2xl bg-white border border-gray-100 transition-all duration-500',
                    'hover:border-[#7B2D8E]/20 hover:shadow-lg hover:shadow-[#7B2D8E]/5',
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  )}
                  style={{ transitionDelay: `${300 + index * 100}ms` }}
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#7B2D8E] flex items-center justify-center">
                    <quality.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{quality.title}</h3>
                    <p className="mt-2 text-base text-gray-600 leading-relaxed">{quality.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#7B2D8E]/10" />
    </section>
  )
}
