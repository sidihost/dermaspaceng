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
    <section className="py-16 md:py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="px-4">
          <SectionHeader 
            badge="Coming Soon"
            title="Online"
            highlight="Booking"
            description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits."
          />
        </div>

        {/* Mockups Container */}
        <div className={`relative transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Subtle background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/[0.03] via-transparent to-[#7B2D8E]/[0.02] rounded-3xl" />
          
          {/* Devices - Side by Side */}
          <div className="relative flex items-end justify-center gap-2 md:gap-4 py-6 md:py-8 px-4">
            
            {/* Desktop Browser Mockup */}
            <div className="relative flex-shrink-0 w-[50%] max-w-[380px] transform -rotate-1">
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-xl">
                {/* Browser Chrome */}
                <div className="bg-gray-100 px-2 py-1.5 flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
                    <div className="w-2 h-2 rounded-full bg-[#9B4DB0]" />
                    <div className="w-2 h-2 rounded-full bg-[#C48DD0]" />
                  </div>
                  <div className="flex-1 mx-1">
                    <div className="bg-white rounded px-2 py-0.5 text-[6px] text-gray-400 truncate">
                      dermaspaceng.com/booking
                    </div>
                  </div>
                </div>
                
                {/* Page Content */}
                <div className="bg-[#FAFAFA]">
                  {/* Header with Logo */}
                  <div className="bg-[#7B2D8E] px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center overflow-hidden">
                        <Image 
                          src="/images/dermaspace-logo.png" 
                          alt="Dermaspace" 
                          width={12} 
                          height={12}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-[7px] font-bold text-white">Book Appointment</p>
                        <p className="text-[5px] text-white/70">Select your treatment</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Steps */}
                  <div className="px-2.5 py-1.5 bg-white border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      {[
                        { num: 1, active: true },
                        { num: 2, active: false },
                        { num: 3, active: false },
                      ].map((step, idx) => (
                        <div key={step.num} className="flex items-center">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold ${
                            step.active 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            {step.num}
                          </div>
                          {idx < 2 && (
                            <div className="w-8 md:w-12 h-px bg-gray-200 mx-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Category Pills */}
                  <div className="px-2.5 py-1.5 flex gap-1 overflow-hidden">
                    {['Facial', 'Body', 'Nails', 'Waxing'].map((cat, i) => (
                      <div
                        key={cat}
                        className={`px-2 py-0.5 rounded-full text-[6px] font-medium whitespace-nowrap ${
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
                  <div className="px-2.5 pb-2 space-y-1">
                    {[
                      { name: 'Signature Glow', duration: '90 min', price: '₦45,000', popular: true, selected: true },
                      { name: 'Hydrafacial', duration: '75 min', price: '₦35,000', popular: true, selected: false },
                      { name: 'Deep Cleansing', duration: '60 min', price: '₦20,000', popular: false, selected: false },
                    ].map((treatment) => (
                      <div
                        key={treatment.name}
                        className={`relative p-1.5 rounded border ${
                          treatment.selected 
                            ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' 
                            : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              treatment.selected 
                                ? 'bg-[#7B2D8E] border-[#7B2D8E]' 
                                : 'border-gray-300 bg-white'
                            }`}>
                              {treatment.selected && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-[7px] font-semibold text-gray-900 truncate">{treatment.name}</p>
                                {treatment.popular && (
                                  <span className="px-1 py-0.5 bg-[#7B2D8E] text-white text-[4px] font-bold rounded flex-shrink-0">
                                    Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-[5px] text-gray-500">{treatment.duration}</p>
                            </div>
                          </div>
                          <p className="text-[7px] font-bold text-[#7B2D8E] flex-shrink-0">{treatment.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Continue Button */}
                  <div className="px-2.5 pb-2">
                    <button className="w-full py-1.5 bg-[#7B2D8E] text-white rounded text-[7px] font-semibold flex items-center justify-center gap-0.5">
                      Continue
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="relative flex-shrink-0 w-[28%] max-w-[120px] transform rotate-2 -ml-6 md:-ml-10">
              <div className="bg-[#1a1a1a] rounded-[12px] md:rounded-[16px] p-0.5 md:p-1 shadow-2xl">
                <div className="bg-white rounded-[10px] md:rounded-[14px] overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="h-3 bg-white relative flex items-center justify-center">
                    <div className="w-8 h-2.5 bg-[#1a1a1a] rounded-full absolute top-0" />
                  </div>
                  
                  {/* App Header */}
                  <div className="bg-[#7B2D8E] px-2 pb-2">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-3.5 h-3.5 rounded bg-white/20 flex items-center justify-center overflow-hidden">
                        <Image 
                          src="/images/dermaspace-logo.png" 
                          alt="Dermaspace" 
                          width={10} 
                          height={10}
                          className="object-contain"
                        />
                      </div>
                      <p className="text-[6px] font-bold text-white">My Bookings</p>
                    </div>
                    
                    {/* Stats Card */}
                    <div className="bg-white/15 rounded p-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[5px] text-white/70">This Month</p>
                          <p className="text-sm font-bold text-white">3</p>
                        </div>
                        <div className="flex items-end gap-px">
                          {[20, 35, 25, 40, 30].map((h, i) => (
                            <div 
                              key={i} 
                              className="w-1 rounded-t bg-white/40" 
                              style={{ height: `${h * 0.2}px` }} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-1.5 bg-[#FAFAFA]">
                    {/* Appointments */}
                    <div className="space-y-1">
                      {[
                        { service: 'Facial', time: 'Today', status: 'Confirmed' },
                        { service: 'Massage', time: 'Tomorrow', status: 'Pending' },
                      ].map((apt, i) => (
                        <div key={i} className="bg-white rounded p-1 border border-gray-100">
                          <div className="flex items-center justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-[6px] font-semibold text-gray-900 truncate">{apt.service}</p>
                              <p className="text-[5px] text-gray-500">{apt.time}</p>
                            </div>
                            <span className={`text-[4px] font-semibold px-1 py-0.5 rounded-full flex-shrink-0 ${
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
                    
                    {/* Book Button */}
                    <button className="w-full mt-1 py-1 bg-[#7B2D8E] text-white rounded text-[5px] font-semibold">
                      Book Now
                    </button>
                  </div>
                  
                  {/* Bottom Nav */}
                  <div className="bg-white border-t border-gray-100 px-1 py-0.5">
                    <div className="flex items-center justify-around">
                      {[
                        { icon: Home, active: true },
                        { icon: Search, active: false },
                        { icon: Calendar, active: false },
                        { icon: Gift, active: false },
                      ].map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                            item.active ? 'bg-[#7B2D8E]' : ''
                          }`}>
                            <item.icon className={`w-2 h-2 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="h-2 flex items-center justify-center bg-white">
                    <div className="w-6 h-0.5 bg-[#1a1a1a] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Row */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 px-4 transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
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
        <div className={`flex flex-wrap gap-4 mt-10 px-4 transition-all duration-700 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
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
