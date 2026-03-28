'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Gift, Heart, Send, Download, Check, ChevronRight, Palette, User, Lock, Mail, Phone, Calendar, Type } from 'lucide-react'

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
      const response = await fetch('/api/gift-card-payment', {
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

      const data = await response.json()

      if (data.success && data.authorizationUrl) {
        // Redirect to Paystack payment page
        window.location.href = data.authorizationUrl
      } else {
        alert(data.error || 'Failed to initialize payment. Please try again.')
        setIsSubmitting(false)
      }
    } catch {
      alert('Failed to submit request. Please try again.')
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
        <main className="min-h-screen bg-gradient-to-b from-[#7B2D8E] to-[#5A1D6A] flex items-center justify-center px-4 pt-24">
          <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Submitted!</h2>
            <p className="text-gray-600 mb-8">
              Your gift card request has been sent. You will receive payment details via email within 24 hours.
            </p>
            <div className="bg-[#7B2D8E]/5 rounded-2xl p-6 mb-8 text-left">
              <div className="space-y-2">
                <p className="text-gray-700"><strong>Amount:</strong> N{finalAmount.toLocaleString()}</p>
                <p className="text-gray-700"><strong>For:</strong> {recipientName}</p>
                <p className="text-gray-700"><strong>Occasion:</strong> {selectedOccasion}</p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors"
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
      <main className="min-h-screen bg-gradient-to-b from-[#7B2D8E] to-[#5A1D6A]">
        {/* Hero */}
        <section className="pt-24 sm:pt-28 pb-8 sm:pb-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/10 border border-white/20 mb-4 sm:mb-6">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span className="text-sm sm:text-base font-medium text-white">Custom Gift Cards</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
              Give the Gift of Wellness
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl mx-auto">
              Create a personalized spa gift card for your loved ones. Each card is beautifully designed by our team.
            </p>
          </div>
        </section>

        {/* Login Required */}
        {!isLoggedIn && (
          <section className="pb-8 px-4">
            <div className="max-w-md mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl text-white font-semibold mb-2">Sign in to Continue</h3>
                <p className="text-white/70 mb-6">Create an account to design personalized gift cards</p>
                <div className="flex gap-4 justify-center">
                  <Link href="/signin" className="px-6 py-3 bg-white text-[#7B2D8E] font-semibold rounded-xl hover:bg-white/90 transition-colors">
                    Sign In
                  </Link>
                  <Link href="/signup" className="px-6 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors border border-white/30">
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Content */}
        <section className={`pb-12 sm:pb-16 px-4 ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 xl:gap-12 items-start">
              
{/* Left Side - Gift Card Preview */}
                              <div className="lg:sticky lg:top-24">
                                <div className="flex items-center gap-2 text-white/80 mb-4 md:mb-6">
                                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                  <span className="text-sm md:text-base font-medium">Live Preview</span>
                                </div>
                                
                                {/* Gift Card with Stack Effect - Matching Screenshot */}
                                <div className="relative max-w-md lg:max-w-lg mx-auto lg:mx-0">
                                  {/* Background cards for stack effect */}
                                  <div className={`absolute inset-0 translate-x-4 md:translate-x-6 translate-y-4 md:translate-y-6 rounded-2xl md:rounded-3xl bg-gradient-to-br ${selectedDesign.gradient} opacity-30`} />
                                  <div className={`absolute inset-0 translate-x-2 md:translate-x-3 translate-y-2 md:translate-y-3 rounded-2xl md:rounded-3xl bg-gradient-to-br ${selectedDesign.gradient} opacity-50`} />
                                  
                                  {/* Main Gift Card */}
                                  <div className={`relative rounded-2xl md:rounded-3xl bg-gradient-to-br ${selectedDesign.gradient} p-4 sm:p-6 md:p-8 overflow-hidden shadow-2xl`}>
                                    {/* Decorative lighter area on right */}
                                    <div className="absolute top-0 right-0 bottom-0 w-2/5 bg-white/5 rounded-l-[60px] md:rounded-l-[100px]" />
                                    
                                    {/* Top Row - Logo and Badge */}
                                    <div className="relative flex items-start sm:items-center justify-between gap-2 mb-6 sm:mb-8 md:mb-12 flex-wrap sm:flex-nowrap">
                                      {/* Logo in white pill - matching screenshot */}
                                      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-5 py-2 sm:py-3 bg-white rounded-full shadow-lg">
                                        <div className="text-left">
                                          <span className={`text-[#7B2D8E] font-bold text-sm sm:text-base md:text-lg ${selectedFont.className}`}>Dermaspace</span>
                                          <p className="text-[#7B2D8E]/60 text-[10px] sm:text-xs hidden sm:block">Esthetic And Wellness Centre</p>
                                        </div>
                                        <div className="w-px h-6 sm:h-8 md:h-10 bg-gray-200 hidden sm:block" />
                                        <Image
                                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-512-x-512-px-2-100x100.png-mPW16QvqaZ0oAXaQB94CzwRkWlgrqM.webp"
                                          alt="Dermaspace"
                                          width={32}
                                          height={32}
                                          className="object-contain w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10"
                                        />
                                      </div>
                                      
                                      {/* Gift Card Badge */}
                                      <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                                        <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                                        <span className="text-xs sm:text-sm md:text-base font-bold text-white uppercase tracking-wider">Gift Card</span>
                                      </div>
                                    </div>

                                    {/* Recipient */}
                                    <div className="relative mb-2 sm:mb-4">
                                      <p className={`text-white/70 text-sm sm:text-base md:text-lg ${selectedFont.className}`}>
                                        For: <span className="text-white font-semibold">{recipientName || 'Recipient Name'}</span>
                                      </p>
                                    </div>

                                    {/* Amount */}
                                    <div className="relative mb-6 sm:mb-8 md:mb-10">
                                      <p className="text-white/60 text-xs sm:text-sm md:text-base uppercase tracking-wider mb-1 sm:mb-2">Amount</p>
                                      <p className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white ${selectedFont.className}`}>
                                        N{finalAmount.toLocaleString()}
                                      </p>
                                    </div>

                                    {/* Bottom - From */}
                                    <div className="relative flex items-center justify-between flex-wrap gap-2">
                                      {selectedOccasion && (
                                        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/15 rounded-full backdrop-blur-sm">
                                          <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
                                          <span className="text-xs sm:text-sm md:text-base text-white">{selectedOccasion}</span>
                                        </div>
                                      )}
                                      <p className="text-white/80 text-xs sm:text-sm md:text-lg">
                                        From: <span className="text-white font-medium">{senderName || 'Your Name'}</span>
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Message preview */}
                                {personalMessage && (
                                  <div className="mt-4 sm:mt-6 md:mt-8 bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/20 max-w-md lg:max-w-lg mx-auto lg:mx-0">
                                    <p className={`text-white/90 text-sm sm:text-base md:text-lg italic ${selectedFont.className}`}>"{personalMessage}"</p>
                                    {senderName && <p className="text-white/60 mt-2 md:mt-3 text-sm md:text-base">— {senderName}</p>}
                                  </div>
                                )}
                              </div>

{/* Right Side - Form */}
                              <div className="space-y-4 sm:space-y-6">
                                
                                {/* Amount Selection */}
                                <div className="bg-white rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl">
                                  <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                                      <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                                    </div>
                                    Select Amount
                                  </h3>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                                    {giftCardAmounts.map((item) => (
                                      <button
                                        key={item.amount}
                                        onClick={() => { setSelectedAmount(item.amount); setCustomAmount('') }}
                                        className={`py-3 sm:py-4 md:py-5 px-3 sm:px-4 rounded-xl md:rounded-2xl text-left transition-all ${
                                          selectedAmount === item.amount && !customAmount
                                            ? 'bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/30'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                        }`}
                                      >
                                        <span className="text-base sm:text-lg md:text-xl font-bold block">N{item.amount.toLocaleString()}</span>
                                        <span className={`text-xs sm:text-sm mt-0.5 sm:mt-1 block ${selectedAmount === item.amount && !customAmount ? 'text-white/70' : 'text-gray-500'}`}>
                                          {item.label}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                  <div>
                                    <label className="block text-sm sm:text-base text-gray-600 mb-2">Or enter custom amount</label>
                                    <div className="relative">
                                      <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-base sm:text-lg">N</span>
                                      <input
                                        type="number"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        className="w-full pl-10 sm:pl-12 pr-4 sm:pr-5 py-3 sm:py-4 rounded-xl border border-gray-200 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Design Selection */}
                                <div className="bg-white rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl">
                                  <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                                      <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                                    </div>
                                    Choose Design
                                  </h3>
                                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                                    {cardDesigns.map((design) => (
                                      <button
                                        key={design.id}
                                        onClick={() => setSelectedDesign(design)}
                                        className={`relative p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all ${
                                          selectedDesign.id === design.id
                                            ? 'ring-2 ring-[#7B2D8E] ring-offset-1 sm:ring-offset-2'
                                            : 'hover:scale-105'
                                        }`}
                                      >
                                        <div className={`aspect-[1.6/1] rounded-md sm:rounded-lg bg-gradient-to-br ${design.gradient}`} />
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2 text-center">{design.name}</p>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Occasion & Font */}
                                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                                  <div className="bg-white rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl">
                                    <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                                        <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                                      </div>
                                      Occasion
                                    </h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                      {occasions.map((occasion) => (
                                        <button
                                          key={occasion}
                                          onClick={() => setSelectedOccasion(occasion)}
                                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-medium transition-all ${
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

                                  <div className="bg-white rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl">
                                    <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                                        <Type className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                                      </div>
                                      Font Style
                                    </h3>
                                    <div className="flex gap-2 sm:gap-3">
                                      {fonts.map((font) => (
                                        <button
                                          key={font.id}
                                          onClick={() => setSelectedFont(font)}
                                          className={`flex-1 py-3 sm:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all ${font.className} ${
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
                                <div className="bg-white rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl">
                                  <h3 className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#7B2D8E]" />
                                    </div>
                                    Recipient Details
                                  </h3>
                                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
<div>
                                      <label className="block text-sm sm:text-base text-gray-600 mb-1.5 sm:mb-2">Full Name *</label>
                                      <input
                                        type="text"
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        placeholder="Enter recipient's name"
                                        className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-lg sm:rounded-xl border border-gray-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm sm:text-base text-gray-600 mb-1.5 sm:mb-2">Email Address *</label>
                                      <div className="relative">
                                        <Mail className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        <input
                                          type="email"
                                          value={recipientEmail}
                                          onChange={(e) => setRecipientEmail(e.target.value)}
                                          placeholder="email@example.com"
                                          className="w-full pl-11 sm:pl-14 pr-4 sm:pr-5 py-3 sm:py-4 rounded-lg sm:rounded-xl border border-gray-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-sm sm:text-base text-gray-600 mb-1.5 sm:mb-2">Phone Number</label>
                                      <div className="relative">
                                        <Phone className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        <input
                                          type="tel"
                                          value={recipientPhone}
                                          onChange={(e) => setRecipientPhone(e.target.value)}
                                          placeholder="+234 xxx xxx xxxx"
                                          className="w-full pl-11 sm:pl-14 pr-4 sm:pr-5 py-3 sm:py-4 rounded-lg sm:rounded-xl border border-gray-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-sm sm:text-base text-gray-600 mb-1.5 sm:mb-2">Delivery Date</label>
                                      <div className="relative">
                                        <Calendar className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                                        <input
                                          type="date"
                                          value={deliveryDate}
                                          onChange={(e) => setDeliveryDate(e.target.value)}
                                          className="w-full pl-11 sm:pl-14 pr-4 sm:pr-5 py-3 sm:py-4 rounded-lg sm:rounded-xl border border-gray-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Personal Message */}
                                <div className="bg-white rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl">
                                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Personal Message</h3>
                                  <textarea
                                    value={personalMessage}
                                    onChange={(e) => setPersonalMessage(e.target.value)}
                                    placeholder="Write a heartfelt message for your recipient..."
                                    rows={3}
                                    maxLength={200}
                                    className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-lg sm:rounded-xl border border-gray-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                                  />
                                  <p className="text-sm text-gray-500 mt-2 sm:mt-3 text-right">{personalMessage.length}/200</p>
                                </div>

                                {/* Delivery Method */}
                                <div className="bg-white rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl">
                                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Delivery Method</h3>
                                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                    <button
                                      onClick={() => setDeliveryMethod('email')}
                                      className={`flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all ${
                                        deliveryMethod === 'email'
                                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <Send className={`w-5 h-5 sm:w-7 sm:h-7 ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                                      <div className="text-center sm:text-left">
                                        <p className={`font-semibold text-sm sm:text-base md:text-lg ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                                          Email
                                        </p>
                                        <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Send directly</p>
                                      </div>
                                    </button>
                                    <button
                                      onClick={() => setDeliveryMethod('download')}
                                      className={`flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all ${
                                        deliveryMethod === 'download'
                                          ? 'border-[#7B2D8E] bg-[#7B2D8E]/5'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <Download className={`w-5 h-5 sm:w-7 sm:h-7 ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-400'}`} />
                                      <div className="text-center sm:text-left">
                                        <p className={`font-semibold text-sm sm:text-base md:text-lg ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                                          Download
                                        </p>
                                        <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Print yourself</p>
                                      </div>
                                    </button>
                                  </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                  onClick={handleSubmit}
                                  disabled={!recipientName || !recipientEmail || isSubmitting || !isLoggedIn}
                                  className="w-full py-4 sm:py-5 bg-white text-[#7B2D8E] text-base sm:text-lg md:text-xl font-bold rounded-xl sm:rounded-2xl hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 shadow-xl"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 sm:border-3 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
                                      Request Gift Card
                                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </>
                                  )}
                                </button>

                                <p className="text-center text-white/70 text-sm sm:text-base md:text-lg">
                                  Custom designed by our team within 24 hours
                                </p>
                              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
