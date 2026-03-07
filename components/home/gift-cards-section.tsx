'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gift, Heart, Crown, Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionTitle } from '@/components/ui/section-title'

const presetCards = [
  {
    id: 'relaxation',
    name: 'Relaxation',
    amount: '₦25,000',
    description: 'Perfect for a rejuvenating escape',
    icon: Heart,
    benefits: ['Full Body Massage', 'Facial Treatment', 'Free Consultation'],
    color: 'from-[#7B2D8E]',
  },
  {
    id: 'pamper',
    name: 'Ultimate Pamper',
    amount: '₦50,000',
    description: 'The complete wellness experience',
    icon: Gift,
    benefits: ['All Services Access', 'Priority Booking', 'Welcome Gift'],
    color: 'from-[#D4A853]',
    featured: true,
  },
  {
    id: 'premium',
    name: 'Premium Plus',
    amount: '₦100,000',
    description: 'Luxury at its finest',
    icon: Crown,
    benefits: ['VIP Access', '2 Free Sessions', 'Exclusive Perks'],
    color: 'from-[#7B2D8E]',
  },
]

export default function GiftCardsSection() {
  const [selectedAmount, setSelectedAmount] = useState<string>('')
  const [showCustomize, setShowCustomize] = useState(false)

  return (
    <section className="py-24 bg-gradient-to-b from-white to-[#FDFBF9]">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionTitle
            label="Gift Cards"
            title="Share the"
            highlight="Gift of Wellness"
            description="Beautifully designed gift cards for that perfect present"
          />
        </div>

        {/* Preset Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {presetCards.map((card, idx) => {
            const IconComponent = card.icon
            return (
              <div
                key={card.id}
                className="group relative"
                style={{
                  animation: `fade-in-up 0.6s ease-out ${idx * 100}ms forwards`,
                  opacity: 0,
                }}
              >
                <div
                  className={`h-full rounded-2xl p-8 bg-gradient-to-br ${card.color} to-[#5A1D6A] text-white overflow-hidden transition-all duration-300 ${
                    card.featured ? 'md:scale-105 shadow-2xl shadow-[#7B2D8E]/30' : 'hover:shadow-lg hover:shadow-[#7B2D8E]/20'
                  }`}
                >
                  {/* Background Decoration */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-500" />

                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    {/* Top */}
                    <div>
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <IconComponent className="w-7 h-7" />
                        </div>
                        {card.featured && (
                          <div className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                            Popular
                          </div>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{card.name}</h3>
                      <p className="text-white/80 text-sm mb-6">{card.description}</p>
                    </div>

                    {/* Amount */}
                    <div className="mb-6">
                      <p className="text-5xl font-bold tracking-tight">{card.amount}</p>
                      <p className="text-white/70 text-sm mt-1">One-time use</p>
                    </div>

                    {/* Benefits */}
                    <div className="mb-6 space-y-3 border-t border-white/20 pt-6">
                      {card.benefits.map((benefit) => (
                        <div key={benefit} className="flex items-center gap-3">
                          <Check className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    {/* Button */}
                    <Button
                      onClick={() => setSelectedAmount(card.amount)}
                      className="w-full bg-white text-[#7B2D8E] hover:bg-white/90 font-semibold rounded-lg transition-all group/btn"
                    >
                      Purchase
                      <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Customizable Gift Card */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#7B2D8E]/10 via-[#D4A853]/10 to-[#7B2D8E]/10" />
          <div className="relative bg-white/50 backdrop-blur-sm border border-gray-200 rounded-2xl p-12">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Create a Custom Gift Card
              </h3>
              <p className="text-gray-600 mb-8">
                Don't see the perfect amount? Create a custom gift card with any value you choose. Your recipient can use it for their favorite treatments.
              </p>

              {/* Input Field */}
              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₦</span>
                  <input
                    type="number"
                    placeholder="Enter custom amount"
                    value={selectedAmount}
                    onChange={(e) => setSelectedAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:border-[#7B2D8E] focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 transition-all"
                  />
                </div>
                <Button
                  className="bg-[#7B2D8E] hover:bg-[#5A1D6A] text-white rounded-lg px-8 font-semibold transition-all hover:shadow-lg hover:shadow-[#7B2D8E]/20"
                  onClick={() => setShowCustomize(true)}
                  disabled={!selectedAmount}
                >
                  Customize
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Minimum amount: ₦5,000 | Maximum amount: ₦500,000
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
