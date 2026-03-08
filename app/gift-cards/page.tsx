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
  { id: 'royal', name: 'Royal Purple', gradient: 'from-[#7B2D8E] to-[#5A1D6A]', pattern: 'diamonds' },
  { id: 'lavender', name: 'Soft Lavender', gradient: 'from-[#9B4DB0] to-[#7B2D8E]', pattern: 'circles' },
  { id: 'rose', name: 'Blush Rose', gradient: 'from-[#E8A4B4] to-[#C97B8E]', pattern: 'hearts' },
  { id: 'midnight', name: 'Midnight Luxe', gradient: 'from-[#2D2D4E] to-[#1A1A2E]', pattern: 'stars' },
  { id: 'golden', name: 'Golden Hour', gradient: 'from-[#B8860B] to-[#8B6508]', pattern: 'rays' },
  { id: 'ocean', name: 'Ocean Breeze', gradient: 'from-[#4A90A4] to-[#2D6A7E]', pattern: 'waves' },
]

const occasions = ['Birthday', 'Anniversary', 'Thank You', 'Self-Care', 'Wedding', 'Mother\'s Day', 'Valentine\'s', 'Just Because']

const fonts = [
  { id: 'elegant', name: 'Elegant', className: 'font-serif' },
  { id: 'modern', name: 'Modern', className: 'font-sans' },
  { id: 'playful', name: 'Playful', className: 'font-mono' },
]

export default function GiftCardsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAmount, setSelectedAmount] = useState<number>(15000)
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
  const [showGlow, setShowGlow] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setShowGlow(prev => !prev), 2000)
    return () => clearInterval(interval)
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setIsLoggedIn(true)
        setSenderName(`${data.user.first_name} ${data.user.last_name}`)
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
      <>
        <Header />
        <main className="min-h-screen bg-[#FDFBF9] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7B2D8E] border-t-transparent rounded-full" />
        </main>
        <Footer />
      </>
    )
  }

  if (isSubmitted) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#FDFBF9] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg border border-gray-100">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 text-sm mb-6">
              Your gift card request has been sent to our team. You will receive a confirmation email shortly with payment details and next steps.
            </p>
            <div className="bg-[#7B2D8E]/5 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Gift Card Value:</strong> N{finalAmount.toLocaleString()}<br />
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
      <main className="min-h-screen bg-[#FDFBF9]">
        {/* Hero */}
        <section className="relative py-12 md:py-16 bg-[#7B2D8E] overflow-hidden">
          <div className="absolute inset-0 bg-[url('/patterns/gift-pattern.svg')] opacity-5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
              <Gift className="w-3 h-3 text-white" />
              <span className="text-[10px] font-medium text-white uppercase tracking-widest">Made On Request</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Custom <span className="text-white/90">Gift Cards</span>
            </h1>
            <p className="text-sm md:text-base text-white/70 max-w-md mx-auto">
              Request a beautifully designed, personalized spa gift card for your loved ones. Each card is custom-made by our team.
            </p>
          </div>
        </section>

        {/* Login Required Banner */}
        {!isLoggedIn && (
          <section className="py-6">
            <div className="max-w-md mx-auto px-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
                <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-4 h-4 text-[#7B2D8E]" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Sign in to Continue</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Create an account to design personalized gift cards
                </p>
                <div className="flex gap-2 justify-center">
                  <Link
                    href="/signin"
                    className="px-4 py-2 bg-[#7B2D8E] text-white text-xs font-medium rounded-lg hover:bg-[#5A1D6A] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Gift Card Builder */}
        <section className={`py-8 md:py-12 ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Customizer Form - 3 columns */}
              <div className="lg:col-span-3 space-y-4">
                {/* Amount */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-3">
                    <Gift className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    Select Amount
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    {giftCardAmounts.map((item) => (
                      <button
                        key={item.amount}
                        onClick={() => { setSelectedAmount(item.amount); setCustomAmount('') }}
                        className={`py-2.5 px-2 rounded-lg text-xs transition-all text-left ${
                          selectedAmount === item.amount && !customAmount
                            ? 'bg-[#7B2D8E] text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-semibold">N{(item.amount/1000).toFixed(0)}K</span>
                        <span className={`block text-[9px] mt-0.5 ${selectedAmount === item.amount && !customAmount ? 'text-white/70' : 'text-gray-500'}`}>
                          {item.label}
                        </span>
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
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                    />
                  </div>
                </div>

                {/* Design */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-3">
                    <Palette className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    Choose Design
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {cardDesigns.map((design) => (
                      <button
                        key={design.id}
                        onClick={() => setSelectedDesign(design)}
                        className={`relative p-0.5 rounded-lg transition-all ${
                          selectedDesign.id === design.id
                            ? 'ring-2 ring-[#7B2D8E] ring-offset-1'
                            : 'hover:scale-105'
                        }`}
                      >
                        <div className={`aspect-[1.6/1] rounded-md bg-gradient-to-br ${design.gradient}`} />
                        <p className="text-[9px] font-medium text-gray-600 mt-1 text-center truncate">{design.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion & Font */}
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-3">
                      <Heart className="w-3.5 h-3.5 text-[#7B2D8E]" />
                      Occasion
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {occasions.map((occasion) => (
                        <button
                          key={occasion}
                          onClick={() => setSelectedOccasion(occasion)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
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

                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-3">
                      <Type className="w-3.5 h-3.5 text-[#7B2D8E]" />
                      Font Style
                    </h3>
                    <div className="flex gap-1.5">
                      {fonts.map((font) => (
                        <button
                          key={font.id}
                          onClick={() => setSelectedFont(font)}
                          className={`flex-1 py-2 rounded-lg text-xs transition-all ${font.className} ${
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
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-3">
                    <User className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    Recipient Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Enter recipient's name"
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-1">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="+234 xxx xxx xxxx"
                          className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-1">Delivery Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Message */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-900 mb-3">Personal Message</h3>
                  <textarea
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Write a heartfelt message..."
                    rows={2}
                    maxLength={200}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/30 focus:border-[#7B2D8E] resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{personalMessage.length}/200</p>
                </div>

                {/* Delivery Method */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-900 mb-3">Delivery Method</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDeliveryMethod('email')}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        deliveryMethod === 'email'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Send className={`w-4 h-4 ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`text-xs font-semibold ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Email
                        </p>
                        <p className="text-[10px] text-gray-500">Send directly</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setDeliveryMethod('download')}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        deliveryMethod === 'download'
                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Download className={`w-4 h-4 ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`text-xs font-semibold ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Download
                        </p>
                        <p className="text-[10px] text-gray-500">Print yourself</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview - 2 columns */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-24">
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#7B2D8E]" />
                      Live Preview
                    </h3>
                    
                    {/* Gift Card - beautiful design */}
                    <div className={`relative aspect-[1.7/1] rounded-2xl bg-gradient-to-br ${selectedDesign.gradient} p-5 overflow-hidden transition-all duration-500 shadow-lg ${showGlow ? 'shadow-[#7B2D8E]/20' : ''}`}>
                      {/* Elegant pattern overlay */}
                      <div className="absolute inset-0 opacity-[0.07]">
                        {selectedDesign.pattern === 'diamonds' && (
                          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
                        )}
                        {selectedDesign.pattern === 'circles' && (
                          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '24px 24px' }} />
                        )}
                        {selectedDesign.pattern === 'hearts' && (
                          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M10 18l-1.45-1.32C3.4 12.36 0 9.28 0 5.5 0 2.42 2.42 0 5.5 0c1.74 0 3.41.81 4.5 2.09C11.09.81 12.76 0 14.5 0 17.58 0 20 2.42 20 5.5c0 3.78-3.4 6.86-8.55 11.18L10 18z\' fill=\'white\' fill-opacity=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '30px 30px' }} />
                        )}
                        {selectedDesign.pattern === 'stars' && (
                          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
                        )}
                        {selectedDesign.pattern === 'rays' && (
                          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(90deg, white 0, white 1px, transparent 0, transparent 20px)', backgroundSize: '20px 20px' }} />
                        )}
                        {selectedDesign.pattern === 'waves' && (
                          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'12\' viewBox=\'0 0 40 12\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 6c5 0 5 6 10 6s5-6 10-6 5 6 10 6 5-6 10-6\' fill=\'none\' stroke=\'white\' stroke-width=\'1\' stroke-opacity=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '40px 12px' }} />
                        )}
                      </div>
                      
                      {/* Decorative glowing orbs */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-sm" />
                      <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-sm" />
                      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full blur-md" />
                      
                      {/* Gold/silver trim line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      
                      {/* Logo */}
                      <div className="relative flex items-center gap-2 mb-4">
                        <Image
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-512-x-512-px-2-100x100.png-mPW16QvqaZ0oAXaQB94CzwRkWlgrqM.webp"
                          alt="Dermaspace"
                          width={26}
                          height={26}
                          className="object-contain drop-shadow-md"
                        />
                        <span className={`text-white font-semibold text-sm drop-shadow-sm ${selectedFont.className}`}>Dermaspace</span>
                      </div>

                      {/* Value with elegant styling */}
                      <div className="relative">
                        <p className="text-white/50 text-[9px] uppercase tracking-[0.2em] mb-1">Gift Card</p>
                        <p className={`text-2xl font-bold text-white drop-shadow-sm ${selectedFont.className}`}>
                          N{finalAmount.toLocaleString()}
                        </p>
                      </div>

                      {/* Bottom info with refined styling */}
                      <div className="absolute bottom-5 left-5 right-5">
                        {recipientName && (
                          <p className={`text-white/90 text-[11px] mb-1.5 ${selectedFont.className}`}>
                            For: <span className="font-semibold">{recipientName}</span>
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          {selectedOccasion && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-[9px] font-medium text-white border border-white/10">
                              <Heart className="w-2.5 h-2.5" />
                              {selectedOccasion}
                            </div>
                          )}
                          {senderName && (
                            <p className="text-white/50 text-[9px] italic">With love, {senderName}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Message preview */}
                    {personalMessage && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className={`text-xs text-gray-600 italic ${selectedFont.className}`}>"{personalMessage}"</p>
                        {senderName && <p className="text-[10px] text-gray-500 mt-1">— {senderName}</p>}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmit}
                      disabled={!recipientName || !recipientEmail || isSubmitting || !isLoggedIn}
                      className="w-full mt-4 py-3 bg-[#7B2D8E] text-white text-sm font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Gift className="w-3.5 h-3.5" />
                          Request Gift Card
                        </>
                      )}
                    </button>

                    <p className="text-center text-[9px] text-gray-500 mt-2">
                      Custom designed by our team
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
