'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function GiftCardsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Content */}
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
              Gift Cards
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Give the Gift of Relaxation
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Treat someone special to a day of pampering at Dermaspace. 
              Our gift cards are perfect for birthdays, anniversaries, 
              or just because.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Get a Gift Card
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Visual */}
          <div className="relative flex justify-center md:justify-end">
            {/* Card Stack Effect */}
            <div className="relative w-72">
              {/* Back Card */}
              <div className="absolute top-4 left-4 w-full h-44 bg-[#D4A853]/20 rounded-2xl transform rotate-3" />
              
              {/* Front Card */}
              <div className="relative bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                    alt="Dermaspace"
                    width={80}
                    height={24}
                    className="h-5 w-auto brightness-0 invert"
                  />
                  <span className="text-xs font-semibold bg-white/20 px-2 py-1 rounded">
                    GIFT CARD
                  </span>
                </div>
                
                <p className="text-sm text-white/70 mb-1">For</p>
                <p className="text-lg font-semibold mb-4">Someone Special</p>
                
                <div className="flex items-end justify-between pt-4 border-t border-white/20">
                  <div>
                    <p className="text-xs text-white/60">Valid at all locations</p>
                  </div>
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot_53-4HJoMu3lPWpxJyT6B7FvcFeZ6FmdXP.webp"
                    alt=""
                    width={48}
                    height={48}
                    className="w-10 h-10 object-contain opacity-80"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
