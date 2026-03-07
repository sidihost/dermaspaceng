'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Phone, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#7B2D8E]" />
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'url("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-nadRC38CYkHKcEQCbL9fbEsAGflenN.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Decorative Elements */}
      <div className="absolute left-0 top-0 w-40 h-40 opacity-20">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>
      <div className="absolute right-0 bottom-0 w-40 h-40 opacity-20 rotate-180">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
          alt=""
          fill
          className="object-contain"
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 relative z-10 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-balance">
          Ready to Experience <span className="text-[#D4A853]">Premium</span> Spa Care?
        </h2>
        <p className="mt-6 text-lg text-white/80 text-pretty max-w-2xl mx-auto">
          Book your appointment today and let our expert team pamper you with world-class treatments
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-white text-[#7B2D8E] hover:bg-gray-100 rounded-full px-8 h-14 text-base font-semibold group"
          >
            <Link href="/booking" className="flex items-center gap-2">
              Book Appointment
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/+2349013134945"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">WhatsApp Us</span>
            </a>
            <a
              href="tel:+2349017972919"
              className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span className="font-medium">Call Now</span>
            </a>
          </div>
        </div>

        {/* Branch Links */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/70">
          <div>
            <p className="text-sm">Ikoyi Branch</p>
            <a 
              href="https://wa.me/+2349013134945"
              className="text-white font-semibold hover:text-[#D4A853] transition-colors"
            >
              +234 901 313 4945
            </a>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div>
            <p className="text-sm">V.I Branch</p>
            <a 
              href="https://wa.me/+2349061836625"
              className="text-white font-semibold hover:text-[#D4A853] transition-colors"
            >
              +234 906 183 6625
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
