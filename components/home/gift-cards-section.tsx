'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gift, Zap, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionTitle from '@/components/ui/section-title'

const giftCards = [
  {
    id: 'relaxation',
    name: 'Relaxation',
    amount: '₦25,000',
    description: 'Perfect for a rejuvenating escape',
    icon: Heart,
    color: 'bg-gradient-to-br from-[#7B2D8E]/10 to-[#D4A853]/10',
    benefits: ['Full Body Massage', 'Facial Treatment', 'Free Consultation']
  },
  {
    id: 'pamper',
    name: 'Ultimate Pamper',
    amount: '₦50,000',
    description: 'The complete wellness experience',
    icon: Gift,
    color: 'bg-gradient-to-br from-[#D4A853]/10 to-[#7B2D8E]/10',
    benefits: ['All Services Access', 'Priority Booking', 'Welcome Gift']
  },
  {
    id: 'premium',
    name: 'Premium Plus',
    amount: '₦100,000',
    description: 'Luxury at its finest',
    icon: Zap,
    color: 'bg-gradient-to-br from-[#7B2D8E]/5 to-[#D4A853]/5',
    benefits: ['VIP Access', '2 Free Sessions', 'Exclusive Perks']
  }
]

export default function GiftCardsSection() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <SectionTitle label="Gift Cards" />
          <h2 className="text-4xl font-bold text-gray-900 mt-6 mb-4">
            Share the Gift of Wellness
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Give your loved ones the ultimate wellness experience with our beautifully designed gift cards.
          </p>
        </div>

        {/* Preset Gift Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {giftCards.map((card) => {
            const IconComponent = card.icon
            return (
              <div
                key={card.id}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedCard === card.id ? 'ring-2 ring-[#7B2D8E]' : ''
                }`}
                onClick={() => setSelectedCard(card.id)}
              >
                {/* Card Background */}
                <div className={`absolute inset-0 ${card.color} opacity-100 group-hover:opacity-80 transition-opacity`} />
                
                {/* Gradient Border */}
                <div className="absolute inset-0 border-2 border-[#7B2D8E]/20 rounded-2xl" />

                {/* Content */}
                <div className="relative p-8 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#7B2D8E] flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-wider">
                        Gift Card
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{card.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{card.description}</p>
                  </div>

                  <div>
                    <div className="text-3xl font-bold text-[#7B2D8E] mb-4">{card.amount}</div>
                    <ul className="space-y-2 mb-6">
                      {card.benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D4A853]" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className="w-full bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg h-12 font-semibold"
                    >
                      <Link href="/booking">Purchase</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Customizable Section */}
        <div className="bg-gradient-to-r from-[#7B2D8E]/5 to-[#D4A853]/5 rounded-2xl p-12 text-center border border-[#7B2D8E]/10">
          <div className="mb-4">
            <Gift className="w-12 h-12 text-[#7B2D8E] mx-auto" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Custom Gift Card</h3>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Can't find the perfect amount? Create a custom gift card with any value you'd like.
          </p>
          <Button
            asChild
            className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg px-8 h-12 font-semibold"
          >
            <Link href="/booking">Design Your Own</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
