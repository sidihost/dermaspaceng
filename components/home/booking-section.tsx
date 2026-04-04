'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, ChevronLeft, ChevronRight, User, Home, History, Bell } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import Image from 'next/image'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)
  const [selectedDate, setSelectedDate] = useState(14)
  const [selectedTime, setSelectedTime] = useState(2)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const times = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00']

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Soon you'll be able to schedule appointments and manage your visits."
        />

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left - Device Mockups Side by Side */}
          <div className={`relative transition-all duration-700 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-[#7B2D8E]/[0.03] rounded-full blur-3xl" />
            
            <div className="relative flex items-end justify-center gap-4 md:gap-6">
              {/* Desktop Browser Mockup */}
              <div className="w-[280px] md:w-[320px] flex-shrink-0">
                <div className="bg-white rounded-xl border-2 border-[#7B2D8E]/10 overflow-hidden">
                  {/* Browser Chrome */}
                  <div className="bg-[#7B2D8E]/5 px-3 py-2 flex items-center gap-2 border-b border-[#7B2D8E]/10">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/15" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/10" />
                    </div>
                    <div className="flex-1 mx-2">
                      <div className="bg-white rounded-md px-3 py-1 text-[9px] text-[#7B2D8E]/50 flex items-center gap-1.5 border border-[#7B2D8E]/10">
                        <svg className="w-2 h-2 text-[#7B2D8E]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        dermaspaceng.com/book
                      </div>
                    </div>
                  </div>
                  
                  {/* Dashboard Content */}
                  <div className="bg-white">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Image 
                            src="/images/dermaspace-logo.png" 
                            alt="Dermaspace" 
                            width={20} 
                            height={20}
                            className="object-contain"
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-900">Dermaspace</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                          <Bell className="w-3 h-3 text-[#7B2D8E]" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                          <span className="text-[8px] text-white font-semibold">A</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <div className="flex gap-3">
                        {/* Sidebar */}
                        <div className="w-24 hidden md:block">
                          <div className="space-y-1">
                            {[
                              { icon: Home, label: 'Dashboard', active: false },
                              { icon: Calendar, label: 'Book Now', active: true },
                              { icon: History, label: 'History', active: false },
                              { icon: User, label: 'Profile', active: false },
                            ].map((item, i) => (
                              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${item.active ? 'bg-[#7B2D8E] text-white' : 'text-gray-500 hover:bg-[#7B2D8E]/5'}`}>
                                <item.icon className={`w-3 h-3 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                                <span className={`text-[8px] font-medium ${item.active ? 'text-white' : 'text-gray-600'}`}>{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Main Content */}
                        <div className="flex-1 space-y-2">
                          {/* Calendar */}
                          <div className="bg-[#7B2D8E]/[0.02] rounded-xl p-2.5 border border-[#7B2D8E]/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-semibold text-gray-900">April 2026</span>
                              <div className="flex gap-0.5">
                                <button className="w-4 h-4 rounded bg-[#7B2D8E]/10 flex items-center justify-center">
                                  <ChevronLeft className="w-2.5 h-2.5 text-[#7B2D8E]" />
                                </button>
                                <button className="w-4 h-4 rounded bg-[#7B2D8E]/10 flex items-center justify-center">
                                  <ChevronRight className="w-2.5 h-2.5 text-[#7B2D8E]" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                <div key={i} className="text-[6px] font-medium text-[#7B2D8E]/40 py-0.5">{d}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                              {Array.from({ length: 28 }, (_, i) => {
                                const day = i + 1
                                const isSelected = day === selectedDate
                                const hasBooking = [8, 15, 22].includes(day)
                                return (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedDate(day)}
                                    className={`aspect-square rounded flex items-center justify-center text-[7px] font-medium transition-all relative ${
                                      isSelected 
                                        ? 'bg-[#7B2D8E] text-white' 
                                        : hasBooking
                                          ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                                          : 'text-gray-600 hover:bg-[#7B2D8E]/5'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          
                          {/* Time Slots */}
                          <div className="bg-[#7B2D8E]/[0.02] rounded-xl p-2.5 border border-[#7B2D8E]/10">
                            <p className="text-[8px] font-semibold text-gray-900 mb-1.5">Select Time</p>
                            <div className="grid grid-cols-3 gap-1">
                              {times.map((time, i) => (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(i)}
                                  className={`px-1.5 py-1.5 text-[7px] font-medium rounded transition-all ${
                                    i === selectedTime 
                                      ? 'bg-[#7B2D8E] text-white' 
                                      : 'bg-white text-[#7B2D8E] border border-[#7B2D8E]/20 hover:border-[#7B2D8E]/40'
                                  }`}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Selected Service */}
                          <div className="bg-[#7B2D8E] rounded-xl p-2.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-white text-[8px] font-semibold">Signature Facial</p>
                                  <p className="text-white/60 text-[6px]">60 mins</p>
                                </div>
                              </div>
                              <p className="text-white text-[9px] font-bold">₦25,000</p>
                            </div>
                            <button className="w-full py-1.5 bg-white text-[#7B2D8E] rounded-lg text-[8px] font-semibold flex items-center justify-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              Confirm Booking
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Phone Mockup */}
              <div className="w-[140px] md:w-[160px] flex-shrink-0">
                {/* Phone frame */}
                <div className="bg-[#f8f8f8] rounded-[28px] p-1.5 border-2 border-[#7B2D8E]/10">
                  {/* Screen */}
                  <div className="bg-white rounded-[24px] overflow-hidden">
                    {/* Dynamic Island */}
                    <div className="h-7 bg-white flex items-center justify-center relative">
                      <div className="absolute top-1.5 w-14 h-5 bg-[#1a1a1a] rounded-full flex items-center justify-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                      </div>
                    </div>
                    
                    {/* App Header */}
                    <div className="bg-[#7B2D8E] px-3 pt-1 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-white/15 overflow-hidden flex items-center justify-center">
                            <Image 
                              src="/images/dermaspace-logo.png" 
                              alt="Dermaspace" 
                              width={16} 
                              height={16}
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-white text-[9px]">Dermaspace</p>
                            <p className="text-[6px] text-white/60">My Bookings</p>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                          <Bell className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="bg-white/10 rounded-lg p-2 flex items-center justify-between">
                        <div>
                          <p className="text-white/60 text-[6px]">Upcoming</p>
                          <p className="text-white text-sm font-bold">3</p>
                        </div>
                        <div className="flex gap-0.5 items-end">
                          {[25, 40, 30, 55, 35, 60].map((h, i) => (
                            <div key={i} className="w-1 bg-white/25 rounded-sm" style={{ height: `${h * 0.35}px` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Appointments List */}
                    <div className="p-2.5 bg-[#fafafa] min-h-[160px]">
                      <p className="text-[7px] font-semibold text-gray-900 mb-1.5">Upcoming</p>
                      
                      {[
                        { service: 'Signature Facial', date: 'Today', time: '10:00 AM' },
                        { service: 'Carbon Laser Peel', date: 'Apr 20', time: '2:00 PM' },
                        { service: 'Hydrafacial', date: 'Apr 25', time: '11:30 AM' },
                      ].map((apt, i) => (
                        <div key={i} className="flex items-center gap-2 p-1.5 bg-white rounded-lg mb-1 border border-[#7B2D8E]/10">
                          <div className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 flex items-center justify-center">
                            <Calendar className="w-2.5 h-2.5 text-[#7B2D8E]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[7px] font-semibold text-gray-900 truncate">{apt.service}</p>
                            <p className="text-[6px] text-[#7B2D8E]">{apt.date}, {apt.time}</p>
                          </div>
                        </div>
                      ))}
                      
                      <button className="w-full mt-1.5 py-1.5 bg-[#7B2D8E] text-white rounded-lg text-[7px] font-semibold flex items-center justify-center gap-0.5">
                        <span>+</span> New Booking
                      </button>
                    </div>
                    
                    {/* Bottom Nav */}
                    <div className="bg-white border-t border-gray-100 px-3 py-2 flex items-center justify-around">
                      {[
                        { icon: Home, active: false },
                        { icon: Calendar, active: true },
                        { icon: History, active: false },
                        { icon: User, active: false },
                      ].map((item, i) => (
                        <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center ${item.active ? 'bg-[#7B2D8E]' : ''}`}>
                          <item.icon className={`w-3 h-3 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                      ))}
                    </div>
                    
                    {/* Home indicator */}
                    <div className="h-4 flex items-center justify-center bg-white">
                      <div className="w-16 h-1 bg-gray-200 rounded-full" />
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

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Book Appointments<br />
              <span className="text-[#7B2D8E]">From Anywhere</span>
            </h3>

            <p className="text-gray-600 text-sm md:text-base mb-6 max-w-md">
              Our online booking platform will let you schedule appointments, choose your preferred treatments, 
              and manage your visits - all from your phone or computer.
            </p>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              {[
                { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime, day or night' },
                { icon: Clock, title: 'Real-time Availability', desc: 'See open slots instantly' },
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white rounded-xl font-medium text-sm hover:bg-[#6a2679] transition-colors"
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
