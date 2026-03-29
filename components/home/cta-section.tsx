'use client'

import { Phone, MapPin, Clock } from 'lucide-react'

// WhatsApp Brand Icon SVG
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
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-xs font-semibold text-white uppercase tracking-widest mb-3">
            Ready to Glow?
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
            Book Your Appointment
          </h2>
          {/* Curved underline */}
          <svg className="w-32 h-2 mx-auto mb-3" viewBox="0 0 120 8" fill="none">
            <path d="M2 6C30 2 90 2 118 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.5"/>
          </svg>
          <p className="text-white/80 max-w-md mx-auto text-sm">
            Experience the Dermaspace difference today
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#7B2D8E] bg-white rounded-full hover:bg-white/90 transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            WhatsApp
          </a>
          <a
            href="tel:+2349017972919"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white border border-white/30 rounded-full hover:bg-white/10 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call Us
          </a>
        </div>

        {/* Location Info */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-white/70 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>VI & Ikoyi Locations</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-white/40" />
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Open Daily 9AM - 7PM</span>
          </div>
        </div>
      </div>
    </section>
  )
}
