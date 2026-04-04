'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, Gift, Home, Search, ChevronRight, ChevronLeft, MapPin } from 'lucide-react'
import Image from 'next/image'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* MOCKUPS FIRST - Clean side by side layout */}
        <div className={`relative mb-16 transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Background */}
          <div className="absolute inset-x-0 top-8 bottom-0 bg-gradient-to-b from-[#7B2D8E]/[0.04] to-transparent rounded-[32px]" />
          
          {/* Devices Container - Flex layout for side by side */}
          <div className="relative flex flex-col md:flex-row items-center md:items-end justify-center gap-4 md:gap-0 py-8 md:py-12">
            
            {/* Desktop Browser Mockup */}
            <div className="relative w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] lg:max-w-[560px] md:-mr-8 lg:-mr-12 z-10 transform md:-rotate-1">
              <div className="bg-white rounded-xl lg:rounded-2xl overflow-hidden border border-gray-200">
                {/* Browser Chrome */}
                <div className="bg-gray-100 px-3 lg:px-4 py-2 lg:py-2.5 flex items-center gap-2 lg:gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 mx-2 lg:mx-4">
                    <div className="bg-white rounded-lg px-3 lg:px-4 py-1.5 text-[10px] lg:text-xs text-gray-500 flex items-center gap-2 max-w-[280px]">
                      <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">dermaspaceng.com/booking</span>
                    </div>
                  </div>
                </div>
                
                {/* Page Content */}
                <div className="bg-[#FAFAFA]">
                  {/* Page Header */}
                  <div className="px-4 lg:px-6 py-3 lg:py-4 bg-white border-b border-gray-100">
                    <div className="flex items-center gap-1.5 text-[9px] lg:text-[11px] text-gray-400 mb-1">
                      <span>Dashboard</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-gray-900">Book Appointment</span>
                    </div>
                    <h2 className="text-sm lg:text-base font-bold text-gray-900">Choose Your Services</h2>
                    <p className="text-[9px] lg:text-[11px] text-gray-500">Hi Sarah, what would you like today?</p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mx-4 lg:mx-6 my-3 lg:my-4 bg-white rounded-xl p-3 lg:p-4 border border-gray-100">
                    <div className="flex items-center justify-between relative">
                      {/* Line */}
                      <div className="absolute top-3 lg:top-4 left-8 right-8 lg:left-10 lg:right-10 h-0.5 bg-gray-200" />
                      <div className="absolute top-3 lg:top-4 left-8 lg:left-10 h-0.5 bg-[#7B2D8E] w-0" />
                      
                      {[
                        { num: 1, label: 'Services', active: true, done: false },
                        { num: 2, label: 'Schedule', active: false, done: false },
                        { num: 3, label: 'Confirm', active: false, done: false },
                      ].map((step) => (
                        <div key={step.num} className="flex flex-col items-center relative z-10">
                          <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-[10px] lg:text-xs font-bold transition-all ${
                            step.active 
                              ? 'bg-[#7B2D8E] text-white ring-4 ring-[#7B2D8E]/20' 
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                            {step.done ? <Check className="w-3 h-3 lg:w-4 lg:h-4" /> : step.num}
                          </div>
                          <span className={`text-[8px] lg:text-[10px] mt-1 lg:mt-1.5 font-medium ${
                            step.active ? 'text-[#7B2D8E]' : 'text-gray-400'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="mx-4 lg:mx-6 mb-3 lg:mb-4">
                    <div className="bg-white rounded-xl border border-gray-100 p-2 lg:p-3">
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <Search className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400" />
                        <span className="text-[9px] lg:text-[11px] text-gray-400">Search treatments...</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Category Pills */}
                  <div className="px-4 lg:px-6 mb-3 lg:mb-4">
                    <div className="flex gap-2">
                      {['All Services', 'Facial', 'Body', 'Nails', 'Waxing'].map((cat, i) => (
                        <div
                          key={cat}
                          className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[9px] lg:text-[11px] font-medium whitespace-nowrap ${
                            i === 0 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'bg-white text-gray-600 border border-gray-200'
                          }`}
                        >
                          {cat}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Treatment Category Card */}
                  <div className="mx-4 lg:mx-6 mb-4 lg:mb-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Category Header */}
                    <div className="relative h-20 lg:h-28 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0]">
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute bottom-0 left-0 p-3 lg:p-4">
                        <h3 className="text-sm lg:text-lg font-bold text-white">Facial Treatments</h3>
                        <p className="text-[9px] lg:text-xs text-white/70">6 treatments available</p>
                      </div>
                    </div>
                    
                    {/* Treatments List */}
                    <div className="p-2 lg:p-3 space-y-2">
                      {[
                        { name: 'Signature Glow Facial', duration: '90 min', price: '₦45,000', popular: true, selected: true },
                        { name: 'Hydrafacial Treatment', duration: '75 min', price: '₦35,000', popular: true, selected: false },
                        { name: 'Deep Cleansing Facial', duration: '60 min', price: '₦20,000', popular: false, selected: false },
                      ].map((treatment) => (
                        <div
                          key={treatment.name}
                          className={`relative p-3 lg:p-4 rounded-xl border-2 transition-all ${
                            treatment.selected 
                              ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' 
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {treatment.popular && (
                            <span className="absolute -top-2 right-3 lg:right-4 px-2 py-0.5 bg-[#7B2D8E] text-white text-[7px] lg:text-[9px] font-bold uppercase tracking-wider rounded-full">
                              Popular
                            </span>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="text-[11px] lg:text-sm font-semibold text-gray-900 truncate">{treatment.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px] lg:text-[11px] text-gray-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                                  {treatment.duration}
                                </span>
                                <span className="text-[10px] lg:text-xs font-bold text-[#7B2D8E]">{treatment.price}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              treatment.selected 
                                ? 'bg-[#7B2D8E] border-[#7B2D8E]' 
                                : 'border-gray-300'
                            }`}>
                              {treatment.selected && <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="relative w-[200px] sm:w-[220px] md:w-[200px] lg:w-[240px] transform md:rotate-2 z-20">
              <div className="bg-[#1d1d1f] rounded-[32px] lg:rounded-[40px] p-1.5 lg:p-2">
                <div className="bg-[#1d1d1f] rounded-[28px] lg:rounded-[36px] overflow-hidden">
                  {/* Screen */}
                  <div className="bg-white rounded-[26px] lg:rounded-[34px] overflow-hidden">
                    {/* Dynamic Island Area */}
                    <div className="h-8 lg:h-10 bg-white relative flex items-center justify-center">
                      <div className="w-20 lg:w-24 h-6 lg:h-7 bg-[#1d1d1f] rounded-full absolute top-0" />
                    </div>
                    
                    {/* App Header */}
                    <div className="bg-[#7B2D8E] px-4 pt-1 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                            <Image 
                              src="/images/dermaspace-logo.png" 
                              alt="Dermaspace" 
                              width={24} 
                              height={24}
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <p className="text-xs lg:text-sm font-bold text-white">My Bookings</p>
                            <p className="text-[8px] lg:text-[10px] text-white/70">Manage appointments</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="bg-white/15 backdrop-blur rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] lg:text-[10px] text-white/70">This Month</p>
                            <p className="text-2xl lg:text-3xl font-bold text-white">3</p>
                          </div>
                          <div className="flex items-end gap-1">
                            {[35, 55, 40, 70, 50, 65].map((h, i) => (
                              <div 
                                key={i} 
                                className="w-2 lg:w-2.5 rounded-t bg-white/40" 
                                style={{ height: `${h * 0.5}px` }} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4 bg-[#FAFAFA] min-h-[180px] lg:min-h-[220px]">
                      {/* Appointments */}
                      <div className="space-y-2 lg:space-y-3">
                        {[
                          { service: 'Signature Facial', time: 'Today, 10:00 AM', status: 'Confirmed' },
                          { service: 'Body Massage', time: 'Tomorrow, 2:30 PM', status: 'Pending' },
                        ].map((apt, i) => (
                          <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] lg:text-xs font-semibold text-gray-900 truncate">{apt.service}</p>
                                <p className="text-[9px] lg:text-[10px] text-gray-500">{apt.time}</p>
                              </div>
                              <span className={`text-[8px] lg:text-[9px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                                apt.status === 'Confirmed' 
                                  ? 'bg-[#7B2D8E] text-white' 
                                  : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                              }`}>
                                {apt.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Gift Voucher */}
                      <div className="mt-3 lg:mt-4 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Gift className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] lg:text-xs font-semibold text-white">Gift Vouchers</p>
                            <p className="text-[8px] lg:text-[10px] text-white/70">Give the gift of glow</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/60 flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom Nav */}
                    <div className="bg-white border-t border-gray-100 px-3 py-2">
                      <div className="flex items-center justify-around">
                        {[
                          { icon: Home, label: 'Home', active: true },
                          { icon: Search, label: 'Search', active: false },
                          { icon: Calendar, label: 'Book', active: false },
                          { icon: Gift, label: 'Gifts', active: false },
                        ].map((item) => (
                          <div key={item.label} className="flex flex-col items-center">
                            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center ${
                              item.active ? 'bg-[#7B2D8E]' : ''
                            }`}>
                              <item.icon className={`w-4 h-4 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                            </div>
                            <span className={`text-[7px] lg:text-[8px] mt-0.5 ${
                              item.active ? 'text-[#7B2D8E] font-semibold' : 'text-gray-400'
                            }`}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Home Indicator */}
                    <div className="h-5 flex items-center justify-center bg-white">
                      <div className="w-24 lg:w-28 h-1 bg-[#1d1d1f] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TEXT CONTENT */}
        <div className={`text-center max-w-2xl mx-auto transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E]/10 rounded-full mb-5">
            <span className="w-2 h-2 bg-[#7B2D8E] rounded-full animate-pulse" />
            <span className="text-[#7B2D8E] text-sm font-medium">Coming Soon</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Online <span className="text-[#7B2D8E]">Booking</span>
          </h2>

          <p className="text-gray-600 text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            We&apos;re building a seamless booking experience. Soon you&apos;ll be able to schedule appointments, 
            purchase gift vouchers, and manage your visits from anywhere.
          </p>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-10">
            {[
              { icon: Calendar, text: '24/7 Scheduling' },
              { icon: Clock, text: 'Real-time Availability' },
              { icon: Gift, text: 'Gift Vouchers' },
              { icon: MapPin, text: 'Multiple Locations' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <span className="text-sm md:text-base text-gray-700 font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="tel:+2349017972919"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#7B2D8E] text-white rounded-2xl font-semibold hover:bg-[#5A1D6A] transition-colors"
            >
              <Phone className="w-5 h-5" />
              Call to Book Now
            </a>
            <a
              href="https://wa.me/+2349013134945"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-2xl font-semibold hover:bg-[#7B2D8E]/20 transition-colors"
            >
              WhatsApp Us
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
