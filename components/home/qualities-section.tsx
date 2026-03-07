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
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-0.5 bg-[#7B2D8E]" />
            <svg className="w-5 h-5 text-[#7B2D8E]/50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className="w-12 h-0.5 bg-[#7B2D8E]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            <span className="text-[#7B2D8E]">OUR</span> QUALITIES
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Why clients choose Dermaspace for their wellness journey
          </p>
        </div>

        {/* Qualities Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {qualities.map((q) => (
            <div 
              key={q.title} 
              className="bg-white rounded-2xl p-8 border-2 border-[#7B2D8E]/10 hover:border-[#7B2D8E]/30 transition-all hover:shadow-lg group"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center mb-6 group-hover:bg-[#7B2D8E] transition-colors">
                <q.icon className="w-8 h-8 text-[#7B2D8E] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{q.title}</h3>
              <p className="text-base text-gray-600 leading-relaxed">{q.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
