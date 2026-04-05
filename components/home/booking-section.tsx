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
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits."
        />

        {/* Mockups Container */}
        <div className={`relative mt-8 md:mt-12 transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Devices Container */}
          <div className="relative flex items-stretch justify-center">
            
            {/* Desktop Browser Mockup */}
            <div className="relative w-[260px] md:w-[300px] transform -rotate-1 z-10 flex">
              <div className="bg-white rounded-lg overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-200/60 flex-1 flex flex-col">
                {/* Browser Chrome */}
                <div className="bg-[#f5f5f7] px-2 py-1 flex items-center gap-1.5 border-b border-gray-200/60">
                  <div className="flex gap-[5px]">
                    <div className="w-[6px] h-[6px] rounded-full bg-[#7B2D8E]/60" />
                    <div className="w-[6px] h-[6px] rounded-full bg-[#7B2D8E]/40" />
                    <div className="w-[6px] h-[6px] rounded-full bg-[#7B2D8E]/25" />
                  </div>
                  <div className="flex-1 mx-2">
                    <div className="bg-white/80 rounded-sm px-2 py-[2px] text-[5px] text-gray-400 font-medium">
                      dermaspaceng.com/book
                    </div>
                  </div>
                </div>
                
                {/* App Content */}
                <div className="bg-white flex-1 flex flex-col">
                  {/* App Header */}
                  <div className="bg-[#7B2D8E] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center">
                        <Image 
                          src="/images/dermaspace-logo.png" 
                          alt="Dermaspace" 
                          width={14} 
                          height={14}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-[8px] font-semibold text-white leading-tight">Book Appointment</p>
                        <p className="text-[6px] text-white/60">Select your preferred treatment</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress */}
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((step, idx) => (
                        <div key={step} className="flex items-center gap-1">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-semibold ${
                            step === 1 ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {step}
                          </div>
                          {idx < 2 && <div className="w-6 h-[1px] bg-gray-200" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Categories */}
                  <div className="px-3 py-2 flex gap-1">
                    {['Facial', 'Body', 'Nails', 'Waxing'].map((cat, i) => (
                      <span
                        key={cat}
                        className={`px-2 py-[3px] rounded-full text-[6px] font-medium ${
                          i === 0 ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  
                  {/* Treatment List */}
                  <div className="px-3 pb-2 space-y-[6px] flex-1">
                    {[
                      { name: 'Signature Glow Facial', time: '90 min', price: '₦45,000', selected: true },
                      { name: 'Hydrafacial Treatment', time: '75 min', price: '₦35,000', selected: false },
                      { name: 'Deep Cleansing Facial', time: '60 min', price: '₦20,000', selected: false },
                    ].map((t) => (
                      <div
                        key={t.name}
                        className={`flex items-center gap-2 p-2 rounded-md border ${
                          t.selected ? 'border-[#7B2D8E]/40 bg-[#7B2D8E]/[0.03]' : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-[4px] border-[1.5px] flex items-center justify-center ${
                          t.selected ? 'bg-[#7B2D8E] border-[#7B2D8E]' : 'border-gray-300'
                        }`}>
                          {t.selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[7px] font-medium text-gray-900 truncate">{t.name}</p>
                          <p className="text-[6px] text-gray-400">{t.time}</p>
                        </div>
                        <p className="text-[7px] font-semibold text-[#7B2D8E]">{t.price}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Button */}
                  <div className="px-3 pb-3">
                    <div className="flex items-center justify-center gap-1 py-[6px] bg-[#7B2D8E] rounded-md">
                      <span className="text-[7px] font-semibold text-white">Continue</span>
                      <ChevronRight className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Mockup */}
            <div className="relative w-[120px] md:w-[130px] transform rotate-3 -ml-6 md:-ml-8 z-20 flex">
              <div className="bg-[#1a1a1a] rounded-[16px] p-[3px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex-1 flex">
                <div className="bg-white rounded-[14px] overflow-hidden flex-1 flex flex-col">
                  {/* Notch */}
                  <div className="h-4 bg-white flex items-start justify-center">
                    <div className="w-12 h-4 bg-[#1a1a1a] rounded-b-xl" />
                  </div>
                  
                  {/* Header */}
                  <div className="bg-[#7B2D8E] px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center">
                        <Image 
                          src="/images/dermaspace-logo.png" 
                          alt="Dermaspace" 
                          width={12} 
                          height={12}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[7px] font-semibold text-white">My Bookings</span>
                    </div>
                    
                    {/* Stats */}
                    <div className="mt-1.5 bg-white/10 rounded-md p-2">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[6px] text-white/50">This Month</p>
                          <p className="text-base font-bold text-white leading-none">3</p>
                        </div>
                        <div className="flex items-end gap-[3px]">
                          {[5, 9, 6, 11, 8].map((h, i) => (
                            <div key={i} className="w-1 rounded-t-sm bg-white/30" style={{ height: h }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-2.5 space-y-2 bg-gray-50 flex-1 flex flex-col">
                    {[
                      { name: 'Signature Facial', time: 'Today, 10:00 AM', status: 'Confirmed' },
                      { name: 'Body Massage', time: 'Tomorrow, 2:30 PM', status: 'Pending' },
                      { name: 'Nail Treatment', time: 'Sat, 11:00 AM', status: 'Pending' },
                    ].map((apt, i) => (
                      <div key={i} className="bg-white rounded-lg p-2 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[7px] font-medium text-gray-900">{apt.name}</p>
                            <p className="text-[6px] text-gray-400">{apt.time}</p>
                          </div>
                          <span className={`text-[5px] font-semibold px-1.5 py-[3px] rounded-full ${
                            apt.status === 'Confirmed' 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Spacer */}
                    <div className="flex-1" />
                    
                    {/* Book Button */}
                    <div className="flex items-center justify-center py-2 bg-[#7B2D8E] rounded-lg">
                      <span className="text-[7px] font-semibold text-white">Book New Appointment</span>
                    </div>
                  </div>
                  
                  {/* Nav */}
                  <div className="bg-white border-t border-gray-100 py-1.5 px-3">
                    <div className="flex justify-around">
                      {[Home, Search, Calendar, Gift].map((Icon, i) => (
                        <div key={i} className={`w-5 h-5 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-[#7B2D8E]' : ''}`}>
                          <Icon className={`w-3 h-3 ${i === 0 ? 'text-white' : 'text-gray-300'}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="h-3 bg-white flex items-center justify-center">
                    <div className="w-10 h-1 bg-[#1a1a1a] rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-10 md:mt-14 transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {[
            { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime, anywhere' },
            { icon: Clock, title: 'Real-time Slots', desc: 'See instant availability' },
            { icon: Gift, title: 'Gift Vouchers', desc: 'Give the gift of glow' },
            { icon: Check, title: 'Easy Management', desc: 'Reschedule with ease' },
          ].map((feature) => (
            <div key={feature.title} className="bg-gray-50 rounded-xl p-4">
              <div className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-3">
                <feature.icon className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`flex flex-wrap gap-3 mt-8 transition-all duration-700 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <a
            href="tel:+2349017972919"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white rounded-lg text-sm font-semibold hover:bg-[#6A2679] transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call to Book
          </a>
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E]/10 text-[#7B2D8E] rounded-lg text-sm font-semibold hover:bg-[#7B2D8E]/15 transition-colors"
          >
            WhatsApp Us
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
