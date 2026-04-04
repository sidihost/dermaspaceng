'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, ChevronLeft, ChevronRight, Bell, Gift, CreditCard, Sparkles, Star, Home, User, Search } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import Image from 'next/image'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const appointments = [
    { time: '9:00 AM', service: 'Signature Facial', client: 'Amara O.', status: 'confirmed' },
    { time: '10:30 AM', service: 'Carbon Laser Peel', client: 'Chioma K.', status: 'confirmed' },
    { time: '12:00 PM', service: 'Hydrafacial', client: 'Sarah M.', status: 'pending' },
    { time: '2:00 PM', service: 'Body Massage', client: 'Blessing A.', status: 'confirmed' },
    { time: '3:30 PM', service: 'Luxury Facial', client: 'Gift E.', status: 'confirmed' },
  ]

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
          {/* Left - Device Mockups on colored background */}
          <div className={`relative transition-all duration-700 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            {/* Purple tinted background container */}
            <div className="relative bg-gradient-to-br from-[#7B2D8E]/[0.08] via-[#7B2D8E]/[0.05] to-[#7B2D8E]/[0.03] rounded-3xl p-6 md:p-8 lg:p-10 min-h-[400px] md:min-h-[480px]">
              
              {/* Desktop Browser Mockup - Tilted */}
              <div className="absolute left-4 md:left-6 lg:left-8 top-8 md:top-10 w-[280px] sm:w-[320px] md:w-[340px] transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-xl overflow-hidden border border-[#7B2D8E]/15">
                  {/* Browser Chrome */}
                  <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b border-gray-100">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/15" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/10" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded px-3 py-1 text-[9px] text-gray-400 border border-gray-200 flex items-center gap-1.5">
                        <svg className="w-2.5 h-2.5 text-[#7B2D8E]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        dermaspaceng.com/booking
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard Layout */}
                  <div className="flex">
                    {/* Sidebar */}
                    <div className="w-[70px] bg-white border-r border-gray-100 py-3 px-2 hidden sm:block">
                      <div className="flex items-center gap-1.5 px-1.5 mb-4">
                        <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center bg-[#7B2D8E]/10">
                          <Image 
                            src="/images/dermaspace-logo.png" 
                            alt="Dermaspace" 
                            width={16} 
                            height={16}
                            className="object-contain"
                          />
                        </div>
                      </div>
                      
                      {/* Nav Items */}
                      <div className="space-y-1">
                        {[
                          { icon: Home, label: 'Home', active: false },
                          { icon: Calendar, label: 'Appointments', active: true },
                          { icon: Gift, label: 'Vouchers', active: false },
                          { icon: User, label: 'Clients', active: false },
                          { icon: CreditCard, label: 'Payments', active: false },
                        ].map((item) => (
                          <div 
                            key={item.label}
                            className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[7px] font-medium ${
                              item.active 
                                ? 'bg-[#7B2D8E] text-white' 
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <item.icon className="w-3 h-3" />
                            <span className="truncate">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Main Content - Calendar View */}
                    <div className="flex-1 p-3 bg-gray-50/50">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-900">Calendar</p>
                          <p className="text-[8px] text-gray-500">April 2026</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button className="px-2 py-1 bg-[#7B2D8E] text-white rounded text-[7px] font-medium flex items-center gap-1">
                            <span>+</span> New Booking
                          </button>
                        </div>
                      </div>
                      
                      {/* Week View Header */}
                      <div className="grid grid-cols-7 gap-0.5 mb-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                          <div key={day} className="text-center">
                            <p className="text-[7px] text-gray-400 font-medium">{day}</p>
                            <p className={`text-[9px] font-semibold mt-0.5 w-5 h-5 rounded-full flex items-center justify-center mx-auto ${
                              idx === 3 ? 'bg-[#7B2D8E] text-white' : 'text-gray-700'
                            }`}>
                              {14 + idx}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      {/* Appointments List */}
                      <div className="space-y-1">
                        {appointments.map((apt, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center gap-2 p-1.5 rounded-lg bg-white border-l-2 ${
                              apt.status === 'confirmed' ? 'border-l-[#7B2D8E]' : 'border-l-amber-400'
                            }`}
                          >
                            <div className="text-[7px] text-gray-400 w-12 shrink-0">{apt.time}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-semibold text-gray-900 truncate">{apt.service}</p>
                              <p className="text-[7px] text-gray-500">{apt.client}</p>
                            </div>
                            <div className={`px-1.5 py-0.5 rounded text-[6px] font-medium ${
                              apt.status === 'confirmed' 
                                ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]' 
                                : 'bg-amber-50 text-amber-600'
                            }`}>
                              {apt.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Phone Mockup - Overlapping */}
              <div className="absolute right-4 md:right-6 lg:right-8 bottom-4 md:bottom-6 w-[140px] sm:w-[160px] md:w-[170px] transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-[28px] overflow-hidden border border-[#7B2D8E]/15">
                  {/* Phone Status Bar & Notch */}
                  <div className="h-6 bg-white flex items-center justify-center relative px-4">
                    <div className="absolute left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1a1a1a] rounded-full top-1" />
                    <span className="text-[8px] text-gray-900 font-medium absolute left-3 top-1.5">9:41</span>
                  </div>
                  
                  {/* App Header */}
                  <div className="bg-[#7B2D8E] px-3 pt-1 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white text-[10px] font-semibold">My Dashboard</p>
                      <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                        <Bell className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                    
                    {/* Stats Card */}
                    <div className="bg-white/15 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[7px] text-white/70">Total Bookings</span>
                        <span className="text-[7px] text-white/70">This Month</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-bold text-white">24</span>
                        {/* Mini Chart */}
                        <div className="flex items-end gap-0.5">
                          {[35, 55, 40, 70, 50, 80, 65].map((h, i) => (
                            <div 
                              key={i} 
                              className="w-2 bg-white/40 rounded-t"
                              style={{ height: `${h * 0.3}px` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-2.5 bg-gray-50 min-h-[140px]">
                    <p className="text-[8px] font-semibold text-gray-900 mb-2">Upcoming</p>
                    
                    {/* Appointment Cards */}
                    {[
                      { service: 'Signature Facial', time: 'Today, 2:00 PM' },
                      { service: 'Carbon Peel', time: 'Apr 18, 10:00 AM' },
                    ].map((apt, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg mb-1.5 border border-gray-100">
                        <div className="w-7 h-7 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-[#7B2D8E]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-semibold text-gray-900 truncate">{apt.service}</p>
                          <p className="text-[6px] text-[#7B2D8E]">{apt.time}</p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Voucher Banner */}
                    <div className="mt-2 bg-gradient-to-r from-[#7B2D8E] to-[#9B4DB0] rounded-lg p-2 relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-10 h-10 bg-white/10 rounded-full -mr-5 -mt-5" />
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-white" />
                        <div>
                          <p className="text-[8px] font-semibold text-white">Gift Vouchers</p>
                          <p className="text-[6px] text-white/70">Give the gift of glow</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom Navigation */}
                  <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center justify-around">
                    {[
                      { icon: Home, active: true },
                      { icon: Calendar, active: false },
                      { icon: Gift, active: false },
                      { icon: User, active: false },
                    ].map((item, idx) => (
                      <div 
                        key={idx}
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          item.active ? 'bg-[#7B2D8E]' : ''
                        }`}
                      >
                        <item.icon className={`w-3 h-3 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="h-4 flex items-center justify-center bg-white">
                    <div className="w-16 h-1 bg-gray-200 rounded-full" />
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

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
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
