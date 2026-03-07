'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { Users, Leaf, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const qualities = [
  {
    icon: Users,
    title: 'Professional Staff',
    description: 'Our highly professional staff and comforting ambiance makes Dermaspace the best choice for your rejuvenating experience. We care!',
  },
  {
    icon: Leaf,
    title: 'Comfortable Environment',
    description: 'Step into our spa where comfort takes center stage. With cozy lighting our serene environment invites you to unwind and embrace ultimate relaxation.',
  },
  {
    icon: Sparkles,
    title: 'Premium SPA Services',
    description: 'Our core areas are Body treatments, Facial treatments, Waxing, Nail care, and advanced esthetic treatments such as Acne treatment and Chemical Peel.',
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
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-[#FBF8F4] to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image Section */}
          <div className={cn(
            'relative transition-all duration-1000',
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
          )}>
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                alt="Dermaspace Spa Interior"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7B2D8E]/30 to-transparent" />
            </div>
            
            {/* Stats Card */}
            <div className="absolute -right-4 lg:-right-8 bottom-8 bg-white rounded-xl p-6 max-w-[200px]">
              <p className="text-4xl font-bold text-[#7B2D8E]">2019</p>
              <p className="text-sm text-gray-600 mt-1">Founded with passion for skincare excellence</p>
            </div>
          </div>

          {/* Content Section */}
          <div className={cn(
            'space-y-8 transition-all duration-1000 delay-200',
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
          )}>
            {/* Section Header */}
            <div>
              <span className="text-[#7B2D8E] text-sm font-semibold tracking-wider uppercase">
                Why Choose Us
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-balance">
                Our <span className="gradient-text">Qualities</span>
              </h2>
              <p className="mt-6 text-lg text-gray-600 text-pretty">
                At Dermaspace, we combine expertise with care to deliver exceptional spa experiences that leave you feeling rejuvenated.
              </p>
            </div>

            {/* Qualities List */}
            <div className="space-y-6">
              {qualities.map((quality, index) => (
                <div
                  key={quality.title}
                  className={cn(
                    'flex gap-5 p-5 rounded-xl bg-white border border-gray-100 transition-all duration-500',
                    'hover:border-[#7B2D8E]/20 hover:bg-[#7B2D8E]/5',
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  )}
                  style={{ transitionDelay: `${300 + index * 150}ms` }}
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                    <quality.icon className="w-7 h-7 text-[#7B2D8E]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{quality.title}</h3>
                    <p className="mt-2 text-gray-600 text-sm leading-relaxed">{quality.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
