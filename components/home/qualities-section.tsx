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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Why Choose Us</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Our <span className="text-[#7B2D8E]">Qualities</span>
          </h2>
          {/* Decorative curve */}
          <div className="flex items-center justify-center gap-1 mt-4">
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
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
