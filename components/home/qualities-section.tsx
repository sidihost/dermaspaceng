'use client'

import Image from 'next/image'
import { Award, Shield, Heart, Users } from 'lucide-react'
import { SectionTitle } from '@/components/ui/section-title'

const qualities = [
  {
    icon: Award,
    title: 'Expert Team',
    description: 'Certified estheticians with years of experience',
  },
  {
    icon: Shield,
    title: 'Premium Products',
    description: 'Only the finest skincare brands and tools',
  },
  {
    icon: Heart,
    title: 'Personalized Care',
    description: 'Treatments tailored to your unique needs',
  },
  {
    icon: Users,
    title: 'Trusted by Many',
    description: 'Over 1000+ satisfied clients',
  },
]

export default function QualitiesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6401-1024x731.jpg-2JIwk298ibQ6byxSACK1nUh6Fnqjcw.webp"
                alt="Dermaspace Interior"
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <SectionTitle
              label="Why Choose Us"
              title="The Dermaspace"
              highlight="Difference"
              description="We combine luxury with expertise to deliver exceptional spa experiences"
              centered={false}
            />

            <div className="grid sm:grid-cols-2 gap-6">
              {qualities.map((quality) => (
                <div key={quality.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                    <quality.icon className="w-6 h-6 text-[#7B2D8E]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{quality.title}</h3>
                    <p className="text-sm text-gray-600">{quality.description}</p>
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
