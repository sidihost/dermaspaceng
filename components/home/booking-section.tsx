'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, ArrowRight, Star, Users, Check } from 'lucide-react'
import Link from 'next/link'
import SectionHeader from '@/components/shared/section-header'

export default function BookingSection() {
  const [selectedDate, setSelectedDate] = useState(15)
  const [selectedTime, setSelectedTime] = useState(1)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Generate calendar days
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const emptyDays = 3 // April 2026 starts on Wednesday
  const totalDays = 30

  const timeSlots = [
    { time: '9:00 AM', available: true },
    { time: '11:00 AM', available: true },
    { time: '2:00 PM', available: true },
    { time: '4:00 PM', available: false },
  ]

  return (
    <section id="booking-section" className="py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Coming Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience just for you. Stay tuned!"
        />

        {/* Main Container */}
        <div className="relative">
          {/* Background Decoration */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#7B2D8E]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[#7B2D8E]/5 rounded-full blur-3xl" />

          {/* Main Card */}
          <div className="relative bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <div className="grid lg:grid-cols-5">
              
              {/* Left Side - Info & Features */}
              <div className="lg:col-span-2 p-8 lg:p-10 flex flex-col">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#7B2D8E]/10 rounded-full w-fit mb-6">
                  <div className="w-2 h-2 bg-[#7B2D8E] rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-[#7B2D8E]">Launching Soon</span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Book Your Perfect
                  <br />
                  <span className="text-[#7B2D8E]">Spa Experience</span>
                </h3>
                
                <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                  Easy online booking with real-time availability, instant confirmations, and flexible rescheduling.
                </p>

                {/* Feature List */}
                <div className="space-y-4 mb-8">
                  {[
                    { icon: Calendar, text: 'Choose your preferred date & time' },
                    { icon: MapPin, text: 'Select from multiple locations' },
                    { icon: Users, text: 'Book for yourself or groups' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-[#7B2D8E]" />
                      </div>
                      <span className="text-sm text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 pt-6 border-t border-gray-100 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900">4.9</span>
                  </div>
                  <div className="h-4 w-px bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">5,000+ clients</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-8">
                  <p className="text-xs text-gray-500 mb-3">For now, book directly:</p>
                  <div className="flex gap-3">
                    <a
                      href="tel:+2349017972919"
                      className="flex-1 py-3 px-4 text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Call Us
                    </a>
                    <a
                      href="https://wa.me/+2349013134945"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 px-4 text-center text-sm font-medium text-white bg-[#7B2D8E] rounded-xl hover:bg-[#6B2278] transition-colors"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Right Side - Interactive Preview */}
              <div className="lg:col-span-3 bg-gray-50/50 p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-gray-100">
                <div className="max-w-md mx-auto lg:max-w-none">
                  
                  {/* Preview Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Booking Preview</p>
                        <p className="text-xs text-gray-500">See how easy it will be</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-medium rounded-full">Demo</span>
                  </div>

                  {/* Service Selection */}
                  <div className={`bg-white rounded-2xl p-5 border border-gray-100 mb-4 transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-900">Select Treatment</span>
                      <span className="text-xs text-[#7B2D8E] font-medium">Step 1 of 3</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['Signature Glow Facial', 'Deep Tissue Massage', 'Body Scrub'].map((service, i) => (
                        <button 
                          key={service}
                          className={`p-3 rounded-xl text-center transition-all ${
                            i === 0 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center ${
                            i === 0 ? 'bg-white/20' : 'bg-gray-200'
                          }`}>
                            {i === 0 && <Check className="w-4 h-4" />}
                            {i === 1 && <Clock className="w-4 h-4 text-gray-500" />}
                            {i === 2 && <MapPin className="w-4 h-4 text-gray-500" />}
                          </div>
                          <span className="text-xs font-medium line-clamp-1">{service.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className={`bg-white rounded-2xl p-5 border border-gray-100 mb-4 transition-all duration-500 delay-100 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-900">April 2026</span>
                      <div className="flex gap-1">
                        <button className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </button>
                        <button className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Days of week */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {days.map((day, i) => (
                        <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty days */}
                      {[...Array(emptyDays)].map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                      ))}
                      {/* Actual days */}
                      {[...Array(totalDays)].map((_, i) => {
                        const day = i + 1
                        const isSelected = day === selectedDate
                        const isToday = day === 4
                        const isPast = day < 4
                        
                        return (
                          <button
                            key={day}
                            onClick={() => !isPast && setSelectedDate(day)}
                            disabled={isPast}
                            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-[#7B2D8E] text-white'
                                : isToday
                                  ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]'
                                  : isPast
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div className={`bg-white rounded-2xl p-5 border border-gray-100 transition-all duration-500 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-900">Available Times</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">90 min session</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => slot.available && setSelectedTime(i)}
                          disabled={!slot.available}
                          className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
                            selectedTime === i && slot.available
                              ? 'bg-[#7B2D8E] text-white'
                              : slot.available
                                ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                : 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                    
                    {/* Confirm Button Preview */}
                    <button 
                      className="w-full mt-4 py-3 bg-[#7B2D8E] text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 opacity-90 cursor-not-allowed"
                      disabled
                    >
                      Confirm Booking
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-2">Coming soon - contact us to book now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Link */}
        <div className="mt-10 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] hover:underline"
          >
            Have questions? Contact us
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
