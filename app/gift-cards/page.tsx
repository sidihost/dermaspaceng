'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Gift, Heart, Send, Download, Check, ChevronRight, Palette, User, Lock, Mail, Phone, Calendar, Type, CreditCard } from 'lucide-react'
import { useGeo } from '@/lib/geo-context'
import { PaymentMethodModal } from '@/components/wallet/payment-method-modal'

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
  const { formatPrice } = useGeo()
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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentError, setPaymentError] = useState('')

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

  const handleProceedToPayment = () => {
    if (!isLoggedIn) return
    if (!recipientName || !recipientEmail) {
      setPaymentError('Please fill in recipient name and email')
      return
    }
    setPaymentError('')
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false)
    setIsSubmitting(true)

    try {
      // Create the gift card after successful payment
      await fetch('/api/gift-card-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          design: selectedDesign.id,
          designName: selectedDesign.name,
          designGradient: selectedDesign.gradient,
          occasion: selectedOccasion,
          font: selectedFont.id,
          fontName: selectedFont.name,
          recipientName,
          recipientEmail,
          recipientPhone,
          senderName,
          personalMessage,
          deliveryMethod,
          deliveryDate,
          isPaid: true
        })
      })
      setIsSubmitted(true)
    } catch {
      setPaymentError('Failed to create gift card. Please contact support.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentCancel = () => {
    setShowPaymentModal(false)
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
          <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-[#7B2D8E]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-sm text-gray-600 mb-6">
              Your gift card request has been sent. You will receive payment details via email within 24 hours.
            </p>
            <div className="bg-[#7B2D8E]/5 rounded-xl p-4 mb-6 text-left text-sm">
              <div className="space-y-1.5">
                <p className="text-gray-700"><strong>Amount:</strong> {formatPrice(finalAmount)}</p>
                <p className="text-gray-700"><strong>For:</strong> {recipientName}</p>
                <p className="text-gray-700"><strong>Occasion:</strong> {selectedOccasion}</p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white font-semibold rounded-xl hover:bg-[#5A1D6A] transition-colors text-sm"
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
        {/* Hero - Compact */}
        <section className="pt-24 pb-6 md:pt-28 md:pb-8 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-3">
              <Gift className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white">Custom Gift Cards</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Give the Gift of Wellness
            </h1>
            {/* Decorative underline */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-0.5 bg-white/30 rounded-full" />
              <div className="w-2 h-2 bg-white/50 rounded-full" />
              <div className="w-16 h-0.5 bg-white/50 rounded-full" />
              <div className="w-2 h-2 bg-white/50 rounded-full" />
              <div className="w-8 h-0.5 bg-white/30 rounded-full" />
            </div>
            <p className="text-sm text-white/80 max-w-lg mx-auto">
              Create a personalized spa gift card for your loved ones
            </p>
          </div>
        </section>

        {/* Login Required */}
        {!isLoggedIn && (
          <section className="pb-6 px-4">
            <div className="max-w-sm mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/20 text-center">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base text-white font-semibold mb-1">Sign in to Continue</h3>
                <p className="text-white/70 text-sm mb-4">Create an account to design personalized gift cards</p>
                <div className="flex gap-3 justify-center">
                  <Link href="/signin" className="px-5 py-2.5 bg-white text-[#7B2D8E] font-semibold rounded-lg hover:bg-white/90 transition-colors text-sm">
                    Sign In
                  </Link>
                  <Link href="/signup" className="px-5 py-2.5 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30 text-sm">
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

                {/* Main Content */}
        <section className={`pb-12 px-4 ${!isLoggedIn ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-6 items-start">
              
              {/* Left Side - Gift Card Preview (2 cols) */}
              <div className="lg:col-span-2 lg:sticky lg:top-24">
                {/* Personalized greeting when logged in */}
                {isLoggedIn && senderName && (
                  <div className="flex items-center gap-2 mb-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit border border-white/20">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#7B2D8E]">
                        {senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <span className="text-xs text-white">Creating as <span className="font-semibold">{senderName.split(' ')[0]}</span></span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-white/80 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  <span className="text-xs font-medium">Live Preview</span>
                </div>
                
                {/* Gift Card with Stack Effect */}
                <div className="relative max-w-xs mx-auto lg:mx-0">
                  {/* Background cards for stack effect */}
                  <div className={`absolute inset-0 translate-x-3 translate-y-3 rounded-xl bg-gradient-to-br ${selectedDesign.gradient} opacity-30`} />
                  <div className={`absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-gradient-to-br ${selectedDesign.gradient} opacity-50`} />
                  
                  {/* Main Gift Card */}
                  <div className={`relative rounded-xl bg-gradient-to-br ${selectedDesign.gradient} p-4 overflow-hidden shadow-xl`}>
                    {/* Decorative lighter area */}
                    <div className="absolute top-0 right-0 bottom-0 w-2/5 bg-white/5 rounded-l-[50px]" />
                    
                    {/* Top Row */}
                    <div className="relative flex items-center justify-between gap-2 mb-6">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
                        alt="Dermaspace"
                        width={100}
                        height={30}
                        className="h-6 w-auto object-contain brightness-0 invert"
                      />
                      
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                        <Gift className="w-3 h-3 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Gift Card</span>
                      </div>
                    </div>

                    {/* Recipient */}
                    <div className="relative mb-1">
                      <p className={`text-white/70 text-xs ${selectedFont.className}`}>
                        For: <span className="text-white font-semibold">{recipientName || 'Recipient Name'}</span>
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="relative mb-4">
                      <p className="text-white/60 text-[10px] uppercase tracking-wider mb-0.5">Amount</p>
                      <p className={`text-2xl font-bold text-white ${selectedFont.className}`}>
                        {formatPrice(finalAmount)}
                      </p>
                    </div>

                    {/* Bottom */}
                    <div className="relative flex items-center justify-between">
                      {selectedOccasion && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/15 rounded-full backdrop-blur-sm">
                          <Heart className="w-2.5 h-2.5 text-white" />
                          <span className="text-[10px] text-white">{selectedOccasion}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        {senderName && (
                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                            <span className="text-[8px] font-bold text-white">
                              {senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <p className="text-white/80 text-xs">
                          From: <span className="text-white font-medium">{senderName || 'Your Name'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message preview */}
                {personalMessage && (
                  <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20 max-w-xs mx-auto lg:mx-0">
                    <p className={`text-white/90 text-xs italic ${selectedFont.className}`}>"{personalMessage}"</p>
                    {senderName && <p className="text-white/60 mt-1.5 text-xs">— {senderName}</p>}
                  </div>
                )}
              </div>

              {/* Right Side - Form (3 cols) */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* Amount Selection */}
                <div className="bg-white rounded-xl p-4 shadow-lg relative overflow-hidden">
                  {/* Decorative accent */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E]" />
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Gift className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    </div>
                    Select Amount
                    <div className="flex-1 h-px bg-gradient-to-r from-[#7B2D8E]/20 to-transparent ml-2" />
                  </h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {giftCardAmounts.map((item) => (
                      <button
                        key={item.amount}
                        onClick={() => { setSelectedAmount(item.amount); setCustomAmount('') }}
                        className={`py-2.5 px-2 rounded-lg text-left transition-all ${
                          selectedAmount === item.amount && !customAmount
                            ? 'bg-[#7B2D8E] text-white shadow-md'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-sm font-bold block">{formatPrice(item.amount)}</span>
                        <span className={`text-[10px] block ${selectedAmount === item.amount && !customAmount ? 'text-white/70' : 'text-gray-500'}`}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Or enter custom amount (in NGN)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">₦</span>
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                  </div>
                </div>

                {/* Design Selection */}
                <div className="bg-white rounded-xl p-4 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9B4DB0] via-[#7B2D8E] to-[#9B4DB0]" />
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Palette className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    </div>
                    Choose Design
                    <div className="flex-1 h-px bg-gradient-to-r from-[#7B2D8E]/20 to-transparent ml-2" />
                  </h3>
                  <div className="grid grid-cols-6 gap-2">
                    {cardDesigns.map((design) => (
                      <button
                        key={design.id}
                        onClick={() => setSelectedDesign(design)}
                        className={`relative p-1 rounded-lg transition-all ${
                          selectedDesign.id === design.id
                            ? 'ring-2 ring-[#7B2D8E] ring-offset-1'
                            : 'hover:scale-105'
                        }`}
                      >
                        <div className={`aspect-[1.6/1] rounded bg-gradient-to-br ${design.gradient}`} />
                        <p className="text-[10px] text-gray-600 mt-1 text-center truncate">{design.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasion */}
                <div className="bg-white rounded-xl p-4 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E]" />
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Heart className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    </div>
                    Occasion
                    <div className="flex-1 h-px bg-gradient-to-r from-[#7B2D8E]/20 to-transparent ml-2" />
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {occasions.map((occasion) => (
                      <button
                        key={occasion}
                        onClick={() => setSelectedOccasion(occasion)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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

                {/* Font Style */}
                <div className="bg-white rounded-xl p-4 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9B4DB0] via-[#7B2D8E] to-[#9B4DB0]" />
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                      <Type className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    </div>
                    Font Style
                    <div className="flex-1 h-px bg-gradient-to-r from-[#7B2D8E]/20 to-transparent ml-2" />
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {fonts.map((font) => (
                      <button
                        key={font.id}
                        onClick={() => setSelectedFont(font)}
                        className={`py-2.5 rounded-lg text-xs font-medium transition-all ${font.className} ${
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

                {/* Recipient Details */}
                <div className="bg-white rounded-xl p-4 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#7B2D8E]" />
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-[#7B2D8E]" />
                    </div>
                    Recipient Details
                    <div className="flex-1 h-px bg-gradient-to-r from-[#7B2D8E]/20 to-transparent ml-2" />
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Recipient's name"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="+234 xxx xxx xxxx"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Delivery Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Message */}
                <div className="bg-white rounded-xl p-4 shadow-lg">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Personal Message</h3>
                  <textarea
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Write a heartfelt message..."
                    rows={2}
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/20 focus:border-[#7B2D8E] resize-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 text-right">{personalMessage.length}/200</p>
                </div>

                {/* Delivery Method */}
                <div className="bg-white rounded-xl p-4 shadow-lg">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Delivery Method</h3>
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
                        <p className={`font-semibold text-xs ${deliveryMethod === 'email' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
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
                        <p className={`font-semibold text-xs ${deliveryMethod === 'download' ? 'text-[#7B2D8E]' : 'text-gray-700'}`}>
                          Download
                        </p>
                        <p className="text-[10px] text-gray-500">Print yourself</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {paymentError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {paymentError}
                  </div>
                )}

                {/* Pay Now Button */}
                <button
                  onClick={handleProceedToPayment}
                  disabled={!recipientName || !recipientEmail || isSubmitting || !isLoggedIn}
                  className="w-full py-3 bg-white text-[#7B2D8E] text-sm font-bold rounded-xl hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#7B2D8E]/30 border-t-[#7B2D8E] rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay {formatPrice(finalAmount)} Now
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-white/70 text-xs">
                  Pay with wallet balance or card via Paystack
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Method Modal */}
        <PaymentMethodModal
          isOpen={showPaymentModal}
          onClose={handlePaymentCancel}
          amount={finalAmount}
          description={`Gift Card for ${recipientName} - ${selectedOccasion}`}
          paymentType="gift_card"
          itemDetails={{
            recipientName,
            recipientEmail,
            recipientPhone,
            senderName,
            personalMessage,
            design: selectedDesign.id,
            designName: selectedDesign.name,
            occasion: selectedOccasion,
            font: selectedFont.id,
            deliveryMethod,
            deliveryDate
          }}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      </main>
      <Footer />
    </>
  )
}
