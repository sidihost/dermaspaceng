'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)
  const [selectedDate, setSelectedDate] = useState(14)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

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
          {/* Left - Premium Device Mockups */}
          <div className={`relative flex justify-center transition-all duration-700 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            {/* Glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7B2D8E]/8 rounded-full blur-3xl" />
            
            {/* Desktop Browser Mockup */}
            <div className="relative w-full max-w-[440px]">
              <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(123,45,142,0.25)] border border-[#7B2D8E]/10 overflow-hidden">
                {/* Browser Chrome - Clean Light Design */}
                <div className="bg-[#7B2D8E]/5 px-4 py-2.5 flex items-center gap-3 border-b border-[#7B2D8E]/10">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/30" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]/10" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white rounded-lg px-3 py-1.5 text-[10px] text-[#7B2D8E]/60 flex items-center gap-1.5 border border-[#7B2D8E]/10">
                      <svg className="w-2.5 h-2.5 text-[#7B2D8E]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      dermaspaceng.com/booking
                    </div>
                  </div>
                </div>
                
                {/* Dashboard Content */}
                <div className="bg-gradient-to-b from-[#7B2D8E]/[0.02] to-white">
                  {/* Dashboard Header */}
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#7B2D8E] flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">D</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900">Dermaspace</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                        <span className="text-[8px] text-white font-medium">AO</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex gap-4">
                      {/* Sidebar */}
                      <div className="w-28 hidden sm:block">
                        <div className="space-y-1">
                          {[
                            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Dashboard', active: false },
                            { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Appointments', active: true },
                            { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'History', active: false },
                            { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Profile', active: false },
                          ].map((item, i) => (
                            <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${item.active ? 'bg-[#7B2D8E] text-white' : 'text-gray-500 hover:bg-[#7B2D8E]/5'}`}>
                              <svg className={`w-3 h-3 ${item.active ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                              </svg>
                              <span className={`text-[9px] font-medium ${item.active ? 'text-white' : 'text-gray-600'}`}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Main Content */}
                      <div className="flex-1 space-y-2.5">
                        {/* Calendar Card */}
                        <div className="bg-white rounded-xl p-3 border border-[#7B2D8E]/10 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold text-gray-900">April 2026</span>
                            <div className="flex gap-1">
                              <button className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 flex items-center justify-center">
                                <ChevronLeft className="w-3 h-3 text-[#7B2D8E]" />
                              </button>
                              <button className="w-5 h-5 rounded-md bg-[#7B2D8E]/10 flex items-center justify-center">
                                <ChevronRight className="w-3 h-3 text-[#7B2D8E]" />
                              </button>
                            </div>
                          </div>
                          {/* Week days */}
                          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                              <div key={i} className="text-[7px] font-medium text-[#7B2D8E]/40 py-0.5">{d}</div>
                            ))}
                          </div>
                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: 28 }, (_, i) => {
                              const day = i + 1
                              const isSelected = day === selectedDate
                              const hasAppointment = [8, 15, 22].includes(day)
                              return (
                                <button
                                  key={i}
                                  onClick={() => setSelectedDate(day)}
                                  className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-medium transition-all relative ${
                                    isSelected 
                                      ? 'bg-[#7B2D8E] text-white' 
                                      : hasAppointment 
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
                        <div className="bg-white rounded-xl p-2.5 border border-[#7B2D8E]/10 shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-semibold text-gray-900">Available Times</span>
                            <span className="text-[7px] text-[#7B2D8E] font-medium bg-[#7B2D8E]/10 px-1.5 py-0.5 rounded">April {selectedDate}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {['09:00', '10:30', '12:00', '14:00', '15:30', '16:00', '17:30', '18:00'].map((time, i) => (
                              <button
                                key={time}
                                className={`px-1.5 py-1 text-[7px] font-medium rounded-md transition-all ${
                                  i === 2 
                                    ? 'bg-[#7B2D8E] text-white' 
                                    : 'bg-[#7B2D8E]/5 text-[#7B2D8E] hover:bg-[#7B2D8E]/10'
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Confirm Button */}
                        <button className="w-full py-2 bg-[#7B2D8E] text-white rounded-xl text-[9px] font-semibold flex items-center justify-center gap-1 shadow-lg shadow-[#7B2D8E]/20">
                          <Check className="w-3 h-3" />
                          Confirm Booking
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Phone Mockup - Floating */}
              <div className="absolute -bottom-4 -right-6 sm:-right-10 w-36 sm:w-40 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-[24px] shadow-[0_25px_50px_-12px_rgba(123,45,142,0.3)] border-[3px] border-[#7B2D8E]/20 overflow-hidden">
                  {/* Phone Notch */}
                  <div className="bg-[#7B2D8E] h-5 flex items-center justify-center relative">
                    <div className="absolute w-16 h-4 bg-white/10 rounded-b-xl" />
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mt-1" />
                  </div>
                  
                  {/* App Content */}
                  <div className="p-3 bg-gradient-to-b from-[#7B2D8E]/[0.03] to-white min-h-[180px]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-bold text-gray-900">My Bookings</span>
                      <div className="w-5 h-5 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                        <span className="text-[6px] text-white font-medium">AO</span>
                      </div>
                    </div>
                    
                    {/* Stats Card */}
                    <div className="bg-[#7B2D8E] rounded-xl p-2.5 mb-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white/60 text-[7px] mb-0.5">Upcoming</p>
                          <p className="text-white text-base font-bold">3</p>
                        </div>
                        <div className="flex gap-0.5 items-end">
                          {[30, 50, 35, 65, 45, 70].map((h, i) => (
                            <div key={i} className="w-1.5 bg-white/30 rounded-sm" style={{ height: `${h * 0.4}px` }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Appointment Cards */}
                    {[
                      { title: 'Signature Facial', time: '10:00 AM', date: 'Today' },
                      { title: 'Body Treatment', time: '2:30 PM', date: 'Tomorrow' }
                    ].map((apt, i) => (
                      <div key={i} className="bg-white rounded-lg p-2 mb-1.5 border border-[#7B2D8E]/10 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[8px] font-semibold text-gray-900">{apt.title}</p>
                            <p className="text-[6px] text-[#7B2D8E]">{apt.date} at {apt.time}</p>
                          </div>
                          <div className="w-5 h-5 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                            <Calendar className="w-2.5 h-2.5 text-[#7B2D8E]" />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Book Button */}
                    <button className="w-full bg-[#7B2D8E] rounded-lg py-1.5 text-center mt-1">
                      <span className="text-white text-[8px] font-semibold">+ New Booking</span>
                    </button>
                  </div>
                  
                  {/* Home Indicator */}
                  <div className="bg-white py-1.5 flex justify-center">
                    <div className="w-10 h-1 bg-[#7B2D8E]/20 rounded-full" />
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
              Our online booking platform will let you schedule appointments, choose your preferred stylist, 
              and manage your visits - all from your phone or computer.
            </p>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              {[
                { icon: Calendar, title: '24/7 Scheduling', desc: 'Book anytime, day or night' },
                { icon: Clock, title: 'Real-time Availability', desc: 'See open slots instantly' },
                { title: 'Instant Confirmations', desc: 'Get booking details via SMS', icon: Check },
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
