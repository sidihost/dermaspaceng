'use client'

import Image from 'next/image'
import { Phone, MessageCircle } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background - Light gradient instead of dark */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] via-[#9B4DB0] to-[#C41E8E]" />
      
      {/* Pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Decorative Elements */}
      <div className="absolute left-0 top-0 w-32 h-32 opacity-20">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>
      <div className="absolute right-0 bottom-0 w-32 h-32 opacity-20 rotate-180">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 relative z-10 text-center">
        {/* Label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-[10px] font-medium uppercase tracking-wider mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4A853] animate-pulse" />
          <span>Ready to Transform?</span>
        </div>
        
        <h2 className="text-2xl md:text-3xl font-semibold text-white text-balance leading-tight">
          Experience{' '}
          <span className="text-[#D4A853]">Premium</span>{' '}
          Spa Care
        </h2>
        
        <p className="mt-4 text-sm text-white/70 text-pretty max-w-xl mx-auto">
          Book your appointment today and let our expert team pamper you with world-class treatments
        </p>

        {/* Contact Options */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#7B2D8E] hover:bg-[#D4A853] hover:text-white transition-colors text-xs font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Us</span>
          </a>
          <a
            href="tel:+2349017972919"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors text-xs font-medium"
          >
            <Phone className="w-4 h-4" />
            <span>Call Now</span>
          </a>
        </div>

        {/* Branch Links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-white/60 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5">Ikoyi Branch</p>
            <a 
              href="https://wa.me/+2349013134945"
              className="text-white font-medium hover:text-[#D4A853] transition-colors"
            >
              +234 901 313 4945
            </a>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5">V.I Branch</p>
            <a 
              href="https://wa.me/+2349061836625"
              className="text-white font-medium hover:text-[#D4A853] transition-colors"
            >
              +234 906 183 6625
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
