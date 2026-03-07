'use client'

import { Award, Shield, Heart, Users, Handshake } from 'lucide-react'

const qualities = [
  { icon: Users, title: 'Professional Staff', desc: 'Our highly professional staff and comforting ambiance makes Dermaspace the best choice for your rejuvenating experience. We care!' },
  { icon: Handshake, title: 'Comfortable Environment', desc: 'Step into our spa where comfort takes center stage. With cozy lighting our serene environment invites you to unwind and relax.' },
  { icon: Shield, title: 'SPA Services', desc: 'Body treatments, Facials, Waxing, Nail care, and advanced esthetic treatments such as Acne treatment and Chemical Peel.' },
  { icon: Award, title: 'Premium Quality', desc: 'We use only the finest products and techniques for exceptional results that leave you glowing and rejuvenated.' },
]

export default function QualitiesSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
            Why Choose Us
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Our Qualities
          </h2>
        </div>

        {/* Qualities Grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {qualities.map((q) => (
            <div 
              key={q.title} 
              className="bg-white rounded-xl p-6 border border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 transition-all hover:shadow-md group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-4 group-hover:bg-[#7B2D8E] transition-colors">
                <q.icon className="w-6 h-6 text-[#7B2D8E] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{q.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{q.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
