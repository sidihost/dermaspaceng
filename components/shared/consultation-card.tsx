"use client"

import Link from "next/link"
import { Heart, ArrowRight, Phone, Calendar } from "lucide-react"

interface ConsultationCardProps {
  variant?: "default" | "compact" | "full"
  className?: string
}

export default function ConsultationCard({ variant = "default", className = "" }: ConsultationCardProps) {
  if (variant === "compact") {
    return (
      <div className={`group relative overflow-hidden rounded-xl bg-[#7B2D8E] ${className}`}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Free Consultation</h3>
              <p className="text-white/70 text-xs">Book your skin analysis</p>
            </div>
          </div>
          <Link
            href="/free-consultation"
            className="flex-shrink-0 px-3 py-1.5 bg-white text-[#7B2D8E] rounded-full font-medium text-xs hover:bg-white/90 transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    )
  }

  if (variant === "full") {
    return (
      <div className={`group relative overflow-hidden rounded-2xl bg-[#7B2D8E] ${className}`}>
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 right-8 w-2 h-2 bg-white/50 rounded-full" />

        <div className="relative z-10 p-6 md:p-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-4">
              <Heart className="w-3 h-3" />
              Free Service
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              Not Sure Which Treatment Is Right For You?
            </h2>
            
            <p className="text-sm text-white/80 mb-5 leading-relaxed">
              Book a free consultation with our expert estheticians who will analyze your skin 
              and recommend personalized treatments.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                "Personalized skin analysis",
                "Expert recommendations",
                "No obligation required",
                "Available at both branches"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/90 text-xs">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/free-consultation"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#7B2D8E] rounded-full font-semibold text-sm hover:bg-white/90 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Schedule Consultation
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="https://wa.me/+2349013134945"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 text-white rounded-full font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                <Phone className="w-4 h-4" />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          
          <div className="flex-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium mb-2">
              Free Service
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1">
              Book a Free Consultation
            </h3>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Let our certified estheticians analyze your skin and recommend perfect treatments.
            </p>

            <div className="space-y-1.5 mb-4">
              {[
                "Personalized skin analysis",
                "Expert recommendations",
                "No commitment required"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-xs">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/free-consultation"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7B2D8E] text-white rounded-full font-medium text-xs hover:bg-[#5A1D6A] transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Now
              </Link>
              <a
                href="tel:+2349017972919"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 rounded-full font-medium text-xs hover:border-[#7B2D8E] hover:text-[#7B2D8E] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Call Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
