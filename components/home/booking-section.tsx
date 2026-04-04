'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, ChevronLeft, ChevronRight, User, Home, History, Bell, Gift, Heart, CreditCard, Sparkles } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import Image from 'next/image'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)
  const [selectedDate, setSelectedDate] = useState(14)
  const [selectedTime, setSelectedTime] = useState(2)
  const [activeTab, setActiveTab] = useState<'book' | 'voucher'>('book')

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const times = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00']
  const services = [
    { name: 'Signature Facial', duration: '60 min', price: '₦25,000' },
    { name: 'Carbon Laser Peel', duration: '45 min', price: '₦35,000' },
    { name: 'Hydrafacial', duration: '75 min', price: '₦45,000' },
  ]

  const voucherAmounts = [
    { amount: '₦15,000', label: 'Body Massage' },
    { amount: '₦25,000', label: 'Full Spa Day' },
    { amount: '₦50,000', label: 'Premium Package' },
  ]

  return (
    <section className="py-16 md:py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments and purchase gift vouchers."
        />

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left - Device Mockups */}
          <div className={`relative transition-all duration-700 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            {/* Subtle background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-[#7B2D8E]/[0.03] rounded-full blur-3xl pointer-events-none" />
            
            {/* Devices Container */}
            <div className="relative flex flex-col md:flex-row items-center md:items-end justify-center gap-6 md:gap-8">
              
              {/* Desktop Browser Mockup */}
              <div className="w-full max-w-[340px] md:max-w-[380px] order-2 md:order-1">
                <div className="bg-white rounded-2xl border-2 border-[#7B2D8E]/15 overflow-hidden">
                  {/* Browser Chrome */}
                  <div className="bg-[#7B2D8E]/[0.06] px-4 py-2.5 flex items-center gap-3 border-b border-[#7B2D8E]/10">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#7B2D8E]/25" />
                      <div className="w-3 h-3 rounded-full bg-[#7B2D8E]/20" />
                      <div className="w-3 h-3 rounded-full bg-[#7B2D8E]/15" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-lg px-4 py-1.5 text-[11px] text-[#7B2D8E]/60 flex items-center gap-2 border border-[#7B2D8E]/10">
                        <svg className="w-3 h-3 text-[#7B2D8E]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        dermaspaceng.com/booking
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard Content */}
                  <div className="bg-white">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Image 
                            src="/images/dermaspace-logo.png" 
                            alt="Dermaspace" 
                            width={24} 
                            height={24}
                            className="object-contain"
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">Dermaspace</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Bell className="w-3.5 h-3.5 text-[#7B2D8E]" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                          <span className="text-[10px] text-white font-semibold">A</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-4 pt-3">
                      <div className="flex gap-1 p-1 bg-[#7B2D8E]/[0.06] rounded-xl">
                        <button 
                          onClick={() => setActiveTab('book')}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                            activeTab === 'book' 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'text-gray-600 hover:text-[#7B2D8E]'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Book Appointment
                        </button>
                        <button 
                          onClick={() => setActiveTab('voucher')}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                            activeTab === 'voucher' 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'text-gray-600 hover:text-[#7B2D8E]'
                          }`}
                        >
                          <Gift className="w-3.5 h-3.5" />
                          Buy Voucher
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      {activeTab === 'book' ? (
                        <div className="space-y-3">
                          {/* Service Selection */}
                          <div>
                            <p className="text-[10px] font-semibold text-gray-700 mb-2">Select Service</p>
                            <div className="space-y-1.5">
                              {services.map((service, idx) => (
                                <div 
                                  key={service.name}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                                    idx === 0 
                                      ? 'border-[#7B2D8E] bg-[#7B2D8E]/[0.04]' 
                                      : 'border-gray-100 hover:border-[#7B2D8E]/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${idx === 0 ? 'bg-[#7B2D8E]' : 'bg-[#7B2D8E]/10'}`}>
                                      <Sparkles className={`w-4 h-4 ${idx === 0 ? 'text-white' : 'text-[#7B2D8E]'}`} />
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold text-gray-900">{service.name}</p>
                                      <p className="text-[9px] text-gray-500">{service.duration}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[12px] font-bold text-[#7B2D8E]">{service.price}</p>
                                    {idx === 0 && <Check className="w-3.5 h-3.5 text-[#7B2D8E] ml-auto" />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Calendar */}
                          <div className="bg-[#7B2D8E]/[0.03] rounded-xl p-3 border border-[#7B2D8E]/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-gray-900">April 2026</span>
                              <div className="flex gap-1">
                                <button className="w-6 h-6 rounded-lg bg-white border border-[#7B2D8E]/20 flex items-center justify-center">
                                  <ChevronLeft className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                </button>
                                <button className="w-6 h-6 rounded-lg bg-white border border-[#7B2D8E]/20 flex items-center justify-center">
                                  <ChevronRight className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                                <div key={i} className="text-[9px] font-medium text-[#7B2D8E]/50 py-1">{d}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {Array.from({ length: 28 }, (_, i) => {
                                const day = i + 1
                                const isSelected = day === selectedDate
                                const hasBooking = [8, 15, 22].includes(day)
                                return (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedDate(day)}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium transition-all ${
                                      isSelected 
                                        ? 'bg-[#7B2D8E] text-white' 
                                        : hasBooking
                                          ? 'bg-[#7B2D8E]/15 text-[#7B2D8E]'
                                          : 'text-gray-600 hover:bg-[#7B2D8E]/10 bg-white'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          
                          {/* Time Slots */}
                          <div>
                            <p className="text-[10px] font-semibold text-gray-700 mb-2">Select Time</p>
                            <div className="grid grid-cols-6 gap-1.5">
                              {times.map((time, i) => (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(i)}
                                  className={`py-2 text-[10px] font-medium rounded-lg transition-all border ${
                                    i === selectedTime 
                                      ? 'bg-[#7B2D8E] text-white border-[#7B2D8E]' 
                                      : 'bg-white text-[#7B2D8E] border-[#7B2D8E]/20 hover:border-[#7B2D8E]/50'
                                  }`}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Confirm Button */}
                          <button className="w-full py-3 bg-[#7B2D8E] text-white rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" />
                            Confirm Booking
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Voucher Preview */}
                          <div className="relative bg-gradient-to-br from-[#7B2D8E] to-[#9B4DB0] rounded-xl p-4 overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12" />
                            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8" />
                            <div className="relative">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-full">
                                  <Image 
                                    src="/images/dermaspace-logo.png" 
                                    alt="Dermaspace" 
                                    width={14} 
                                    height={14}
                                    className="object-contain"
                                  />
                                  <span className="text-[9px] font-bold text-[#7B2D8E]">Dermaspace</span>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full">
                                  <Gift className="w-2.5 h-2.5 text-white" />
                                  <span className="text-[8px] font-semibold text-white">GIFT CARD</span>
                                </div>
                              </div>
                              <p className="text-white/70 text-[9px] mb-0.5">Gift Amount</p>
                              <p className="text-white text-xl font-bold mb-2">₦25,000</p>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-white/15 rounded-full">
                                  <Heart className="w-2 h-2 text-white" />
                                  <span className="text-[8px] text-white">Birthday</span>
                                </div>
                                <p className="text-white/80 text-[9px]">For: Sarah</p>
                              </div>
                            </div>
                          </div>

                          {/* Voucher Amounts */}
                          <div>
                            <p className="text-[10px] font-semibold text-gray-700 mb-2">Select Amount</p>
                            <div className="grid grid-cols-3 gap-2">
                              {voucherAmounts.map((item, idx) => (
                                <button 
                                  key={item.amount}
                                  className={`p-2.5 rounded-xl text-center transition-all border-2 ${
                                    idx === 1 
                                      ? 'border-[#7B2D8E] bg-[#7B2D8E]/[0.04]' 
                                      : 'border-gray-100 hover:border-[#7B2D8E]/30'
                                  }`}
                                >
                                  <p className={`text-[13px] font-bold ${idx === 1 ? 'text-[#7B2D8E]' : 'text-gray-900'}`}>{item.amount}</p>
                                  <p className="text-[8px] text-gray-500">{item.label}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Recipient */}
                          <div>
                            <p className="text-[10px] font-semibold text-gray-700 mb-2">Recipient Details</p>
                            <div className="space-y-2">
                              <input 
                                type="text" 
                                placeholder="Recipient name" 
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[11px] focus:outline-none focus:border-[#7B2D8E]"
                              />
                              <input 
                                type="email" 
                                placeholder="Recipient email" 
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[11px] focus:outline-none focus:border-[#7B2D8E]"
                              />
                            </div>
                          </div>
                          
                          {/* Purchase Button */}
                          <button className="w-full py-3 bg-[#7B2D8E] text-white rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Purchase Voucher
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Phone Mockup */}
              <div className="w-[200px] md:w-[180px] order-1 md:order-2">
                <div className="bg-[#f5f5f7] rounded-[36px] p-1.5 border-2 border-[#7B2D8E]/10">
                  <div className="bg-white rounded-[32px] overflow-hidden">
                    {/* Dynamic Island */}
                    <div className="h-8 bg-white flex items-center justify-center relative">
                      <div className="absolute top-2 w-20 h-5 bg-[#1a1a1a] rounded-full flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#2a2a2a]" />
                      </div>
                    </div>
                    
                    {/* App Header */}
                    <div className="bg-[#7B2D8E] px-3 pt-1 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/15 overflow-hidden flex items-center justify-center">
                            <Image 
                              src="/images/dermaspace-logo.png" 
                              alt="Dermaspace" 
                              width={18} 
                              height={18}
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-white text-[11px]">Dermaspace</p>
                            <p className="text-[8px] text-white/60">Welcome back!</p>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                          <Bell className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      
                      {/* Stats Card */}
                      <div className="bg-white/15 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white/60 text-[8px] mb-0.5">Upcoming</p>
                            <p className="text-white text-lg font-bold">3</p>
                            <p className="text-white/60 text-[8px]">Appointments</p>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {[40, 60, 45, 70, 55, 80].map((h, i) => (
                              <div key={i} className="flex items-end gap-0.5">
                                <div className="w-1.5 bg-white/30 rounded-sm" style={{ height: `${h * 0.2}px` }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Appointments List */}
                    <div className="p-3 bg-[#fafafa] min-h-[200px]">
                      <p className="text-[9px] font-semibold text-gray-900 mb-2">Upcoming Appointments</p>
                      
                      {[
                        { service: 'Signature Facial', date: 'Today', time: '10:00 AM', status: 'confirmed' },
                        { service: 'Carbon Laser Peel', date: 'Apr 20', time: '2:00 PM', status: 'pending' },
                        { service: 'Hydrafacial', date: 'Apr 25', time: '11:30 AM', status: 'confirmed' },
                      ].map((apt, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl mb-2 border border-[#7B2D8E]/10">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${apt.status === 'confirmed' ? 'bg-[#7B2D8E]' : 'bg-[#7B2D8E]/15'}`}>
                            <Calendar className={`w-4 h-4 ${apt.status === 'confirmed' ? 'text-white' : 'text-[#7B2D8E]'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-gray-900 truncate">{apt.service}</p>
                            <p className="text-[8px] text-[#7B2D8E]">{apt.date}, {apt.time}</p>
                          </div>
                          <div className={`w-1.5 h-1.5 rounded-full ${apt.status === 'confirmed' ? 'bg-green-500' : 'bg-amber-500'}`} />
                        </div>
                      ))}
                      
                      <button className="w-full mt-2 py-2.5 bg-[#7B2D8E] text-white rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1">
                        <span className="text-sm">+</span> New Booking
                      </button>
                    </div>
                    
                    {/* Bottom Nav */}
                    <div className="bg-white border-t border-gray-100 px-4 py-2.5 flex items-center justify-around">
                      {[
                        { icon: Home, active: false },
                        { icon: Calendar, active: true },
                        { icon: Gift, active: false },
                        { icon: User, active: false },
                      ].map((item, i) => (
                        <div key={i} className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.active ? 'bg-[#7B2D8E]' : ''}`}>
                          <item.icon className={`w-4 h-4 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                      ))}
                    </div>
                    
                    {/* Home indicator */}
                    <div className="h-5 flex items-center justify-center bg-white">
                      <div className="w-24 h-1 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className={`transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7B2D8E]/10 rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-[#7B2D8E] rounded-full animate-pulse" />
              <span className="text-[#7B2D8E] text-xs font-medium">In Development</span>
            </div>

            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Book Appointments &<br />
              <span className="text-[#7B2D8E]">Purchase Vouchers</span>
            </h3>

            <p className="text-gray-600 text-sm md:text-base mb-8 max-w-md leading-relaxed">
              Our online platform will let you schedule appointments, choose your preferred treatments, 
              and gift wellness to your loved ones with digital vouchers.
            </p>

            {/* Features List */}
            <div className="space-y-4 mb-8">
              {[
                { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime, day or night' },
                { icon: Clock, title: 'Real-time Availability', desc: 'See open slots instantly' },
                { icon: Gift, title: 'Digital Vouchers', desc: 'Gift wellness to loved ones' },
                { icon: Check, title: 'Instant Confirmations', desc: 'Get booking details via SMS' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-[#7B2D8E]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{feature.title}</p>
                    <p className="text-sm text-gray-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              <a
                href="tel:+2349017972919"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl font-medium text-sm hover:bg-[#6a2679] transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call to Book
              </a>
              <a
                href="https://wa.me/+2349013134945"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-xl font-medium text-sm hover:bg-[#7B2D8E]/20 transition-colors"
              >
                WhatsApp Us
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
