'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, Gift, Home, Grid, Search, Package, ChevronRight } from 'lucide-react'
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
          {/* Left - Device Mockups Container */}
          <div className={`relative transition-all duration-700 order-2 lg:order-1 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/5 via-transparent to-[#7B2D8E]/3 rounded-3xl" />
            
            {/* Mockups Container - Side by Side */}
            <div className="relative py-6 md:py-8 px-2 md:px-4">
              <div className="relative flex items-start justify-center">
                
                {/* Desktop Browser Mockup - Left */}
                <div className="relative w-[58%] md:w-[55%] transform -rotate-1 z-10">
                  <div className="bg-white rounded-lg md:rounded-xl overflow-hidden border border-gray-200">
                    {/* Browser Chrome */}
                    <div className="bg-gray-50 px-2 md:px-3 py-1 md:py-1.5 flex items-center gap-1.5 md:gap-2 border-b border-gray-200">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-400" />
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-yellow-400" />
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 ml-1">
                        <div className="bg-white rounded px-1.5 md:px-2 py-0.5 text-[6px] md:text-[8px] text-gray-400 border border-gray-200 max-w-[120px] md:max-w-none truncate">
                          dermaspaceng.com/booking
                        </div>
                      </div>
                    </div>
                    
                    {/* App Header */}
                    <div className="bg-[#7B2D8E] px-2 md:px-3 py-2 md:py-3">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-white/20 flex items-center justify-center overflow-hidden">
                          <Image 
                            src="/images/dermaspace-logo.png" 
                            alt="Dermaspace" 
                            width={16} 
                            height={16}
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <p className="text-[8px] md:text-[10px] font-semibold text-white">Book Appointment</p>
                          <p className="text-[6px] md:text-[7px] text-white/70">Select your treatment</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Steps */}
                    <div className="bg-white px-2 md:px-3 py-1.5 md:py-2 border-b border-gray-100">
                      <div className="flex items-center justify-between gap-1">
                        {['Service', 'Date', 'Confirm'].map((label, idx) => (
                          <div key={label} className="flex items-center gap-0.5 md:gap-1 flex-1">
                            <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[6px] md:text-[7px] font-bold ${
                              idx === 0 
                                ? 'bg-[#7B2D8E] text-white' 
                                : 'bg-[#7B2D8E]/10 text-[#7B2D8E]/40'
                            }`}>
                              {idx + 1}
                            </div>
                            <span className={`text-[5px] md:text-[7px] font-medium ${
                              idx === 0 ? 'text-[#7B2D8E]' : 'text-gray-300'
                            }`}>{label}</span>
                            {idx < 2 && <div className="flex-1 h-px bg-gray-100 mx-0.5" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-2 md:p-3 bg-gray-50">
                      {/* Category Tabs */}
                      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                        {['Facial', 'Body', 'Nails', 'Waxing'].map((cat, idx) => (
                          <div 
                            key={cat}
                            className={`px-2 md:px-3 py-1 rounded-full text-[6px] md:text-[8px] font-medium whitespace-nowrap ${
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
                      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        {[
                          { name: 'Signature Glow Facial', time: '90 min', price: '₦45,000', popular: true, selected: true },
                          { name: 'Hydra Facial', time: '75 min', price: '₦35,000', popular: true, selected: false },
                          { name: 'Deep Cleansing', time: '60 min', price: '₦20,000', popular: false, selected: false },
                        ].map((item, idx) => (
                          <div 
                            key={item.name}
                            className={`flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:py-2 ${
                              idx !== 2 ? 'border-b border-gray-50' : ''
                            } ${item.selected ? 'bg-[#7B2D8E]/5' : ''}`}
                          >
                            <div className={`w-3 h-3 md:w-4 md:h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                              item.selected 
                                ? 'bg-[#7B2D8E] border-[#7B2D8E]' 
                                : 'border-gray-300'
                            }`}>
                              {item.selected && <Check className="w-2 h-2 md:w-2.5 md:h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[7px] md:text-[9px] font-medium text-gray-900 truncate">{item.name}</span>
                                {item.popular && (
                                  <span className="text-[5px] md:text-[6px] px-1 py-px bg-[#7B2D8E]/10 text-[#7B2D8E] rounded font-medium">
                                    Popular
                                  </span>
                                )}
                              </div>
                              <span className="text-[5px] md:text-[7px] text-gray-400">{item.time}</span>
                            </div>
                            <span className="text-[7px] md:text-[9px] font-semibold text-[#7B2D8E]">{item.price}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Continue Button */}
                      <button className="w-full mt-2 py-1.5 md:py-2 bg-[#7B2D8E] text-white rounded-lg text-[7px] md:text-[9px] font-semibold flex items-center justify-center gap-0.5">
                        Continue
                        <ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Phone Mockup - Right, Overlapping */}
                <div className="relative w-[45%] md:w-[42%] transform rotate-2 -ml-8 md:-ml-12 mt-4 md:mt-6 z-20">
                  <div className="bg-gray-900 rounded-[18px] md:rounded-[24px] p-1 md:p-1.5">
                    <div className="bg-white rounded-[14px] md:rounded-[20px] overflow-hidden">
                      {/* Dynamic Island */}
                      <div className="h-4 md:h-5 bg-white flex items-center justify-center relative">
                        <div className="absolute top-1 w-12 md:w-16 h-2.5 md:h-3 bg-gray-900 rounded-full" />
                      </div>
                      
                      {/* App Header */}
                      <div className="bg-[#7B2D8E] px-2.5 md:px-3 py-2.5 md:py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-white/20 flex items-center justify-center overflow-hidden">
                            <Image 
                              src="/images/dermaspace-logo.png" 
                              alt="Dermaspace" 
                              width={16} 
                              height={16}
                              className="object-contain"
                            />
                          </div>
                          <p className="text-[9px] md:text-[11px] font-bold text-white">My Bookings</p>
                        </div>
                        
                        {/* Stats Card */}
                        <div className="bg-white/15 rounded-lg p-2 md:p-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-[6px] md:text-[7px] text-white/70">This Month</p>
                            <p className="text-base md:text-lg font-bold text-white">3</p>
                          </div>
                          <div className="flex items-end gap-0.5">
                            {[30, 50, 35, 60, 45, 55].map((h, i) => (
                              <div 
                                key={i}
                                className="w-1 md:w-1.5 rounded-t bg-white/50"
                                style={{ height: `${h * 0.3}px` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-2.5 md:p-3 bg-gray-50">
                        {/* Appointments */}
                        <div className="space-y-1.5 md:space-y-2">
                          {[
                            { service: 'Signature Facial', time: '10:00 AM', status: 'Confirmed' },
                            { service: 'Body Massage', time: '2:30 PM', status: 'Pending' },
                          ].map((apt, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-2 md:p-2.5 border border-gray-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[8px] md:text-[10px] font-semibold text-gray-900">{apt.service}</p>
                                  <p className="text-[6px] md:text-[8px] text-gray-400">{apt.time}</p>
                                </div>
                                <span className={`text-[5px] md:text-[7px] font-medium px-1.5 py-0.5 rounded-full ${
                                  apt.status === 'Confirmed' 
                                    ? 'bg-[#7B2D8E] text-white' 
                                    : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                                }`}>
                                  {apt.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          
                          {/* Gift Voucher */}
                          <div className="bg-[#7B2D8E] rounded-lg p-2 md:p-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <div className="w-6 h-6 md:w-7 md:h-7 rounded-md bg-white/20 flex items-center justify-center">
                                <Gift className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                              </div>
                              <div>
                                <p className="text-[8px] md:text-[9px] font-semibold text-white">Gift Vouchers</p>
                                <p className="text-[6px] md:text-[7px] text-white/70">Give the gift of glow</p>
                              </div>
                            </div>
                            <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-white/70" />
                          </div>
                        </div>
                        
                        {/* Book Button */}
                        <button className="w-full mt-2 md:mt-2.5 py-1.5 md:py-2 bg-[#7B2D8E] text-white rounded-lg text-[7px] md:text-[9px] font-semibold">
                          Book New Appointment
                        </button>
                      </div>
                      
                      {/* Bottom Nav */}
                      <div className="bg-white border-t border-gray-100 px-1.5 py-1 md:py-1.5">
                        <div className="flex items-center justify-around">
                          {[
                            { icon: Home, label: 'Home', active: true },
                            { icon: Grid, label: 'Services', active: false },
                            { icon: Search, label: 'Search', active: false },
                            { icon: Package, label: 'Packages', active: false },
                            { icon: Calendar, label: 'Book', active: false },
                          ].map((item) => (
                            <div key={item.label} className="flex flex-col items-center">
                              <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center ${
                                item.active ? 'bg-[#7B2D8E]' : ''
                              }`}>
                                <item.icon className={`w-2.5 h-2.5 md:w-3 md:h-3 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                              </div>
                              <span className={`text-[5px] md:text-[6px] mt-0.5 ${item.active ? 'text-[#7B2D8E] font-medium' : 'text-gray-400'}`}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Home Indicator */}
                      <div className="h-3 md:h-4 flex items-center justify-center bg-white">
                        <div className="w-16 md:w-20 h-0.5 md:h-1 bg-gray-900 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className={`transition-all duration-700 delay-200 order-1 lg:order-2 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
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
