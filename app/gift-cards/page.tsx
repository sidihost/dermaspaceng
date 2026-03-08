'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Gift, Heart, Send, Download, Check, ChevronRight, Palette, User, Lock, Mail, Phone, Calendar, Type, Eye } from 'lucide-react'

// Service-based amounts
const giftCardAmounts = [
  { amount: 5000, label: 'Basic Facial' },
  { amount: 8000, label: 'Manicure' },
  { amount: 12000, label: 'Pedicure' },
  { amount: 15000, label: 'Body Massage' },
  { amount: 25000, label: 'Full Spa Day' },
  { amount: 50000, label: 'Premium Package' },
]

const cardDesigns = [
  { id: 'royal', name: 'Royal Purple', gradient: 'from-[#7B2D8E] to-[#9B4DB0]' },
  { id: 'violet', name: 'Deep Violet', gradient: 'from-[#5A1D6A] to-[#7B2D8E]' },
  { id: 'lavender', name: 'Lavender', gradient: 'from-[#9B4DB0] to-[#B76CC8]' },
  { id: 'plum', name: 'Plum', gradient: 'from-[#6B2D7B] to-[#8B4DA0]' },
  { id: 'mauve', name: 'Mauve', gradient: 'from-[#8B5A96] to-[#A87BB0]' },
  { id: 'orchid', name: 'Orchid', gradient: 'from-[#9932CC] to-[#BA55D3]' },
]

const occasions = ['Birthday', 'Anniversary', 'Thank You', 'Self-Care', 'Wedding', "Mother's Day", "Valentine's", 'Just Because']

const fonts = [
  { id: 'elegant', name: 'Elegant', className: 'font-serif' },
  { id: 'modern', name: 'Modern', className: 'font-sans' },
  { id: 'playful', name: 'Playful', className: 'font-mono' },
]

export default function GiftCardsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAmount, setSelectedAmount] = useState<number>(25000)
  const [customAmount, setCustomAmount] = useState('')
  const [selectedDesign, setSelectedDesign] = useState(cardDesigns[0])
  const [selectedOccasion, setSelectedOccasion] = useState('Birthday')
  const [selectedFont, setSelectedFont] = useState(fonts[0])
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [senderName, setSenderName] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'download'>('email')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setIsLoggedIn(true)
          setSenderName(`${data.user.firstName || data.user.first_name || ''} ${data.user.lastName || data.user.last_name || ''}`.trim())
        }
      }
    } catch {
      setIsLoggedIn(false)
    } finally {
      setIsLoading(false)
    }
  }

  const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount

  const handleSubmit = async () => {
    if (!isLoggedIn) return
    setIsSubmitting(true)

    try {
      await fetch('/api/gift-card-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          design: selectedDesign.id,
          occasion: selectedOccasion,
          font: selectedFont.id,
          recipientName,
          recipientEmail,
          recipientPhone,
          senderName,
          personalMessage,
          deliveryMethod,
          deliveryDate
        })
      })
      setIsSubmitted(true)
    } catch {
      alert('Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#7B2D8E] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </main>
    )
  }

  if (isSubmitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#7B2D8E] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your gift card request has been sent. You will receive payment details via email within 24 hours.
            </p>
            <div className="bg-[#7B2D8E]/5 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-gray-700">
                <strong>Amount:</strong> N{finalAmount.toLocaleString()}<br />
                <strong>For:</strong> {recipientName}<br />
                <strong>Occasion:</strong> {selectedOccasion}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#7B2D8E]">
        {/* Hero */}
        <section className="pt-28 pb-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4">
              <Gift className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">Custom Gift Cards</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Give the Gift of Wellness
            </h1>
            <p className="text-white/70 max-w-lg mx-auto">
              Create a personalized spa gift card for your loved ones. Each card is beautifully designed by our team.
            </p>
          </div>
        </section>

        {/* Login Required */}
        {!isLoggedIn && (
          <section className="pb-6 px-4">
            <div className="max-w-sm mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center">
                <Lock className="w-6 h-6 text-white mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-1">Sign in to Continue</h3>
                <p className="text-white/60 text-sm mb-4">Create an account to design gift cards</p>
                <div className="flex gap-3 justify-center">
                  <Link href="/signin" className="px-5 py-2.5 bg-white text-[#7B2D8E] font-medium rounded-xl hover:bg-white/90 transition-colors">
                    Sign In
                  </Link>
                  <Link href="/signup" className="px-5 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors">
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Content */}
        <section className={`pb-16 px-4 ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-8">
              
              {/* Form - 3 columns */}
              <div className="lg:col-span-3 space-y-5">
                
                {/* Amount Selection */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Gift className="w-5 h-5 text-[#7B2D8E]" />
                    Select Amount
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {giftCardAmounts.map((item) => (
                      <button
                        key={item.amount}
                        onClick={() => { setSelectedAmount(item.amount); setCustomAmount('') }}
                        className={`py-4 px-4 rounded-xl text-left transition-all ${
                          selectedAmount === item.amount && !customAmount
                            ? 'bg-[#7B2D8E] text-white shadow-md'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-lg font-bold">N{item.amount.toLocaleString()}</span>
                        <span className={`block text-sm mt-1 ${selectedAmount === item.amount && !customAmount ? 'text-white/70' : 'text-gray-500'}`}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-2">Or enter custom amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">N</span>
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Design Selection */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <Palette className="w-5 h-5 text-[#7B2D8E]" />
                    Choose Design
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {cardDesigns.map((design) => (
                      <button
                        key={design.id}
                        onClick={() => setSelectedDesign(design)}
                        className={`relative p-1 rounded-xl transition-all ${
                          selectedDesign.id === design.id
                            ? 'ring-2 ring-[#7B2D8E] ring-offset-2'
                            : 'hover:scale-105'
                        }`}
                      >
                        <div className={`aspect-[1.6/1] rounded-lg bg-gradient-to-br ${design.gradient}`} />
                        <p className="text-xs text-gray-600 mt-1.5 text-center">{design.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion & Font */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                      <Heart className="w-5 h-5 text-[#7B2D8E]" />
                      Occasion
                    </h3>
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

                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                      <Type className="w-5 h-5 text-[#7B2D8E]" />
                      Font Style
                    </h3>
                    <div className="flex gap-2">
                      {fonts.map((font) => (
                        <button
                          key={font.id}
                          onClick={() => setSelectedFont(font)}
                          className={`flex-1 py-3 rounded-xl font-medium transition-all ${font.className} ${
                            selectedFont.id === font.id
                              ? 'bg-[#7B2D8E] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                    <User className="w-5 h-5 text-[#7B2D8E]" />
                    Recipient Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Enter recipient's name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="+234 xxx xxx xxxx"
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">Delivery Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Message */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Personal Message</h3>
                  <textarea
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Write a heartfelt message for your recipient..."
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                  />
                  <p className="text-sm text-gray-400 mt-2 text-right">{personalMessage.length}/200</p>
                </div>

                {/* Delivery Method */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Delivery Method</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setDeliveryMethod('email')}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        deliveryMethod === 'email'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Send className={`w-6 h-6 ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`font-semibold ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Email Delivery
                        </p>
                        <p className="text-sm text-gray-500">Send directly to recipient</p>
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
                      <Download className={`w-6 h-6 ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`font-semibold ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Download PDF
                        </p>
                        <p className="text-sm text-gray-500">Print or share yourself</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview - 2 columns */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-28">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Live Preview
                    </h3>
                    
                    {/* Gift Card with Stack Effect */}
                    <div className="relative mb-6">
                      {/* Background cards for stack effect */}
                      <div className={`absolute inset-0 translate-x-4 translate-y-4 rounded-2xl bg-gradient-to-br ${selectedDesign.gradient} opacity-30`} />
                      <div className={`absolute inset-0 translate-x-2 translate-y-2 rounded-2xl bg-gradient-to-br ${selectedDesign.gradient} opacity-50`} />
                      
                      {/* Main Gift Card */}
                      <div className={`relative rounded-2xl bg-gradient-to-br ${selectedDesign.gradient} p-6 overflow-hidden shadow-2xl`}>
                        {/* Decorative lighter area on right */}
                        <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-white/5 rounded-l-[100px]" />
                        
                        {/* Top Row - Logo and Badge */}
                        <div className="relative flex items-start justify-between mb-10">
                          {/* Logo in white pill */}
                          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                            <span className={`text-[#7B2D8E] font-semibold ${selectedFont.className}`}>Dermaspace</span>
                            <div className="w-px h-5 bg-gray-200" />
                            <Image
                              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-512-x-512-px-2-100x100.png-mPW16QvqaZ0oAXaQB94CzwRkWlgrqM.webp"
                              alt="Dermaspace"
                              width={28}
                              height={28}
                              className="object-contain"
                            />
                          </div>
                          
                          {/* Gift Card Badge */}
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                            <Gift className="w-4 h-4 text-white" />
                            <span className="text-sm font-bold text-white uppercase tracking-wider">Gift Card</span>
                          </div>
                        </div>

                        {/* Recipient */}
                        <div className="relative mb-3">
                          <p className={`text-white/80 ${selectedFont.className}`}>
                            For: <span className="text-white font-semibold">{recipientName || 'Recipient Name'}</span>
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="relative mb-8">
                          <p className="text-white/60 text-sm uppercase tracking-wider mb-1">Amount</p>
                          <p className={`text-4xl font-bold text-white ${selectedFont.className}`}>
                            N{finalAmount.toLocaleString()}
                          </p>
                        </div>

                        {/* Bottom - From */}
                        <div className="relative flex items-center justify-between">
                          {selectedOccasion && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 rounded-full backdrop-blur-sm">
                              <Heart className="w-3.5 h-3.5 text-white" />
                              <span className="text-sm text-white">{selectedOccasion}</span>
                            </div>
                          )}
                          <p className="text-white/70">
                            From: <span className="text-white">{senderName || 'Your Name'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Message preview */}
                    {personalMessage && (
                      <div className="bg-white/10 rounded-xl p-4 mb-5 border border-white/20">
                        <p className={`text-white/80 italic ${selectedFont.className}`}>"{personalMessage}"</p>
                        {senderName && <p className="text-white/50 text-sm mt-2">— {senderName}</p>}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmit}
                      disabled={!recipientName || !recipientEmail || isSubmitting || !isLoggedIn}
                      className="w-full py-4 bg-white text-[#7B2D8E] font-bold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-5 h-5 border-2 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
                          Request Gift Card
                        </>
                      )}
                    </button>

                    <p className="text-center text-white/50 text-sm mt-4">
                      Custom designed by our team within 24 hours
                    </p>
                  </div>
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
