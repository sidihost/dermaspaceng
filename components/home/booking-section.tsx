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
    <section className="py-20 md:py-28 bg-gradient-to-b from-white via-[#FDFBFE] to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments, purchase gift vouchers, and manage your visits."
        />

        {/* Premium Mockups Display */}
        <div className={`relative mt-12 md:mt-16 transition-all duration-1000 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}>
          
          {/* Decorative Elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[500px] bg-gradient-to-r from-[#7B2D8E]/5 via-[#9B4DB0]/10 to-[#7B2D8E]/5 rounded-full blur-3xl" />
          </div>
          
          {/* Floating Particles */}
          <div className="absolute top-10 left-1/4 w-3 h-3 bg-[#7B2D8E]/20 rounded-full animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-2 h-2 bg-[#9B4DB0]/30 rounded-full animate-pulse delay-300" />
          <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-[#7B2D8E]/10 rounded-full animate-pulse delay-500" />
          
          {/* Devices Container */}
          <div className="relative flex items-center justify-center min-h-[380px] md:min-h-[440px]">
            
            {/* Desktop Browser Mockup */}
            <div className="absolute left-1/2 -translate-x-[58%] md:-translate-x-[55%] w-[320px] md:w-[420px] transform -rotate-2 z-10">
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[#7B2D8E]/20 via-[#9B4DB0]/20 to-[#7B2D8E]/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
                
                <div className="relative bg-white rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(123,45,142,0.15)] border border-gray-200/50">
                  {/* Browser Chrome */}
                  <div className="bg-gradient-to-b from-gray-100 to-gray-50 px-4 py-3 flex items-center gap-3 border-b border-gray-200/60">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#7B2D8E]" />
                      <div className="w-3 h-3 rounded-full bg-[#9B4DB0]" />
                      <div className="w-3 h-3 rounded-full bg-[#C48DD0]" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-lg px-4 py-1.5 text-[10px] text-gray-400 border border-gray-200/80 shadow-inner">
                        dermaspaceng.com/booking
                      </div>
                    </div>
                  </div>
                  
                  {/* App Content */}
                  <div className="bg-white">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#7B2D8E] to-[#8B3D9E] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                          <Image src="/images/dermaspace-logo.png" alt="Dermaspace" width={24} height={24} className="object-contain" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Book Appointment</p>
                          <p className="text-[10px] text-white/70">Select your preferred treatment</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Steps */}
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        {[
                          { num: 1, label: 'Service', active: true },
                          { num: 2, label: 'Schedule', active: false },
                          { num: 3, label: 'Confirm', active: false },
                        ].map((step, idx) => (
                          <div key={step.num} className="flex items-center">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step.active 
                                  ? 'bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/30' 
                                  : 'bg-gray-200 text-gray-500'
                              }`}>
                                {step.num}
                              </div>
                              <span className={`text-[9px] mt-1 font-medium ${step.active ? 'text-[#7B2D8E]' : 'text-gray-400'}`}>
                                {step.label}
                              </span>
                            </div>
                            {idx < 2 && (
                              <div className="w-12 md:w-20 h-0.5 bg-gray-200 mx-2 md:mx-4 rounded-full overflow-hidden">
                                {idx === 0 && <div className="w-1/2 h-full bg-[#7B2D8E]" />}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Category Pills */}
                    <div className="px-5 py-3 flex gap-2 overflow-hidden">
                      {['Facial', 'Body', 'Nails', 'Waxing'].map((cat, i) => (
                        <span
                          key={cat}
                          className={`px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                            i === 0 
                              ? 'bg-[#7B2D8E] text-white shadow-md shadow-[#7B2D8E]/20' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    
                    {/* Treatment Cards */}
                    <div className="px-5 pb-4 space-y-2">
                      {[
                        { name: 'Signature Glow Facial', time: '90 min', price: '₦45,000', popular: true, selected: true },
                        { name: 'Hydrafacial Treatment', time: '75 min', price: '₦35,000', popular: true, selected: false },
                        { name: 'Deep Cleansing Facial', time: '60 min', price: '₦20,000', popular: false, selected: false },
                      ].map((t) => (
                        <div 
                          key={t.name} 
                          className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                            t.selected 
                              ? 'border-[#7B2D8E] bg-[#7B2D8E]/5 shadow-sm' 
                              : 'border-gray-100 hover:border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            t.selected 
                              ? 'bg-[#7B2D8E] border-[#7B2D8E]' 
                              : 'border-gray-300'
                          }`}>
                            {t.selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                              {t.popular && (
                                <span className="px-1.5 py-0.5 bg-[#7B2D8E] text-white text-[8px] font-bold rounded">
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500">{t.time}</p>
                          </div>
                          <p className="text-sm font-bold text-[#7B2D8E]">{t.price}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Continue Button */}
                    <div className="px-5 pb-5">
                      <button className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#7B2D8E] to-[#8B3D9E] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#7B2D8E]/25 hover:shadow-xl transition-all">
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="absolute left-1/2 translate-x-[5%] md:translate-x-[15%] w-[160px] md:w-[200px] transform rotate-3 z-20">
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-[#7B2D8E]/30 via-[#9B4DB0]/30 to-[#7B2D8E]/30 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
                
                <div className="relative bg-[#1a1a1a] rounded-[28px] md:rounded-[36px] p-1.5 md:p-2 shadow-[0_25px_80px_rgba(0,0,0,0.3)]">
                  <div className="bg-white rounded-[24px] md:rounded-[32px] overflow-hidden">
                    {/* Dynamic Island */}
                    <div className="h-6 md:h-8 bg-white flex items-start justify-center pt-1.5">
                      <div className="w-20 md:w-24 h-5 md:h-6 bg-[#1a1a1a] rounded-full" />
                    </div>
                    
                    {/* App Header */}
                    <div className="bg-gradient-to-r from-[#7B2D8E] to-[#8B3D9E] px-4 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                          <Image src="/images/dermaspace-logo.png" alt="Dermaspace" width={20} height={20} className="object-contain" />
                        </div>
                        <p className="text-sm md:text-base font-bold text-white">My Bookings</p>
                      </div>
                      
                      {/* Stats Card */}
                      <div className="bg-white/15 backdrop-blur rounded-xl p-3">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[10px] text-white/60">This Month</p>
                            <p className="text-2xl md:text-3xl font-bold text-white leading-none">3</p>
                          </div>
                          <div className="flex items-end gap-1">
                            {[30, 50, 35, 60, 45].map((h, i) => (
                              <div 
                                key={i} 
                                className="w-2 rounded-t bg-white/40" 
                                style={{ height: `${h * 0.5}px` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-3 md:p-4 space-y-2 md:space-y-3 bg-gray-50">
                      {[
                        { name: 'Signature Facial', time: 'Today, 10:00 AM', status: 'Confirmed' },
                        { name: 'Body Massage', time: 'Tomorrow, 2:30 PM', status: 'Pending' },
                      ].map((apt, i) => (
                        <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] md:text-xs font-semibold text-gray-900">{apt.name}</p>
                              <p className="text-[9px] md:text-[10px] text-gray-500">{apt.time}</p>
                            </div>
                            <span className={`text-[8px] md:text-[9px] font-bold px-2 py-1 rounded-full ${
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
                      <div className="bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <Gift className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs font-semibold text-white">Gift Vouchers</p>
                            <p className="text-[8px] md:text-[9px] text-white/70">Give the gift of glow</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Book Button */}
                      <button className="w-full py-2.5 bg-[#7B2D8E] text-white rounded-xl text-[11px] md:text-xs font-bold shadow-lg shadow-[#7B2D8E]/20">
                        Book New Appointment
                      </button>
                    </div>
                    
                    {/* Bottom Navigation */}
                    <div className="bg-[#7B2D8E] pt-3 pb-2 px-3 rounded-t-2xl">
                      <div className="flex items-end justify-around">
                        {/* Home - Active */}
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <Home className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-[8px] text-white mt-1">Home</span>
                        </div>
                        
                        {/* Services */}
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 flex items-center justify-center">
                            <div className="grid grid-cols-2 gap-0.5">
                              {[1,2,3,4].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/60" />
                              ))}
                            </div>
                          </div>
                          <span className="text-[8px] text-white/70 mt-1">Services</span>
                        </div>
                        
                        {/* Search - Elevated */}
                        <div className="flex flex-col items-center -mt-4">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                            <Search className="w-5 h-5 text-[#7B2D8E]" />
                          </div>
                          <span className="text-[8px] text-white mt-1">Search</span>
                        </div>
                        
                        {/* Packages */}
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 flex items-center justify-center">
                            <Gift className="w-4 h-4 text-white/60" />
                          </div>
                          <span className="text-[8px] text-white/70 mt-1">Packages</span>
                        </div>
                        
                        {/* Book */}
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-white/60" />
                          </div>
                          <span className="text-[8px] text-white/70 mt-1">Book</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Home Indicator */}
                    <div className="h-5 md:h-6 bg-[#7B2D8E] flex items-center justify-center">
                      <div className="w-24 md:w-28 h-1 bg-white/30 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 md:mt-20 px-4 transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {[
            { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime, anywhere' },
            { icon: Clock, title: 'Real-time Slots', desc: 'See instant availability' },
            { icon: Gift, title: 'Gift Vouchers', desc: 'Give the gift of glow' },
            { icon: Sparkles, title: 'Easy Management', desc: 'Reschedule with ease' },
          ].map((feature) => (
            <div key={feature.title} className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-[#7B2D8E]/20 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2D8E]/10 to-[#9B4DB0]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-5 h-5 text-[#7B2D8E]" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className={`flex flex-wrap gap-4 mt-10 px-4 transition-all duration-700 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <a
            href="tel:+2349017972919"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7B2D8E] to-[#8B3D9E] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#7B2D8E]/25 hover:shadow-xl hover:scale-105 transition-all"
          >
            <Phone className="w-4 h-4" />
            Call to Book
          </a>
          <a
            href="https://wa.me/+2349013134945"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#7B2D8E]/20 text-[#7B2D8E] rounded-xl text-sm font-bold hover:bg-[#7B2D8E]/5 hover:border-[#7B2D8E]/40 transition-all"
          >
            WhatsApp Us
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
