'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Gift } from 'lucide-react'

export default function GiftCardsSection() {
  return (
    <section className="py-16 bg-[#FDFBF9]">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Gift Card Visual */}
          <div className="relative flex justify-center order-2 md:order-1">
            <div className="relative">
              {/* Shadow Cards */}
              <div className="absolute top-4 left-4 w-56 h-36 bg-[#7B2D8E]/15 rounded-xl transform rotate-6" />
              <div className="absolute top-2 left-2 w-56 h-36 bg-[#7B2D8E]/10 rounded-xl transform rotate-3" />
              
              {/* Main Gift Card */}
              <div className="relative w-56 h-36 bg-gradient-to-br from-[#7B2D8E] to-[#5A1D6A] rounded-xl p-4 shadow-xl overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -mr-12 -mt-12" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full -ml-8 -mb-8" />
                </div>
                
                {/* Card Content */}
                <div className="relative h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-pMOw8baIgQKWjuvl5Y8zFWVIOKuGPr.webp"
                      alt="Dermaspace"
                      width={80}
                      height={24}
                      className="h-5 w-auto brightness-0 invert"
                    />
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                      <Gift className="w-2.5 h-2.5 text-white" />
                      <span className="text-[8px] font-medium text-white">GIFT CARD</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[8px] text-white/60 mb-0.5">Amount</p>
                    <p className="text-lg font-bold text-white">N25,000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 md:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
              <span className="text-xs font-medium text-[#7B2D8E] uppercase tracking-wide">Gift Cards</span>
            </div>
            <h2 className="text-headline font-semibold text-gray-900 mb-4">
              Give the Gift of <span className="text-[#7B2D8E]">Relaxation</span>
            </h2>
            <p className="text-body text-gray-600 mb-6">
              Treat someone special to a day of pampering at Dermaspace. 
              Our gift cards are perfect for birthdays, anniversaries, 
              or simply showing someone you care.
            </p>
            
            <ul className="space-y-2 mb-6 text-sm text-gray-600">
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
              href="/gift-cards"
              className="btn-hover inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A]"
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
