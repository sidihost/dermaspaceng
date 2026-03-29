'use client'

import Link from 'next/link'
import { Phone, ArrowRight, MapPin, Clock } from 'lucide-react'

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
    <section className="relative overflow-hidden">
      {/* Top curve */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
        <svg className="relative block w-full h-12 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="#fff" fillOpacity="1"></path>
        </svg>
      </div>

      <div className="bg-gradient-to-br from-[#7B2D8E] via-[#8B3D9E] to-[#5A1D6A] py-16 md:py-20 pt-24 md:pt-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 md:mb-12">
            <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold text-white/90 uppercase tracking-widest mb-4">
              Ready to Glow?
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 text-balance">
              Book Your Appointment
            </h2>
            {/* Decorative curve */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <svg width="50" height="8" viewBox="0 0 50 8" fill="none" className="w-10 md:w-12">
                <path d="M1 6C12 2 38 2 49 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
              </svg>
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <svg width="50" height="8" viewBox="0 0 50 8" fill="none" className="w-10 md:w-12">
                <path d="M1 6C12 2 38 2 49 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
              </svg>
            </div>
            <p className="text-white/80 max-w-md mx-auto text-sm sm:text-base">
              Experience the Dermaspace difference today
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 md:mb-12">
            <Link
              href="/booking"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-[#7B2D8E] bg-white rounded-full hover:bg-white/90 hover:shadow-lg hover:shadow-white/20 transition-all duration-300"
            >
              Book Online
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://wa.me/+2349013134945"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-white/15 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/25 transition-all duration-300"
            >
              <WhatsAppIcon className="w-4 h-4" />
              WhatsApp
            </a>
            <a
              href="tel:+2349017972919"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-white/15 backdrop-blur-sm border border-white/20 rounded-full hover:bg-white/25 transition-all duration-300"
            >
              <Phone className="w-4 h-4" />
              Call Us
            </a>
          </div>

          {/* Location Info */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/70 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>VI & Ikoyi Locations</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/40" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Open Daily 9AM - 7PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom curve */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180">
        <svg className="relative block w-full h-12 md:h-16" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="#fff" fillOpacity="1"></path>
        </svg>
      </div>
    </section>
  )
}
