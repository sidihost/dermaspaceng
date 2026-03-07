'use client'

import { useState } from 'react'
import Image from 'next/image'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Gift, Heart, Send, Download, Check, ChevronRight } from 'lucide-react'

const giftCardAmounts = [10000, 15000, 20000, 25000, 50000, 100000]

const cardDesigns = [
  { id: 'elegant', name: 'Royal Purple', gradient: 'from-[#7B2D8E] to-[#5A1D6A]', accent: '#D4A853' },
  { id: 'golden', name: 'Golden Luxe', gradient: 'from-[#D4A853] to-[#B8922F]', accent: '#7B2D8E' },
  { id: 'rose', name: 'Blush Rose', gradient: 'from-[#E8A4B4] to-[#D47A8E]', accent: '#7B2D8E' },
  { id: 'midnight', name: 'Midnight Glam', gradient: 'from-[#2D2D4E] to-[#1A1A2E]', accent: '#D4A853' },
]

const occasions = ['Birthday', 'Anniversary', 'Thank You', 'Self-Care', 'Wedding', 'Just Because']

export default function GiftCardsPage() {
  const [selectedAmount, setSelectedAmount] = useState<number>(25000)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedDesign, setSelectedDesign] = useState(cardDesigns[0])
  const [selectedOccasion, setSelectedOccasion] = useState('Birthday')
  const [recipientName, setRecipientName] = useState('Adeboyega Tolu')
  const [senderName, setSenderName] = useState('Chidinma Okonkwo')
  const [personalMessage, setPersonalMessage] = useState('Happy Birthday! Treat yourself to a day of relaxation and pampering. You deserve it!')
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'download'>('email')
  const [recipientEmail, setRecipientEmail] = useState('adeboyega.tolu@gmail.com')

  const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero Section */}
        <section className="relative py-16 md:py-20 bg-[#7B2D8E] overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4A853]/10 rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <Gift className="w-3.5 h-3.5 text-[#D4A853]" />
              <span className="text-xs font-medium text-[#D4A853] uppercase tracking-widest">Gift Cards</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Give the Gift of <span className="text-[#D4A853]">Relaxation</span>
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-md mx-auto">
              Create a personalized spa gift card for someone special. Perfect for birthdays, anniversaries, or just because.
            </p>
            
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
              <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
              <div className="w-8 h-0.5 bg-[#D4A853]/50" />
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Customizer Form */}
              <div className="space-y-8">
                {/* Amount Selection */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Amount</h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {giftCardAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => { setSelectedAmount(amount); setCustomAmount('') }}
                        className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                          selectedAmount === amount && !customAmount
                            ? 'bg-[#7B2D8E] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        N{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">N</span>
                    <input
                      type="number"
                      placeholder="Enter custom amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                    />
                  </div>
                </div>

                {/* Design Selection */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Design</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {cardDesigns.map((design) => (
                      <button
                        key={design.id}
                        onClick={() => setSelectedDesign(design)}
                        className={`relative p-4 rounded-xl transition-all ${
                          selectedDesign.id === design.id
                            ? 'ring-2 ring-[#7B2D8E] ring-offset-2'
                            : 'hover:scale-105'
                        }`}
                      >
                        <div className={`h-16 rounded-lg bg-gradient-to-br ${design.gradient}`} />
                        <p className="text-xs font-medium text-gray-700 mt-2">{design.name}</p>
                        {selectedDesign.id === design.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-[#7B2D8E] rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Occasion</h3>
                  <div className="flex flex-wrap gap-2">
                    {occasions.map((occasion) => (
                      <button
                        key={occasion}
                        onClick={() => setSelectedOccasion(occasion)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedOccasion === occasion
                            ? 'bg-[#7B2D8E] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {occasion}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Personalization */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalize</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient's Name</label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Enter recipient's name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Personal Message</label>
                      <textarea
                        value={personalMessage}
                        onChange={(e) => setPersonalMessage(e.target.value)}
                        placeholder="Write a heartfelt message..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E] resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Method</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDeliveryMethod('email')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        deliveryMethod === 'email'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Send className={`w-5 h-5 ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Send via Email
                        </p>
                        <p className="text-xs text-gray-500">Deliver instantly</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setDeliveryMethod('download')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        deliveryMethod === 'download'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Download className={`w-5 h-5 ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Download
                        </p>
                        <p className="text-xs text-gray-500">Print at home</p>
                      </div>
                    </button>
                  </div>

                  {deliveryMethod === 'email' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient's Email</label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="Enter recipient's email"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              <div className="lg:sticky lg:top-24 h-fit">
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
                  
                  {/* Gift Card Preview */}
                  <div className={`relative aspect-[1.6/1] rounded-2xl bg-gradient-to-br ${selectedDesign.gradient} p-6 overflow-hidden shadow-2xl`}>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-1/2 translate-y-1/2" />
                    
                    {/* Logo */}
                    <div className="relative flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-white font-semibold text-sm">Dermaspace</span>
                    </div>

                    {/* Amount */}
                    <div className="relative">
                      <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Gift Card Value</p>
                      <p className="text-3xl md:text-4xl font-bold text-white">
                        N{finalAmount.toLocaleString()}
                      </p>
                    </div>

                    {/* Recipient & Message */}
                    <div className="absolute bottom-6 left-6 right-6">
                      {recipientName && (
                        <p className="text-white/80 text-sm mb-1">
                          For: <span className="font-medium text-white">{recipientName}</span>
                        </p>
                      )}
                      {selectedOccasion && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: selectedDesign.accent, color: selectedDesign.id === 'golden' ? '#7B2D8E' : 'white' }}>
                          <Heart className="w-3 h-3" />
                          {selectedOccasion}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Preview */}
                  {(personalMessage || senderName) && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                      {personalMessage && (
                        <p className="text-sm text-gray-600 italic mb-2">"{personalMessage}"</p>
                      )}
                      {senderName && (
                        <p className="text-sm text-gray-500">— {senderName}</p>
                      )}
                    </div>
                  )}

                  {/* Purchase Button */}
                  <button className="w-full mt-6 py-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors flex items-center justify-center gap-2">
                    Purchase Gift Card
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <p className="text-center text-xs text-gray-500 mt-3">
                    Gift cards are valid for 12 months from purchase date
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
