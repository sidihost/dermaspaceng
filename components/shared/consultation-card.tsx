"use client"

import Link from "next/link"
import Image from "next/image"
import { Sparkles, ArrowRight, Phone, MessageCircle, Calendar } from "lucide-react"

interface ConsultationCardProps {
  variant?: "default" | "compact" | "full"
  className?: string
}

export default function ConsultationCard({ variant = "default", className = "" }: ConsultationCardProps) {
  if (variant === "compact") {
    return (
      <div className={`group relative overflow-hidden rounded-2xl ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--derma-purple)] via-[var(--derma-magenta)] to-[var(--derma-purple-dark)]" />
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/515516d9-test-bg-shape.png-hMXaTGVS1uqILJSiItT2vqXG3NJ3Z3.webp"
            alt=""
            fill
            className="object-cover"
          />
        </div>
        
        <div className="relative z-10 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Free Consultation</h3>
              <p className="text-white/70 text-sm">Book your skin analysis</p>
            </div>
          </div>
          <Link
            href="/booking"
            className="flex-shrink-0 px-4 py-2 bg-white text-[var(--derma-purple)] rounded-full font-medium text-sm hover:bg-white/90 transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    )
  }

  if (variant === "full") {
    return (
      <div className={`group relative overflow-hidden rounded-3xl ${className}`}>
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--derma-purple)] via-[var(--derma-purple-dark)] to-[var(--derma-magenta)]" />
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[var(--derma-gold)]/10 blur-3xl" />
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_55-SAfBrHHb9LcLPNW7pEtKSIkAVLBxnu.webp"
            alt=""
            width={150}
            height={150}
            className="absolute top-10 right-10 opacity-30"
          />
        </div>

        <div className="relative z-10 p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Content */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-6 backdrop-blur-sm">
                <Sparkles className="w-4 h-4" />
                Free Consultation
              </span>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                Not Sure Which Treatment <span className="text-[var(--derma-gold)]">Is Right For You?</span>
              </h2>
              
              <p className="text-lg text-white/80 mb-8 leading-relaxed">
                Book a free consultation with our expert estheticians who will analyze your skin 
                and recommend personalized treatments tailored to your unique needs.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  "Personalized skin analysis & assessment",
                  "Expert treatment recommendations",
                  "No obligation to book any service",
                  "Available at both branches"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[var(--derma-gold)] flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white/90">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--derma-purple)] rounded-full font-semibold hover:bg-white/90 transition-colors group/btn"
                >
                  <Calendar className="w-5 h-5" />
                  Schedule Consultation
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="https://wa.me/+2349013134945"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 text-white rounded-full font-semibold hover:bg-white/10 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp Us
                </Link>
              </div>
            </div>

            {/* Image */}
            <div className="relative hidden lg:block">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp"
                  alt="Dermaspace Expert Consultation"
                  fill
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--derma-purple)]/60 to-transparent" />
              </div>

              {/* Floating Card */}
              <div className="absolute -left-6 bottom-10 bg-white rounded-2xl p-4 max-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--derma-purple)]/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[var(--derma-purple)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Expert Team</p>
                    <p className="text-xs text-gray-500">Licensed Professionals</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={`group relative overflow-hidden rounded-3xl bg-white ${className}`}>
      {/* Gradient Border Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--derma-purple)] via-[var(--derma-magenta)] to-[var(--derma-purple-light)] rounded-3xl p-[2px]">
        <div className="absolute inset-[2px] bg-white rounded-[22px]" />
      </div>

      <div className="relative z-10 p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* Image */}
          <div className="relative w-full md:w-1/3 aspect-square md:aspect-[3/4] rounded-2xl overflow-hidden flex-shrink-0">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/franca-1-ZLFTvxIeaKIywWjr4amphoEGwfmuOe.webp"
              alt="Dermaspace Expert"
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--derma-purple)]/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-semibold">Expert Consultation</p>
              <p className="text-white/80 text-sm">Free skin analysis</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--derma-purple)]/10 text-[var(--derma-purple)] text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Free Service
            </div>

            <h3 className="text-2xl font-bold text-[var(--derma-purple-dark)] mb-3">
              Book a Free Consultation
            </h3>

            <p className="text-gray-600 mb-6 leading-relaxed">
              Let our certified estheticians analyze your skin and recommend the perfect treatments for your unique needs.
            </p>

            <div className="space-y-3 mb-6">
              {[
                "Personalized skin analysis",
                "Expert recommendations",
                "No commitment required"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[var(--derma-purple)]/10 flex items-center justify-center">
                    <svg className="w-3 h-3 text-[var(--derma-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-sm">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[var(--derma-purple)] to-[var(--derma-magenta)] text-white rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <Calendar className="w-4 h-4" />
                Schedule Now
              </Link>
              <Link
                href="https://wa.me/+2349013134945"
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-full font-medium text-sm hover:border-[var(--derma-purple)] hover:text-[var(--derma-purple)] transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
