'use client'

import { Phone, MessageCircle, ArrowRight, MapPin, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CTASection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E] via-[#6B2580] to-[#5A1D6A]">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#D4A853]/15 rounded-full blur-3xl -ml-48 -mt-48 animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl mr-32 mb-32 animate-pulse-soft" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#D4A853]/10 rounded-full blur-3xl -ml-40 -mt-40 opacity-50" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 lg:px-6">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <p className="text-[#D4A853] text-sm font-bold uppercase tracking-widest mb-4 inline-block">
            Transform Your Skin
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Ready to Glow?
          </h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Book your appointment today and experience the Dermaspace difference. Our expert estheticians are ready to help you achieve your best skin.
          </p>
        </div>

        {/* Primary CTA Button */}
        <div className="flex justify-center mb-12 animate-fade-in-up delay-200">
          <Button
            asChild
            className="bg-white text-[#7B2D8E] hover:bg-[#D4A853] hover:text-white font-bold px-10 h-14 rounded-xl text-lg transition-all shadow-xl hover:shadow-2xl hover:shadow-[#7B2D8E]/40 inline-flex items-center gap-3"
          >
            <Link href="/booking">
              Schedule Appointment
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        {/* Contact Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 animate-fade-in-up delay-300">
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:border-[#D4A853]/50 hover:bg-white/15 transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-[#D4A853]/30 transition-colors">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white/70 text-sm">Quick Chat</p>
              <p className="text-white font-semibold">WhatsApp Us</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/50 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
          </a>

          <a
            href="tel:+2349017972919"
            className="group flex items-center gap-4 p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:border-[#D4A853]/50 hover:bg-white/15 transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-[#D4A853]/30 transition-colors">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white/70 text-sm">Direct Line</p>
              <p className="text-white font-semibold">+234 901 797 2919</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/50 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all" />
          </a>
        </div>


      </div>
    </section>
  )
}
