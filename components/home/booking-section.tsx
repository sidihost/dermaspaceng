'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, Gift, Home, Grid, Search, Package, ChevronRight } from 'lucide-react'
import Image from 'next/image'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-[#7B2D8E]/[0.03] to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* MOCKUPS FIRST - At the top */}
        <div className={`relative mb-12 md:mb-16 transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Mockups Container */}
          <div className="relative flex items-end justify-center max-w-3xl mx-auto">
            
            {/* Desktop Browser Mockup */}
            <div className="relative w-[65%] sm:w-[60%] md:w-[55%] transform -rotate-2 z-10">
              <div className="bg-white rounded-xl md:rounded-2xl overflow-hidden border-2 border-[#7B2D8E]/10">
                {/* Browser Chrome */}
                <div className="bg-[#7B2D8E]/5 px-3 md:px-4 py-2 md:py-2.5 flex items-center gap-2 md:gap-3 border-b border-[#7B2D8E]/10">
                  <div className="flex gap-1 md:gap-1.5">
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#7B2D8E]/40" />
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#7B2D8E]/30" />
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#7B2D8E]/20" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white rounded-md px-2 md:px-3 py-1 md:py-1.5 text-[8px] md:text-[10px] text-[#7B2D8E]/60 border border-[#7B2D8E]/10 truncate">
                      dermaspaceng.com/booking
                    </div>
                  </div>
                </div>
                
                {/* App Header */}
                <div className="bg-[#7B2D8E] px-3 md:px-4 py-3 md:py-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
                      <Image 
                        src="/images/dermaspace-logo.png" 
                        alt="Dermaspace" 
                        width={28} 
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-white">Book Appointment</p>
                      <p className="text-[8px] md:text-[10px] text-white/70">Select your preferred treatment</p>
                    </div>
                  </div>
                </div>
                
                {/* Progress Steps */}
                <div className="bg-white px-3 md:px-4 py-2 md:py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {['Service', 'Schedule', 'Confirm'].map((label, idx) => (
                      <div key={label} className="flex items-center gap-1 md:gap-1.5 flex-1">
                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold ${
                          idx === 0 
                            ? 'bg-[#7B2D8E] text-white' 
                            : 'bg-[#7B2D8E]/10 text-[#7B2D8E]/50'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className={`text-[8px] md:text-[10px] font-medium hidden sm:block ${
                          idx === 0 ? 'text-[#7B2D8E]' : 'text-gray-400'
                        }`}>{label}</span>
                        {idx < 2 && <div className="flex-1 h-0.5 bg-gray-100 mx-1" />}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-3 md:p-4 bg-[#fafafa]">
                  {/* Category Tabs */}
                  <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-4">
                    {['Facial', 'Body', 'Nails', 'Waxing'].map((cat, idx) => (
                      <div 
                        key={cat}
                        className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-full text-[8px] md:text-[11px] font-medium ${
                          idx === 0 
                            ? 'bg-[#7B2D8E] text-white' 
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                  
                  {/* Treatments */}
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {[
                      { name: 'Signature Glow Facial', time: '90 min', price: '₦45,000', popular: true, selected: true },
                      { name: 'Hydrafacial Treatment', time: '75 min', price: '₦35,000', popular: true, selected: false },
                      { name: 'Deep Cleansing Facial', time: '60 min', price: '₦20,000', popular: false, selected: false },
                    ].map((item, idx) => (
                      <div 
                        key={item.name}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 ${
                          idx !== 2 ? 'border-b border-gray-100' : ''
                        } ${item.selected ? 'bg-[#7B2D8E]/5' : ''}`}
                      >
                        <div className={`w-4 h-4 md:w-5 md:h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                          item.selected 
                            ? 'bg-[#7B2D8E] border-[#7B2D8E]' 
                            : 'border-gray-300'
                        }`}>
                          {item.selected && <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <span className="text-[9px] md:text-xs font-medium text-gray-900 truncate">{item.name}</span>
                            {item.popular && (
                              <span className="text-[6px] md:text-[8px] px-1.5 md:px-2 py-0.5 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-full font-medium flex-shrink-0">
                                Popular
                              </span>
                            )}
                          </div>
                          <span className="text-[7px] md:text-[10px] text-gray-400">{item.time}</span>
                        </div>
                        <span className="text-[9px] md:text-xs font-bold text-[#7B2D8E]">{item.price}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Continue Button */}
                  <button className="w-full mt-3 md:mt-4 py-2.5 md:py-3 bg-[#7B2D8E] text-white rounded-xl text-[10px] md:text-sm font-semibold flex items-center justify-center gap-1">
                    Continue
                    <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup - Overlapping on right */}
            <div className="relative w-[42%] sm:w-[38%] md:w-[35%] transform rotate-3 -ml-12 sm:-ml-16 md:-ml-20 z-20">
              <div className="bg-[#1a1a1a] rounded-[24px] md:rounded-[32px] p-1.5 md:p-2">
                <div className="bg-white rounded-[20px] md:rounded-[28px] overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="h-5 md:h-6 bg-white flex items-center justify-center relative">
                    <div className="absolute top-1.5 w-16 md:w-20 h-4 md:h-5 bg-[#1a1a1a] rounded-full" />
                  </div>
                  
                  {/* App Header */}
                  <div className="bg-[#7B2D8E] px-3 md:px-4 py-3 md:py-4">
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
                        <Image 
                          src="/images/dermaspace-logo.png" 
                          alt="Dermaspace" 
                          width={20} 
                          height={20}
                          className="object-contain"
                        />
                      </div>
                      <p className="text-xs md:text-sm font-bold text-white">My Bookings</p>
                    </div>
                    
                    {/* Stats Card */}
                    <div className="bg-white/15 rounded-xl p-2.5 md:p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] md:text-[10px] text-white/70">This Month</p>
                        <p className="text-xl md:text-2xl font-bold text-white">3</p>
                      </div>
                      <div className="flex items-end gap-0.5 md:gap-1">
                        {[30, 50, 35, 65, 45, 55].map((h, i) => (
                          <div 
                            key={i}
                            className="w-1.5 md:w-2 rounded-t bg-white/50"
                            style={{ height: `${h * 0.4}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-3 md:p-4 bg-[#fafafa]">
                    {/* Appointments */}
                    <div className="space-y-2 md:space-y-2.5">
                      {[
                        { service: 'Signature Facial', time: 'Today, 10:00 AM', status: 'Confirmed' },
                        { service: 'Body Massage', time: 'Tomorrow, 2:30 PM', status: 'Pending' },
                      ].map((apt, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-2.5 md:p-3 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] md:text-xs font-semibold text-gray-900">{apt.service}</p>
                              <p className="text-[8px] md:text-[10px] text-gray-400">{apt.time}</p>
                            </div>
                            <span className={`text-[7px] md:text-[9px] font-medium px-2 py-1 rounded-full ${
                              apt.status === 'Confirmed' 
                                ? 'bg-[#7B2D8E] text-white' 
                                : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Gift Voucher Card */}
                      <div className="bg-[#7B2D8E] rounded-xl p-2.5 md:p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white/20 flex items-center justify-center">
                            <Gift className="w-4 h-4 md:w-5 md:h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs font-semibold text-white">Gift Vouchers</p>
                            <p className="text-[7px] md:text-[9px] text-white/70">Give the gift of glow</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
                      </div>
                    </div>
                    
                    {/* Book Button */}
                    <button className="w-full mt-3 py-2.5 md:py-3 bg-[#7B2D8E] text-white rounded-xl text-[9px] md:text-[11px] font-semibold">
                      Book New Appointment
                    </button>
                  </div>
                  
                  {/* Bottom Nav */}
                  <div className="bg-white border-t border-gray-100 px-2 py-2 md:py-2.5">
                    <div className="flex items-center justify-around">
                      {[
                        { icon: Home, label: 'Home', active: true },
                        { icon: Grid, label: 'Services', active: false },
                        { icon: Search, label: 'Search', active: false },
                        { icon: Package, label: 'Packages', active: false },
                        { icon: Calendar, label: 'Book', active: false },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col items-center">
                          <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center ${
                            item.active ? 'bg-[#7B2D8E]' : ''
                          }`}>
                            <item.icon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <span className={`text-[6px] md:text-[8px] mt-0.5 ${item.active ? 'text-[#7B2D8E] font-medium' : 'text-gray-400'}`}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="h-4 md:h-5 flex items-center justify-center bg-white">
                    <div className="w-20 md:w-24 h-1 bg-[#1a1a1a] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TEXT CONTENT - Below the mockups */}
        <div className={`text-center max-w-2xl mx-auto transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E]/10 rounded-full mb-4">
            <span className="w-2 h-2 bg-[#7B2D8E] rounded-full animate-pulse" />
            <span className="text-[#7B2D8E] text-sm font-medium">Coming Soon</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">
            Online <span className="text-[#7B2D8E]">Booking</span>
          </h2>

          <p className="text-gray-600 text-sm md:text-base mb-8 max-w-lg mx-auto">
            We&apos;re building a seamless booking experience. Soon you&apos;ll be able to schedule appointments, 
            purchase gift vouchers, and manage your visits from anywhere.
          </p>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-8">
            {[
              { icon: Calendar, text: '24/7 Scheduling' },
              { icon: Clock, text: 'Real-time Availability' },
              { icon: Gift, text: 'Gift Vouchers' },
              { icon: Check, text: 'Instant Confirmation' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-[#7B2D8E]" />
                </div>
                <span className="text-sm text-gray-700 font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="tel:+2349017972919"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl font-medium text-sm hover:bg-[#5A1D6A] transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call to Book Now
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
    </section>
  )
}
