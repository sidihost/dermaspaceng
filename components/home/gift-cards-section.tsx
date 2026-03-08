'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Gift } from 'lucide-react'

export default function GiftCardsSection() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-[#FDFBF9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
          {/* Gift Card Visual */}
          <div className="relative flex justify-center order-2 md:order-1">
            {/* Card Stack */}
            <div className="relative">
              {/* Shadow Card 2 */}
              <div className="absolute top-4 sm:top-6 left-4 sm:left-6 w-56 sm:w-64 md:w-72 h-36 sm:h-40 md:h-44 bg-[#7B2D8E]/20 rounded-xl sm:rounded-2xl transform rotate-6" />
              
              {/* Shadow Card 1 */}
              <div className="absolute top-2 sm:top-3 left-2 sm:left-3 w-56 sm:w-64 md:w-72 h-36 sm:h-40 md:h-44 bg-[#7B2D8E]/20 rounded-xl sm:rounded-2xl transform rotate-3" />
              
              {/* Main Gift Card */}
              <div className="relative w-56 sm:w-64 md:w-72 h-36 sm:h-40 md:h-44 bg-gradient-to-br from-[#7B2D8E] via-[#6B2580] to-[#5A1D6A] rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl overflow-hidden">
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
                    <p className="text-[10px] text-white/60 mb-1">For: <span className="text-white font-medium">Adeboyega Tolu</span></p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-white/70">Amount</p>
                        <p className="text-xl font-bold text-white">N25,000</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-white/50">From: Chidinma</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center md:text-left order-1 md:order-2">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#7B2D8E]/10 mb-4 sm:mb-5">
              <span className="text-xs sm:text-sm font-semibold text-[#7B2D8E] uppercase tracking-widest">Gift Cards</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-4 sm:mb-5 font-serif">
              Give the Gift of <span className="text-[#7B2D8E]">Relaxation</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed mb-6 sm:mb-8 max-w-lg mx-auto md:mx-0">
              Treat someone special to a day of pampering at Dermaspace. 
              Our gift cards are perfect for birthdays, anniversaries, 
              or simply showing someone you care.
            </p>
            
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-sm sm:text-base md:text-lg text-gray-600">
              <li className="flex items-center justify-center md:justify-start gap-2 sm:gap-3">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#7B2D8E]" />
                Available in any amount
              </li>
              <li className="flex items-center justify-center md:justify-start gap-2 sm:gap-3">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#7B2D8E]" />
                Redeemable at both locations
              </li>
              <li className="flex items-center justify-center md:justify-start gap-2 sm:gap-3">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#7B2D8E]" />
                Never expires
              </li>
            </ul>

            <Link
              href="/gift-cards"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              Purchase Gift Card
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
