'use client'

import Link from 'next/link'
import { ArrowRight, PartyPopper } from 'lucide-react'

export default function TeamPromoSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#7B2D8E] via-[#8B3D9E] to-[#7B2D8E]">
      <div className="max-w-4xl mx-auto px-4 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-sm rounded-full mb-8">
          <PartyPopper className="w-5 h-5 text-[#D4A853]" />
          <span className="text-base font-semibold text-white">CELEBRATE 2026</span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">
          <span className="text-[#D4A853]">End of Year</span>
        </h2>
        <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
          Team Get-Together
        </h3>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-white/90 font-medium mb-4">
          Getting Ready For that Staff Party?
        </p>

        {/* Description */}
        <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          Looking for the perfect wellness care package for your team or group of friends? Look no further. Treat your team to a day of relaxation and bonding.
        </p>

        {/* CTA Button */}
        <Link
          href="/packages"
          className="inline-flex items-center gap-3 px-10 py-4 text-lg font-semibold text-white bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-full hover:bg-white hover:text-[#7B2D8E] transition-all group"
        >
          Book Your Package
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  )
}
