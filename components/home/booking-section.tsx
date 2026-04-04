'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, Gift, Home, Search, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import SectionHeader from '@/components/shared/section-header'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits."
        />

        {/* Mockups Container */}
        <div className={`relative transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Subtle background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/[0.03] via-transparent to-[#7B2D8E]/[0.02] rounded-3xl" />
          
          {/* Devices - Side by Side */}
          <div className="relative flex items-end justify-center gap-4 md:gap-6 lg:gap-8 py-8 md:py-12">
            
            {/* Desktop Browser Mockup */}
            <div className="relative flex-shrink-0 w-[55%] max-w-[500px] transform -rotate-1">
              <div className="bg-white rounded-lg md:rounded-xl overflow-hidden border border-gray-200">
                {/* Browser Chrome */}
                <div className="bg-gray-100 px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2">
                  <div className="flex gap-1 md:gap-1.5">
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#febc2e]" />
                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 mx-1 md:mx-2">
                    <div className="bg-white rounded px-2 py-0.5 md:py-1 text-[7px] md:text-[9px] text-gray-400 truncate">
                      dermaspaceng.com/booking
                    </div>
                  </div>
                </div>
                
                {/* Page Content */}
                <div className="bg-[#FAFAFA]">
                  {/* Header with Logo */}
                  <div className="bg-[#7B2D8E] px-3 md:px-4 py-2 md:py-3">
                    <div className="flex items-center gap-2">
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
                        <p className="text-[8px] md:text-[10px] font-bold text-white">Book Appointment</p>
                        <p className="text-[6px] md:text-[8px] text-white/70">Select your preferred treatment</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Steps */}
                  <div className="px-3 md:px-4 py-2 md:py-3 bg-white border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      {[
                        { num: 1, label: 'Service', active: true },
                        { num: 2, label: 'Schedule', active: false },
                        { num: 3, label: 'Confirm', active: false },
                      ].map((step, idx) => (
                        <div key={step.num} className="flex items-center">
                          <div className="flex items-center gap-1">
                            <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[7px] md:text-[8px] font-bold ${
                              step.active 
                                ? 'bg-[#7B2D8E] text-white' 
                                : 'bg-gray-200 text-gray-500'
                            }`}>
                              {step.num}
                            </div>
                            <span className={`text-[7px] md:text-[9px] font-medium hidden sm:block ${
                              step.active ? 'text-[#7B2D8E]' : 'text-gray-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                          {idx < 2 && (
                            <div className="w-6 md:w-10 lg:w-16 h-px bg-gray-200 mx-1 md:mx-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Category Pills */}
                  <div className="px-3 md:px-4 py-2 flex gap-1 md:gap-1.5 overflow-hidden">
                    {['Facial', 'Body', 'Nails', 'Waxing'].map((cat, i) => (
                      <div
                        key={cat}
                        className={`px-2 md:px-3 py-1 rounded-full text-[7px] md:text-[9px] font-medium whitespace-nowrap ${
                          i === 0 
                            ? 'bg-[#7B2D8E] text-white' 
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                  
                  {/* Treatment Cards */}
                  <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-1.5 md:space-y-2">
                    {[
                      { name: 'Signature Glow Facial', duration: '90 min', price: '₦45,000', popular: true, selected: true },
                      { name: 'Hydrafacial Treatment', duration: '75 min', price: '₦35,000', popular: true, selected: false },
                      { name: 'Deep Cleansing Facial', duration: '60 min', price: '₦20,000', popular: false, selected: false },
                    ].map((treatment) => (
                      <div
                        key={treatment.name}
                        className={`relative p-2 md:p-3 rounded-lg border transition-all ${
                          treatment.selected 
                            ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' 
                            : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-4 h-4 md:w-5 md:h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              treatment.selected 
                                ? 'bg-[#7B2D8E] border-[#7B2D8E]' 
                                : 'border-gray-300 bg-white'
                            }`}>
                              {treatment.selected && <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" strokeWidth={3} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[8px] md:text-[10px] font-semibold text-gray-900 truncate">{treatment.name}</p>
                                {treatment.popular && (
                                  <span className="px-1 md:px-1.5 py-0.5 bg-[#7B2D8E] text-white text-[5px] md:text-[6px] font-bold rounded flex-shrink-0">
                                    Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-[6px] md:text-[8px] text-gray-500">{treatment.duration}</p>
                            </div>
                          </div>
                          <p className="text-[8px] md:text-[10px] font-bold text-[#7B2D8E] flex-shrink-0">{treatment.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Continue Button */}
                  <div className="px-3 md:px-4 pb-3 md:pb-4">
                    <button className="w-full py-2 md:py-2.5 bg-[#7B2D8E] text-white rounded-lg text-[8px] md:text-[10px] font-semibold flex items-center justify-center gap-1">
                      Continue
                      <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="relative flex-shrink-0 w-[35%] max-w-[180px] transform rotate-2 -ml-8 md:-ml-12">
              <div className="bg-[#1a1a1a] rounded-[20px] md:rounded-[28px] p-1 md:p-1.5">
                <div className="bg-white rounded-[18px] md:rounded-[24px] overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="h-5 md:h-6 bg-white relative flex items-center justify-center">
                    <div className="w-12 md:w-16 h-4 md:h-5 bg-[#1a1a1a] rounded-full absolute top-0" />
                  </div>
                  
                  {/* App Header */}
                  <div className="bg-[#7B2D8E] px-3 pt-0 pb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
                        <Image 
                          src="/images/dermaspace-logo.png" 
                          alt="Dermaspace" 
                          width={14} 
                          height={14}
                          className="object-contain"
                        />
                      </div>
                      <p className="text-[9px] md:text-[11px] font-bold text-white">My Bookings</p>
                    </div>
                    
                    {/* Stats Card */}
                    <div className="bg-white/15 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[7px] md:text-[8px] text-white/70">This Month</p>
                          <p className="text-lg md:text-xl font-bold text-white">3</p>
                        </div>
                        <div className="flex items-end gap-0.5">
                          {[30, 50, 35, 60, 45].map((h, i) => (
                            <div 
                              key={i} 
                              className="w-1.5 md:w-2 rounded-t bg-white/40" 
                              style={{ height: `${h * 0.4}px` }} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-2.5 md:p-3 bg-[#FAFAFA]">
                    {/* Appointments */}
                    <div className="space-y-1.5 md:space-y-2">
                      {[
                        { service: 'Signature Facial', time: 'Today, 10:00 AM', status: 'Confirmed' },
                        { service: 'Body Massage', time: 'Tomorrow, 2:30 PM', status: 'Pending' },
                      ].map((apt, i) => (
                        <div key={i} className="bg-white rounded-lg p-2 border border-gray-100">
                          <div className="flex items-center justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-[8px] md:text-[10px] font-semibold text-gray-900 truncate">{apt.service}</p>
                              <p className="text-[6px] md:text-[8px] text-gray-500">{apt.time}</p>
                            </div>
                            <span className={`text-[5px] md:text-[7px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
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
                    <div className="mt-2 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Gift className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] md:text-[9px] font-semibold text-white">Gift Vouchers</p>
                          <p className="text-[6px] md:text-[7px] text-white/70">Give the gift of glow</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Book Button */}
                    <button className="w-full mt-2 py-1.5 md:py-2 bg-[#7B2D8E] text-white rounded-lg text-[7px] md:text-[9px] font-semibold">
                      Book New Appointment
                    </button>
                  </div>
                  
                  {/* Bottom Nav */}
                  <div className="bg-white border-t border-gray-100 px-2 py-1.5">
                    <div className="flex items-center justify-around">
                      {[
                        { icon: Home, label: 'Home', active: true },
                        { icon: Search, label: 'Services', active: false },
                        { icon: Calendar, label: 'Book', active: false },
                        { icon: Gift, label: 'Gifts', active: false },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col items-center">
                          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center ${
                            item.active ? 'bg-[#7B2D8E]' : ''
                          }`}>
                            <item.icon className={`w-2.5 h-2.5 md:w-3 md:h-3 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                          <span className={`text-[5px] md:text-[6px] mt-0.5 ${
                            item.active ? 'text-[#7B2D8E] font-semibold' : 'text-gray-400'
                          }`}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="h-3 md:h-4 flex items-center justify-center bg-white">
                    <div className="w-10 md:w-14 h-0.5 md:h-1 bg-[#1a1a1a] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Row */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {[
            { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime, anywhere' },
            { icon: Clock, title: 'Real-time Slots', desc: 'See instant availability' },
            { icon: Gift, title: 'Gift Vouchers', desc: 'Give the gift of glow' },
            { icon: Check, title: 'Easy Management', desc: 'Reschedule with ease' },
          ].map((feature) => (
            <div key={feature.title} className="bg-[#7B2D8E]/5 rounded-xl p-4">
              <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                <feature.icon className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className={`flex flex-wrap gap-4 mt-10 transition-all duration-700 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <a
            href="tel:+2349017972919"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl font-semibold hover:bg-[#5A1D6A] transition-colors"
          >
            <Phone className="w-5 h-5" />
            Call to Book Now
          </a>
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-xl font-semibold hover:bg-[#7B2D8E]/20 transition-colors"
          >
            WhatsApp Us
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  )
}
