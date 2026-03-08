'use client'

import Link from 'next/link'
import { Phone, ArrowRight } from 'lucide-react'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export default function CTASection() {
  return (
    <section className="py-12 bg-[#7B2D8E]">
      <div className="max-w-4xl mx-auto px-5">
        <div className="text-center mb-8">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/60 mb-2">
            Ready to Glow?
          </p>
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">
            Book Your Appointment
          </h2>
          <p className="text-sm text-white/60">
            Experience the Dermaspace difference today
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Link
            href="/booking"
            className="btn-hover inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-[#7B2D8E] bg-white rounded-full hover:bg-gray-100"
          >
            Book Online
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-hover inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white border border-white/30 rounded-full hover:bg-white/10"
          >
            <WhatsAppIcon className="w-4 h-4" />
            WhatsApp
          </a>
          <a
            href="tel:+2349017972919"
            className="btn-hover inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white border border-white/30 rounded-full hover:bg-white/10"
          >
            <Phone className="w-4 h-4" />
            Call Us
          </a>
        </div>

        <p className="text-center text-white/50 text-xs">
          VI & Ikoyi Locations | Open Mon-Sat 9AM - 7PM
        </p>
      </div>
    </section>
  )
}
