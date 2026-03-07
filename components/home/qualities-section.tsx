'use client'

import Image from 'next/image'
import { Award, Shield, Heart, Users } from 'lucide-react'

const qualities = [
  { icon: Award, title: 'Expert Team', desc: 'Certified estheticians' },
  { icon: Shield, title: 'Premium Products', desc: 'Top skincare brands' },
  { icon: Heart, title: 'Personalized Care', desc: 'Tailored treatments' },
  { icon: Users, title: 'Trusted by Many', desc: 'Happy clients' },
]

export default function QualitiesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
              alt="Dermaspace Interior"
              fill
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
              Why Choose Us
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              The Dermaspace Difference
            </h2>
            <p className="text-sm text-gray-600 mb-8 max-w-md mx-auto lg:mx-0">
              We combine luxury with expertise for exceptional spa experiences
            </p>

            <div className="grid grid-cols-2 gap-4">
              {qualities.map((q) => (
                <div key={q.title} className="flex items-center gap-3 p-3 rounded-xl bg-[#FDFBF9]">
                  <div className="w-10 h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <q.icon className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{q.title}</p>
                    <p className="text-[10px] text-gray-500">{q.desc}</p>
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
