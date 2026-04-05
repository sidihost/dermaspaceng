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
          
          {/* Devices Container - Fixed Height */}
          <div className="relative flex items-center justify-center h-[220px] md:h-[260px]">
            
            {/* Desktop Browser Mockup */}
            <div className="absolute left-1/2 -translate-x-[55%] w-[220px] md:w-[260px] transform -rotate-2">
              <div className="bg-white rounded-md overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.1)] border border-gray-200/80">
                {/* Browser Chrome */}
                <div className="bg-[#f5f5f7] px-2 py-[5px] flex items-center gap-1 border-b border-gray-200/60">
                  <div className="flex gap-1">
                    <div className="w-[5px] h-[5px] rounded-full bg-[#7B2D8E]/60" />
                    <div className="w-[5px] h-[5px] rounded-full bg-[#7B2D8E]/40" />
                    <div className="w-[5px] h-[5px] rounded-full bg-[#7B2D8E]/25" />
                  </div>
                  <div className="flex-1 mx-1">
                    <div className="bg-white/80 rounded-sm px-1.5 py-[1px] text-[4px] text-gray-400">
                      dermaspaceng.com/book
                    </div>
                  </div>
                </div>
                
                {/* App Content */}
                <div className="bg-white">
                  {/* Header */}
                  <div className="bg-[#7B2D8E] px-2 py-[6px]">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-white/15 flex items-center justify-center">
                        <Image src="/images/dermaspace-logo.png" alt="Dermaspace" width={8} height={8} className="object-contain" />
                      </div>
                      <p className="text-[5px] font-semibold text-white">Book Appointment</p>
                    </div>
                  </div>
                  
                  {/* Progress */}
                  <div className="px-2 py-[5px] border-b border-gray-100 flex items-center gap-[3px]">
                    {[1, 2, 3].map((step, idx) => (
                      <div key={step} className="flex items-center gap-[3px]">
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[5px] font-semibold ${step === 1 ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {step}
                        </div>
                        {idx < 2 && <div className="w-4 h-[1px] bg-gray-200" />}
                      </div>
                    ))}
                  </div>
                  
                  {/* Categories */}
                  <div className="px-2 py-[5px] flex gap-[3px]">
                    {['Facial', 'Body', 'Nails'].map((cat, i) => (
                      <span key={cat} className={`px-[5px] py-[2px] rounded-full text-[4px] font-medium ${i === 0 ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {cat}
                      </span>
                    ))}
                  </div>
                  
                  {/* Treatments */}
                  <div className="px-2 pb-[6px] space-y-[4px]">
                    {[
                      { name: 'Signature Glow Facial', time: '90 min', price: '₦45,000', selected: true },
                      { name: 'Hydrafacial Treatment', time: '75 min', price: '₦35,000', selected: false },
                    ].map((t) => (
                      <div key={t.name} className={`flex items-center gap-1 p-[5px] rounded border ${t.selected ? 'border-[#7B2D8E]/30 bg-[#7B2D8E]/5' : 'border-gray-100'}`}>
                        <div className={`w-[10px] h-[10px] rounded-sm border flex items-center justify-center ${t.selected ? 'bg-[#7B2D8E] border-[#7B2D8E]' : 'border-gray-300'}`}>
                          {t.selected && <Check className="w-[6px] h-[6px] text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[5px] font-medium text-gray-900 truncate">{t.name}</p>
                          <p className="text-[4px] text-gray-400">{t.time}</p>
                        </div>
                        <p className="text-[5px] font-semibold text-[#7B2D8E]">{t.price}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Button */}
                  <div className="px-2 pb-2">
                    <div className="flex items-center justify-center gap-[2px] py-[4px] bg-[#7B2D8E] rounded-sm">
                      <span className="text-[5px] font-semibold text-white">Continue</span>
                      <ChevronRight className="w-[8px] h-[8px] text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Mockup */}
            <div className="absolute left-1/2 -translate-x-[20%] w-[90px] md:w-[100px] transform rotate-3">
              <div className="bg-[#1a1a1a] rounded-[10px] p-[2px] shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                <div className="bg-white rounded-[8px] overflow-hidden">
                  {/* Notch */}
                  <div className="h-[10px] bg-white flex items-start justify-center">
                    <div className="w-8 h-[10px] bg-[#1a1a1a] rounded-b-lg" />
                  </div>
                  
                  {/* Header */}
                  <div className="bg-[#7B2D8E] px-[6px] py-[5px]">
                    <div className="flex items-center gap-1">
                      <div className="w-[10px] h-[10px] rounded bg-white/15 flex items-center justify-center">
                        <Image src="/images/dermaspace-logo.png" alt="Dermaspace" width={6} height={6} className="object-contain" />
                      </div>
                      <span className="text-[4px] font-semibold text-white">My Bookings</span>
                    </div>
                    
                    {/* Stats */}
                    <div className="mt-1 bg-white/10 rounded p-[4px]">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[3px] text-white/50">This Month</p>
                          <p className="text-[10px] font-bold text-white leading-none">3</p>
                        </div>
                        <div className="flex items-end gap-[1px]">
                          {[3, 5, 4, 6, 5].map((h, i) => (
                            <div key={i} className="w-[2px] rounded-t-sm bg-white/30" style={{ height: h }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-[6px] space-y-[4px] bg-gray-50">
                    {[
                      { name: 'Facial', time: 'Today', status: 'Done' },
                      { name: 'Massage', time: 'Fri', status: 'Soon' },
                    ].map((apt, i) => (
                      <div key={i} className="bg-white rounded p-[4px] border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[4px] font-medium text-gray-900">{apt.name}</p>
                            <p className="text-[3px] text-gray-400">{apt.time}</p>
                          </div>
                          <span className={`text-[3px] font-semibold px-1 py-[1px] rounded-full ${apt.status === 'Done' ? 'bg-[#7B2D8E] text-white' : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'}`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Book Button */}
                    <div className="flex items-center justify-center py-[3px] bg-[#7B2D8E] rounded">
                      <span className="text-[4px] font-semibold text-white">Book New</span>
                    </div>
                  </div>
                  
                  {/* Bottom Nav - Matching actual design */}
                  <div className="bg-[#7B2D8E] rounded-t-lg py-[5px] px-[4px]">
                    <div className="flex justify-around items-end">
                      {/* Home */}
                      <div className="flex flex-col items-center">
                        <div className="w-[10px] h-[10px] rounded bg-white/15 flex items-center justify-center">
                          <Home className="w-[6px] h-[6px] text-white" />
                        </div>
                        <span className="text-[3px] text-white/70 mt-[1px]">Home</span>
                      </div>
                      {/* Services */}
                      <div className="flex flex-col items-center">
                        <div className="w-[10px] h-[10px] flex items-center justify-center">
                          <div className="grid grid-cols-2 gap-[1px]">
                            <div className="w-[2px] h-[2px] rounded-full bg-white/70" />
                            <div className="w-[2px] h-[2px] rounded-full bg-white/70" />
                            <div className="w-[2px] h-[2px] rounded-full bg-white/70" />
                            <div className="w-[2px] h-[2px] rounded-full bg-white/70" />
                          </div>
                        </div>
                        <span className="text-[3px] text-white/70 mt-[1px]">Services</span>
                      </div>
                      {/* Search - Elevated */}
                      <div className="flex flex-col items-center -mt-[6px]">
                        <div className="w-[14px] h-[14px] rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Search className="w-[7px] h-[7px] text-[#7B2D8E]" />
                        </div>
                        <span className="text-[3px] text-white/70 mt-[1px]">Search</span>
                      </div>
                      {/* Packages */}
                      <div className="flex flex-col items-center">
                        <div className="w-[10px] h-[10px] flex items-center justify-center">
                          <Gift className="w-[6px] h-[6px] text-white/70" />
                        </div>
                        <span className="text-[3px] text-white/70 mt-[1px]">Packages</span>
                      </div>
                      {/* Book */}
                      <div className="flex flex-col items-center">
                        <div className="w-[10px] h-[10px] flex items-center justify-center">
                          <Calendar className="w-[6px] h-[6px] text-white/70" />
                        </div>
                        <span className="text-[3px] text-white/70 mt-[1px]">Book</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="h-[5px] bg-[#7B2D8E] flex items-center justify-center rounded-b-lg">
                    <div className="w-4 h-[2px] bg-white/30 rounded-full" />
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
