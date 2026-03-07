'use client'

import { Phone, MessageCircle } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-20 bg-[#7B2D8E]">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-white/70 mb-4">
          Ready to Transform?
        </p>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Experience Premium Spa Care
        </h2>
        
        <p className="text-base text-white/80 mb-8 max-w-xl mx-auto">
          Book your appointment today at our Victoria Island or Ikoyi location
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#7B2D8E] hover:bg-[#D4A853] hover:text-white transition-colors font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp Us
          </a>
          <a
            href="tel:+2349017972919"
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors font-medium"
          >
            <Phone className="w-5 h-5" />
            Call Now
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-white/80">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Ikoyi</p>
            <a href="tel:+2349013134945" className="font-medium hover:text-[#D4A853]">
              +234 901 313 4945
            </a>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-white/50 mb-1">V.I</p>
            <a href="tel:+2349061836625" className="font-medium hover:text-[#D4A853]">
              +234 906 183 6625
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
