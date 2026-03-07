'use client'

import Image from 'next/image'
import { Award, Shield, Heart, Users } from 'lucide-react'

const qualities = [
  { icon: Award, title: 'Expert Team', desc: 'Certified estheticians with years of experience' },
  { icon: Shield, title: 'Premium Products', desc: 'Only the finest skincare brands used' },
  { icon: Heart, title: 'Personalized Care', desc: 'Treatments tailored to your needs' },
  { icon: Users, title: 'Trusted by Many', desc: 'Hundreds of happy clients served' },
]

export default function QualitiesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
            Why Choose Us
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            The Dermaspace Difference
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            We combine luxury with expertise for exceptional spa experiences
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                alt="Dermaspace Interior"
                fill
                className="object-cover"
              />
            </div>
            {/* Decorative accent */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#D4A853]/20 rounded-2xl -z-10" />
          </div>

          {/* Qualities Grid */}
          <div className="order-1 lg:order-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {qualities.map((q) => (
                <div 
                  key={q.title} 
                  className="bg-[#FDFBF9] rounded-xl p-5 hover:shadow-md transition-shadow border border-transparent hover:border-[#7B2D8E]/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4">
                    <q.icon className="w-6 h-6 text-[#7B2D8E]" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{q.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{q.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
