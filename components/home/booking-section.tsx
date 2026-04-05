'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, Gift, Home, Search, ChevronRight, Sparkles } from 'lucide-react'
import Image from 'next/image'
import SectionHeader from '@/components/shared/section-header'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="py-16 md:py-24 bg-[#FAFAFA] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits."
        />

        {/* Mockups Display - Both Desktop and Mobile Views */}
        <div className={`mt-12 transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Mockups Container */}
          <div className="flex items-center justify-center gap-4 md:gap-8">
            
            {/* Desktop Browser Mockup - Hidden on small mobile */}
            <div className="hidden sm:block w-[240px] md:w-[320px] lg:w-[380px] transform -rotate-1 flex-shrink-0">
              <div className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100">
                {/* Browser Chrome */}
                <div className="bg-[#F5F5F5] px-3 py-2 flex items-center gap-2 border-b border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/60" />
                    <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/40" />
                    <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/20" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white rounded-md px-3 py-1 text-[8px] text-gray-400 border border-gray-100">
                      dermaspaceng.com/booking
                    </div>
                  </div>
                </div>
                
                {/* App Content */}
                <div className="bg-white">
                  {/* Header */}
                  <div className="bg-[#7B2D8E] px-3 md:px-4 py-2.5 md:py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-md bg-white/15 flex items-center justify-center">
                        <Image src="/images/dermaspace-logo.png" alt="Dermaspace" width={14} height={14} className="object-contain" />
                      </div>
                      <div>
                        <p className="text-[9px] md:text-[10px] font-bold text-white">Book Appointment</p>
                        <p className="text-[7px] md:text-[8px] text-white/70">Select your treatment</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Steps */}
                  <div className="px-3 md:px-4 py-2.5 border-b border-gray-50">
                    <div className="flex items-center justify-center gap-2 md:gap-3">
                      {[1, 2, 3].map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-bold ${
                            step === 1 ? 'bg-[#7B2D8E] text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {step}
                          </div>
                          {idx < 2 && <div className="w-6 md:w-10 h-px bg-gray-100 mx-1.5" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Category Pills */}
                  <div className="px-3 md:px-4 py-2 flex gap-1">
                    {['Facial', 'Body', 'Nails', 'Waxing'].map((cat, i) => (
                      <span
                        key={cat}
                        className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[7px] md:text-[8px] font-medium ${
                          i === 0 ? 'bg-[#7B2D8E] text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'
                        }`}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                  
                  {/* Treatment Cards */}
                  <div className="px-3 md:px-4 pb-2.5 space-y-1.5">
                    {[
                      { name: 'Signature Glow Facial', time: '90 min', price: '₦45,000', selected: true, popular: true },
                      { name: 'Hydrafacial Treatment', time: '75 min', price: '₦35,000', selected: false, popular: true },
                      { name: 'Deep Cleansing', time: '60 min', price: '₦20,000', selected: false, popular: false },
                    ].map((t) => (
                      <div 
                        key={t.name} 
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                          t.selected ? 'border-[#7B2D8E] bg-[#7B2D8E]/5' : 'border-gray-50 hover:border-gray-100'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          t.selected ? 'bg-[#7B2D8E] border-[#7B2D8E]' : 'border-gray-200'
                        }`}>
                          {t.selected && <Check className="w-2 h-2 md:w-2.5 md:h-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-[8px] md:text-[9px] font-semibold text-gray-900 truncate">{t.name}</p>
                            {t.popular && <span className="text-[5px] md:text-[6px] font-bold px-1 py-0.5 bg-[#7B2D8E] text-white rounded">Popular</span>}
                          </div>
                          <p className="text-[6px] md:text-[7px] text-gray-400">{t.time}</p>
                        </div>
                        <p className="text-[8px] md:text-[9px] font-bold text-[#7B2D8E] flex-shrink-0">{t.price}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Continue Button */}
                  <div className="px-3 md:px-4 pb-3">
                    <button className="w-full flex items-center justify-center gap-1 py-2 bg-[#7B2D8E] text-white rounded-lg text-[8px] md:text-[9px] font-bold hover:bg-[#6B2D7E] transition-colors">
                      Continue <ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup - Frameless Style */}
            <div className="w-[180px] sm:w-[140px] md:w-[160px] lg:w-[180px] transform sm:rotate-2 flex-shrink-0">
              {/* Clean frameless design - just screen with shadow */}
              <div className="bg-white rounded-[24px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100">
                {/* Status Bar - Subtle */}
                <div className="h-6 sm:h-5 bg-[#7B2D8E] flex items-center justify-center">
                  <div className="w-16 sm:w-12 h-4 sm:h-3 bg-black/20 rounded-full" />
                </div>
                
                {/* App Header */}
                <div className="bg-[#7B2D8E] px-3 sm:px-2.5 pb-3 sm:pb-2.5">
                  <div className="flex items-center gap-2 sm:gap-1.5 mb-2 sm:mb-1.5">
                    <div className="w-7 h-7 sm:w-5 sm:h-5 rounded-lg sm:rounded-md bg-white/15 flex items-center justify-center">
                      <Image src="/images/dermaspace-logo.png" alt="Dermaspace" width={16} height={16} className="object-contain sm:w-3 sm:h-3" />
                    </div>
                    <p className="text-xs sm:text-[9px] font-bold text-white">My Bookings</p>
                  </div>
                  
                  {/* Stats */}
                  <div className="bg-white/15 rounded-lg sm:rounded-md p-2.5 sm:p-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[8px] sm:text-[6px] text-white/60">This Month</p>
                        <p className="text-xl sm:text-base font-bold text-white leading-none">3</p>
                      </div>
                      <div className="flex items-end gap-0.5">
                        {[4, 7, 5, 9, 6].map((h, i) => (
                          <div key={i} className="w-1.5 sm:w-1 rounded-t bg-white/40" style={{ height: `${h * 2}px` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-3 sm:p-2 space-y-2 sm:space-y-1.5 bg-gray-50">
                  {[
                    { name: 'Signature Facial', time: 'Today, 10:00 AM', status: 'Confirmed' },
                    { name: 'Body Massage', time: 'Tomorrow, 2:30 PM', status: 'Pending' },
                  ].map((apt, i) => (
                    <div key={i} className="bg-white rounded-xl sm:rounded-lg p-2.5 sm:p-2 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] sm:text-[8px] font-semibold text-gray-900">{apt.name}</p>
                          <p className="text-[8px] sm:text-[6px] text-gray-400">{apt.time}</p>
                        </div>
                        <span className={`text-[7px] sm:text-[5px] font-bold px-2 sm:px-1.5 py-0.5 rounded-full ${
                          apt.status === 'Confirmed' ? 'bg-[#7B2D8E] text-white' : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Book Button */}
                  <button className="w-full py-2 sm:py-1.5 bg-[#7B2D8E] text-white rounded-xl sm:rounded-lg text-[9px] sm:text-[7px] font-bold hover:bg-[#6B2D7E] transition-colors">
                    Book New Appointment
                  </button>
                </div>
                
                {/* Bottom Navigation - Clean Design */}
                <div className="bg-[#7B2D8E] pt-2.5 sm:pt-2 pb-2 sm:pb-1.5 px-3 sm:px-2">
                  <div className="flex items-end justify-around">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 sm:w-5 sm:h-5 rounded-lg sm:rounded-md bg-white/20 flex items-center justify-center">
                        <Home className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5 text-white" />
                      </div>
                      <span className="text-[7px] sm:text-[5px] text-white mt-0.5">Home</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center">
                        <div className="grid grid-cols-2 gap-0.5">
                          {[1,2,3,4].map(i => <div key={i} className="w-1 h-1 sm:w-0.5 sm:h-0.5 rounded-full bg-white/60" />)}
                        </div>
                      </div>
                      <span className="text-[7px] sm:text-[5px] text-white/70 mt-0.5">Services</span>
                    </div>
                    <div className="flex flex-col items-center -mt-3 sm:-mt-2">
                      <div className="w-10 h-10 sm:w-7 sm:h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <Search className="w-4 h-4 sm:w-3 sm:h-3 text-[#7B2D8E]" />
                      </div>
                      <span className="text-[7px] sm:text-[5px] text-white mt-0.5">Search</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center">
                        <Gift className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5 text-white/60" />
                      </div>
                      <span className="text-[7px] sm:text-[5px] text-white/70 mt-0.5">Packages</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5 text-white/60" />
                      </div>
                      <span className="text-[7px] sm:text-[5px] text-white/70 mt-0.5">Book</span>
                    </div>
                  </div>
                </div>
                
                {/* Home Indicator */}
                <div className="h-4 sm:h-3 bg-[#7B2D8E] flex items-center justify-center">
                  <div className="w-12 sm:w-10 h-1 sm:h-0.5 bg-white/30 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 md:mt-12 transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {[
            { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime' },
            { icon: Clock, title: 'Real-time Slots', desc: 'See availability' },
            { icon: Gift, title: 'Gift Vouchers', desc: 'Gift of glow' },
            { icon: Sparkles, title: 'Easy Manage', desc: 'Reschedule easy' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white border border-gray-100 rounded-xl p-3 md:p-4 hover:shadow-md hover:border-[#7B2D8E]/20 transition-all">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center mb-2">
                <feature.icon className="w-4 h-4 text-[#7B2D8E]" />
              </div>
              <h3 className="text-xs font-bold text-gray-900 mb-0.5">{feature.title}</h3>
              <p className="text-[10px] text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className={`flex flex-wrap gap-3 mt-8 transition-all duration-700 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <a
            href="tel:+2349017972919"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7B2D8E] text-white rounded-lg text-sm font-semibold hover:bg-[#6B2D7E] transition-colors"
          >
            <Phone className="w-4 h-4" />
            Call to Book
          </a>
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#7B2D8E] border border-[#7B2D8E] rounded-lg text-sm font-semibold hover:bg-[#7B2D8E]/5 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            WhatsApp Us
          </a>
        </div>
      </div>
    </section>
  )
}
