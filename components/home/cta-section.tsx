'use client'

import Image from 'next/image'
import { Phone, MessageCircle } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background - Solid Purple */}
      <div className="absolute inset-0 bg-[#7B2D8E]" />
      
      {/* Pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Decorative Elements */}
      <div className="absolute left-0 top-0 w-48 h-48 opacity-20">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>
      <div className="absolute right-0 bottom-0 w-48 h-48 opacity-20 rotate-180">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 relative z-10 text-center">
        {/* Label */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-[#D4A853]" />
          <span>Ready to Transform?</span>
        </div>
        
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-balance leading-tight">
          Experience{' '}
          <span className="text-[#D4A853]">Premium</span>{' '}
          Spa Care
        </h2>
        
        <p className="mt-6 text-lg text-white/80 text-pretty max-w-2xl mx-auto">
          Book your appointment today and let our expert team pamper you with world-class treatments at our Victoria Island or Ikoyi location
        </p>

        {/* Contact Options */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 rounded-full bg-white text-[#7B2D8E] hover:bg-[#D4A853] hover:text-white transition-all duration-300 text-base font-semibold shadow-xl"
          >
            <MessageCircle className="w-5 h-5" />
            <span>WhatsApp Us</span>
          </a>
          <a
            href="tel:+2349017972919"
            className="flex items-center gap-3 px-8 py-4 rounded-full border-2 border-white/40 text-white hover:bg-white/10 transition-all duration-300 text-base font-semibold"
          >
            <Phone className="w-5 h-5" />
            <span>Call Now</span>
          </a>
        </div>

        {/* Branch Links */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-wider mb-2 text-white/50">Ikoyi Branch</p>
            <a 
              href="https://wa.me/+2349013134945"
              className="text-xl text-white font-semibold hover:text-[#D4A853] transition-colors"
            >
              +234 901 313 4945
            </a>
          </div>
          <div className="h-12 w-px bg-white/20" />
          <div className="text-center">
            <p className="text-sm uppercase tracking-wider mb-2 text-white/50">V.I Branch</p>
            <a 
              href="https://wa.me/+2349061836625"
              className="text-xl text-white font-semibold hover:text-[#D4A853] transition-colors"
            >
              +234 906 183 6625
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
