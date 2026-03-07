'use client'

import Link from 'next/link'
import { Phone, MessageCircle, ArrowRight } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-20 bg-[#7B2D8E]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
            Ready to Glow?
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Book Your Appointment
          </h2>
          <p className="text-sm text-white/70 max-w-md mx-auto">
            Experience the Dermaspace difference today
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#7B2D8E] bg-white rounded-full hover:bg-[#D4A853] hover:text-white transition-colors"
          >
            Book Online
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white border border-white/30 rounded-full hover:bg-white/10 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>
          <a
            href="tel:+2349017972919"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white border border-white/30 rounded-full hover:bg-white/10 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call Us
          </a>
        </div>

        <div className="text-center text-white/60 text-xs">
          VI & Ikoyi Locations | Open Daily 9AM - 7PM
        </div>
      </div>
    </section>
  )
}
