'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Phone, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import SectionHeader from '@/components/shared/section-header'
import Image from 'next/image'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)
  const [selectedDate, setSelectedDate] = useState(14)
  const [selectedTime, setSelectedTime] = useState(2)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Auto-cycle through booking steps for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 3)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const services = [
    { name: 'Signature Facial', duration: '60 min', price: '₦25,000' },
    { name: 'Carbon Laser Peel', duration: '45 min', price: '₦35,000' },
    { name: 'Hydrafacial', duration: '75 min', price: '₦45,000' },
  ]

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

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left - Premium Device Mockups */}
          <div className={`relative flex justify-center transition-all duration-700 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            {/* Glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#7B2D8E]/5 rounded-full blur-3xl" />
            
            {/* Main Phone Mockup */}
            <div className="relative w-[280px] md:w-[300px]">
              {/* Phone frame */}
              <div className="relative bg-[#f5f5f5] rounded-[45px] p-2 shadow-2xl shadow-[#7B2D8E]/20">
                {/* Side buttons */}
                <div className="absolute -left-0.5 top-24 w-0.5 h-8 bg-[#e0e0e0] rounded-l" />
                <div className="absolute -left-0.5 top-36 w-0.5 h-12 bg-[#e0e0e0] rounded-l" />
                <div className="absolute -left-0.5 top-52 w-0.5 h-12 bg-[#e0e0e0] rounded-l" />
                <div className="absolute -right-0.5 top-32 w-0.5 h-16 bg-[#e0e0e0] rounded-r" />
                
                {/* Screen bezel */}
                <div className="bg-white rounded-[40px] p-1 border border-gray-200">
                  {/* Screen */}
                  <div className="bg-white rounded-[36px] overflow-hidden relative">
                    {/* Dynamic Island */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#1a1a1a] rounded-full z-20 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#2a2a2a] ring-1 ring-gray-700" />
                    </div>
                    
                    {/* Status bar */}
                    <div className="h-10 bg-white flex items-end justify-between px-6 pb-1">
                      <span className="text-[10px] text-gray-900 font-medium">9:41</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V3c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 4.36 6 6.92 6 10v5l-2 2v1h16v-1l-2-2z"/></svg>
                        <div className="w-6 h-2.5 rounded-sm bg-gray-900 relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-0.5 w-0.5 h-1.5 bg-gray-900 rounded-r" />
                        </div>
                      </div>
                    </div>
                    
                    {/* App Header */}
                    <div className="bg-[#7B2D8E] px-4 pt-2 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center overflow-hidden">
                            <Image 
                              src="/images/dermaspace-logo.png" 
                              alt="Dermaspace" 
                              width={24} 
                              height={24}
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">Dermaspace</p>
                            <p className="text-[10px] text-white/70">Book your glow</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      {/* Step Indicator */}
                      <div className="flex items-center gap-2">
                        {['Service', 'Date & Time', 'Confirm'].map((label, idx) => (
                          <div key={label} className="flex items-center gap-1.5 flex-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold transition-colors ${
                              idx <= step ? 'bg-white text-[#7B2D8E]' : 'bg-white/20 text-white'
                            }`}>
                              {idx < step ? <Check className="w-3 h-3" /> : idx + 1}
                            </div>
                            <span className={`text-[8px] font-medium hidden sm:block ${idx <= step ? 'text-white' : 'text-white/50'}`}>{label}</span>
                            {idx < 2 && <div className={`flex-1 h-0.5 rounded ${idx < step ? 'bg-white' : 'bg-white/20'}`} />}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* App Content */}
                    <div className="bg-[#fafafa] p-3 min-h-[340px]">
                      {/* Step 0: Service Selection */}
                      {step === 0 && (
                        <div className="space-y-2" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
                          <p className="text-[11px] font-semibold text-gray-900 mb-2">Select a Service</p>
                          {services.map((service, idx) => (
                            <button
                              key={service.name}
                              className={`w-full p-3 rounded-xl text-left transition-all ${
                                idx === 0 
                                  ? 'bg-[#7B2D8E] text-white shadow-lg shadow-[#7B2D8E]/20' 
                                  : 'bg-white border border-gray-100 hover:border-[#7B2D8E]/30'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`text-[11px] font-semibold ${idx === 0 ? 'text-white' : 'text-gray-900'}`}>{service.name}</p>
                                  <p className={`text-[9px] ${idx === 0 ? 'text-white/70' : 'text-gray-500'}`}>{service.duration}</p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-[11px] font-bold ${idx === 0 ? 'text-white' : 'text-[#7B2D8E]'}`}>{service.price}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                          <button className="w-full py-2.5 bg-[#7B2D8E] text-white rounded-xl text-[10px] font-semibold mt-3 flex items-center justify-center gap-1">
                            Continue
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Step 1: Date & Time */}
                      {step === 1 && (
                        <div className="space-y-3" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
                          {/* Calendar */}
                          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
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
                            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                                <div key={i} className="text-[7px] font-medium text-gray-400 py-0.5">{d}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                              {Array.from({ length: 28 }, (_, i) => {
                                const day = i + 1
                                const isSelected = day === selectedDate
                                return (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedDate(day)}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-[8px] font-medium transition-all ${
                                      isSelected 
                                        ? 'bg-[#7B2D8E] text-white' 
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
                          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-semibold text-gray-900 mb-2">Available Times</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {times.map((time, i) => (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(i)}
                                  className={`px-2 py-2 text-[9px] font-medium rounded-lg transition-all ${
                                    i === selectedTime 
                                      ? 'bg-[#7B2D8E] text-white' 
                                      : 'bg-[#7B2D8E]/5 text-[#7B2D8E] hover:bg-[#7B2D8E]/10'
                                  }`}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <button className="w-full py-2.5 bg-[#7B2D8E] text-white rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1">
                            Continue
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Step 2: Confirmation */}
                      {step === 2 && (
                        <div className="space-y-3" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
                          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                              <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-[11px] font-semibold text-gray-900">Signature Facial</p>
                                <p className="text-[9px] text-gray-500">60 minutes</p>
                              </div>
                              <p className="text-[12px] font-bold text-[#7B2D8E]">₦25,000</p>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                <span className="text-[10px] text-gray-600">Saturday, April {selectedDate}, 2026</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-[#7B2D8E]" />
                                <span className="text-[10px] text-gray-600">{times[selectedTime]} - {parseInt(times[selectedTime]) + 1}:00</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-[10px] text-gray-600">Dermaspace, Lekki Phase 1</span>
                              </div>
                            </div>
                          </div>
                          
                          <button className="w-full py-3 bg-[#7B2D8E] text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-[#7B2D8E]/25">
                            <Check className="w-4 h-4" />
                            Confirm Booking
                          </button>
                          
                          <p className="text-center text-[8px] text-gray-400">You&apos;ll receive a confirmation SMS</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Home indicator */}
                    <div className="h-5 flex items-center justify-center bg-white">
                      <div className="w-28 h-1 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Desktop Mockup - Floating */}
            <div className="absolute -bottom-8 -right-4 lg:-right-12 w-48 lg:w-56 transform rotate-3 hover:rotate-0 transition-transform duration-500 hidden sm:block">
              <div className="bg-white rounded-xl shadow-xl shadow-[#7B2D8E]/15 border border-gray-200 overflow-hidden">
                {/* Browser bar */}
                <div className="bg-gray-50 px-3 py-1.5 flex items-center gap-2 border-b border-gray-100">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/30" />
                    <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/20" />
                    <div className="w-2 h-2 rounded-full bg-[#7B2D8E]/10" />
                  </div>
                  <div className="flex-1 bg-white rounded px-2 py-0.5 text-[7px] text-gray-400 border border-gray-100">
                    dermaspaceng.com
                  </div>
                </div>
                
                {/* Dashboard preview */}
                <div className="p-3 bg-white">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg overflow-hidden">
                      <Image 
                        src="/images/dermaspace-logo.png" 
                        alt="Dermaspace" 
                        width={24} 
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-[9px] font-semibold text-gray-900">My Appointments</span>
                  </div>
                  
                  {/* Appointment cards */}
                  {[
                    { service: 'Signature Facial', date: 'Today, 10:00 AM', status: 'Confirmed' },
                    { service: 'Carbon Peel', date: 'Apr 20, 2:00 PM', status: 'Upcoming' },
                  ].map((apt, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-[#7B2D8E]/5 rounded-lg mb-1.5">
                      <div className="w-6 h-6 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center">
                        <Calendar className="w-3 h-3 text-[#7B2D8E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-semibold text-gray-900 truncate">{apt.service}</p>
                        <p className="text-[7px] text-gray-500">{apt.date}</p>
                      </div>
                      <span className={`text-[6px] px-1.5 py-0.5 rounded-full font-medium ${
                        apt.status === 'Confirmed' ? 'bg-[#7B2D8E] text-white' : 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  ))}
                  
                  <button className="w-full mt-2 py-1.5 bg-[#7B2D8E] text-white rounded-lg text-[8px] font-semibold">
                    + Book New
                  </button>
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
      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
