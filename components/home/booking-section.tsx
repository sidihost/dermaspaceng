'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, Gift, Home, Grid, Search, Package } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import Image from 'next/image'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="py-16 md:py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments and purchase gift vouchers."
        />

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left - Device Mockups */}
          <div className={`relative transition-all duration-700 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            {/* Container */}
            <div className="relative min-h-[420px] sm:min-h-[480px] md:min-h-[520px]">
              
              {/* Desktop Browser Mockup */}
              <div className="absolute left-0 top-0 w-[75%] sm:w-[70%] transform -rotate-1 z-10">
                <div className="bg-white rounded-2xl overflow-hidden border-2 border-[#7B2D8E]/10">
                  {/* Browser Chrome */}
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-3 border-b border-gray-200">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-lg px-4 py-1.5 text-xs text-gray-500 border border-gray-200 max-w-[240px]">
                        dermaspaceng.com/booking
                      </div>
                    </div>
                  </div>
                  
                  {/* Calendar Content */}
                  <div className="p-4 sm:p-6 bg-white">
                    {/* Month Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">April 2026</h3>
                      <div className="flex gap-1">
                        <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Week Days Header */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                        <div key={idx} className="text-center text-xs font-medium text-gray-400 py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                      {Array.from({ length: 35 }, (_, i) => {
                        const day = i - 2 // Start from Wednesday (offset by 2)
                        const isCurrentMonth = day >= 1 && day <= 30
                        const isSelected = day === 4
                        const hasBooking = [4, 8, 15, 18, 22, 25].includes(day)
                        
                        return (
                          <div
                            key={i}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all ${
                              !isCurrentMonth 
                                ? 'text-gray-200' 
                                : isSelected 
                                  ? 'bg-[#7B2D8E] text-white' 
                                  : hasBooking 
                                    ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]' 
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-xs sm:text-sm">{isCurrentMonth ? day : ''}</span>
                            {hasBooking && !isSelected && isCurrentMonth && (
                              <span className="w-1 h-1 rounded-full bg-[#7B2D8E] mt-0.5" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Phone Mockup - Overlapping */}
              <div className="absolute right-0 bottom-0 w-[50%] sm:w-[45%] max-w-[200px] transform rotate-2 z-20">
                <div className="bg-[#1a1a1a] rounded-[32px] p-1.5 sm:p-2">
                  <div className="bg-white rounded-[26px] overflow-hidden">
                    {/* Phone Notch */}
                    <div className="h-6 bg-white flex items-center justify-center relative">
                      <div className="absolute left-1/2 -translate-x-1/2 w-20 h-5 bg-[#1a1a1a] rounded-b-2xl flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-gray-700" />
                      </div>
                    </div>
                    
                    {/* App Content */}
                    <div className="px-3 pt-2 pb-3">
                      {/* Header */}
                      <p className="text-sm font-bold text-gray-900 mb-3">My Bookings</p>
                      
                      {/* Stats Card */}
                      <div className="bg-[#7B2D8E] rounded-xl p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-white/70 mb-0.5">This Month</p>
                            <p className="text-2xl font-bold text-white">3</p>
                          </div>
                          {/* Mini Bar Chart */}
                          <div className="flex items-end gap-1">
                            {[40, 65, 45, 80, 55, 70].map((h, i) => (
                              <div 
                                key={i}
                                className="w-2.5 rounded-t bg-white/30"
                                style={{ height: `${h * 0.4}px` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Appointments */}
                      <div className="space-y-2">
                        {[
                          { service: 'Signature Facial', time: '10:00 AM', status: 'Confirmed' },
                          { service: 'Body Massage', time: '2:30 PM', status: 'Pending' },
                        ].map((apt, idx) => (
                          <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-semibold text-gray-900">{apt.service}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{apt.time}</p>
                              </div>
                              <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                                apt.status === 'Confirmed' 
                                  ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]' 
                                  : 'bg-amber-50 text-amber-600'
                              }`}>
                                {apt.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Book New Button */}
                      <button className="w-full mt-3 py-2.5 bg-[#7B2D8E] text-white rounded-xl text-xs font-semibold">
                        Book New
                      </button>
                    </div>
                    
                    {/* Bottom Navigation */}
                    <div className="border-t border-gray-100 px-2 py-2">
                      <div className="flex items-center justify-around">
                        {[
                          { icon: Home, label: 'Home', active: true },
                          { icon: Grid, label: 'Services', active: false },
                          { icon: Search, label: 'Search', active: false },
                          { icon: Package, label: 'Packages', active: false },
                          { icon: Calendar, label: 'Book', active: false },
                        ].map((item, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-0.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              item.active ? 'bg-[#7B2D8E]' : ''
                            }`}>
                              <item.icon className={`w-4 h-4 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                            </div>
                            <span className={`text-[8px] ${item.active ? 'text-[#7B2D8E] font-medium' : 'text-gray-400'}`}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Home Indicator */}
                    <div className="h-4 flex items-center justify-center bg-white">
                      <div className="w-24 h-1 bg-gray-900 rounded-full" />
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

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 text-balance">
              Book Appointments<br />
              <span className="text-[#7B2D8E]">From Anywhere</span>
            </h3>

            <p className="text-gray-600 text-sm md:text-base mb-6 max-w-md">
              Our online booking platform will let you schedule appointments, purchase gift vouchers, 
              and manage your visits - all from your phone or computer.
            </p>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              {[
                { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime, day or night' },
                { icon: Clock, title: 'Real-time Availability', desc: 'See open slots instantly' },
                { icon: Gift, title: 'Gift Vouchers', desc: 'Give the gift of self-care' },
                { icon: Check, title: 'Instant Confirmations', desc: 'Get booking details via SMS' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-[#7B2D8E]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{feature.title}</p>
                    <p className="text-xs text-gray-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              <a
                href="tel:+2349017972919"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white rounded-xl font-medium text-sm hover:bg-[#5A1D6A] transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call to Book
              </a>
              <a
                href="https://wa.me/+2349013134945"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-xl font-medium text-sm hover:bg-[#7B2D8E]/20 transition-colors"
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
