'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Gift } from 'lucide-react'

export default function GiftCardsSection() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Gift Card Visual */}
          <div className="relative flex justify-center">
            {/* Card Stack */}
            <div className="relative">
              {/* Shadow Card 2 */}
              <div className="absolute top-6 left-6 w-72 h-44 bg-[#7B2D8E]/20 rounded-2xl transform rotate-6" />
              
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
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2D8E]/10 mb-3">
              <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Gift Cards</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
              Better than <span className="text-[#7B2D8E]">flowers</span>
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-md">
              Birthday, thank-you, apology, anniversary — whatever the occasion, a Dermaspace gift card lands better than another bouquet. Pick any amount, valid at both branches, never expires.
            </p>
            
            <ul className="space-y-2 mb-5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                Available in any amount
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                Redeemable at both locations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
                Never expires
              </li>
            </ul>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
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
