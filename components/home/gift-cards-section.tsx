'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Gift } from 'lucide-react'

export default function GiftCardsSection() {
  return (
    <section className="py-20 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Gift Card Visual */}
          <div className="relative flex justify-center">
            {/* Card Stack */}
            <div className="relative">
              {/* Shadow Card 2 */}
              <div className="absolute top-6 left-6 w-72 h-44 bg-[#D4A853]/30 rounded-2xl transform rotate-6" />
              
              {/* Shadow Card 1 */}
              <div className="absolute top-3 left-3 w-72 h-44 bg-[#7B2D8E]/20 rounded-2xl transform rotate-3" />
              
              {/* Main Gift Card */}
              <div className="relative w-72 h-44 bg-gradient-to-br from-[#7B2D8E] via-[#6B2580] to-[#5A1D6A] rounded-2xl p-5 shadow-2xl overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12" />
                </div>
                
                {/* Card Content */}
                <div className="relative h-full flex flex-col justify-between">
                  {/* Top Row */}
                  <div className="flex items-start justify-between">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-Lt9143hBJM7NrscuLhkTb3426o5KzH.webp"
                      alt="Dermaspace"
                      width={100}
                      height={30}
                      className="h-6 w-auto brightness-0 invert"
                    />
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Gift className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-semibold text-white">GIFT CARD</span>
                    </div>
                  </div>
                  
                  {/* Bottom Row */}
                  <div>
                    <p className="text-[10px] text-white/60 mb-1">For Someone Special</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-white/70">Amount</p>
                        <p className="text-xl font-bold text-[#D4A853]">Any Value</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/50">Valid at all locations</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
              Gift Cards
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Give the Gift of Relaxation
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 max-w-md">
              Treat someone special to a day of pampering at Dermaspace. 
              Our gift cards are perfect for birthdays, anniversaries, 
              or simply showing someone you care.
            </p>
            
            <ul className="space-y-2 mb-6 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
                Available in any amount
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
                Redeemable at both locations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
                Never expires
              </li>
            </ul>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Purchase Gift Card
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
