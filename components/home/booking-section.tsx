'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, ArrowRight, Star, Phone } from 'lucide-react'
import Link from 'next/link'
import SectionHeader from '@/components/shared/section-header'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 200)
    return () => clearTimeout(timer)
  }, [])

  // Sample appointment data for the calendar preview
  const appointments = [
    { time: '9:00', duration: 2, title: 'Facial Treatment', color: 'bg-[#7B2D8E]' },
    { time: '11:30', duration: 1, title: 'Consultation', color: 'bg-[#7B2D8E]/60' },
    { time: '14:00', duration: 3, title: 'Full Body Massage', color: 'bg-[#7B2D8E]/80' },
  ]

  const upcomingBookings = [
    { service: 'Signature Glow Facial', date: 'Apr 15', time: '10:00 AM', status: 'Confirmed' },
    { service: 'Deep Tissue Massage', date: 'Apr 18', time: '2:00 PM', status: 'Pending' },
  ]

  return (
    <section id="booking-section" className="py-20 bg-[#7B2D8E] overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white">Launching Soon</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Online Booking <span className="text-white/80">Made Simple</span>
          </h2>
          <p className="text-white/70 max-w-xl mx-auto">
            We&apos;re building a seamless booking experience. Preview how easy it will be to manage your appointments.
          </p>
        </div>

        {/* Floating Device Mockups */}
        <div className="relative h-[500px] md:h-[550px] mb-16">
          
          {/* Desktop Dashboard Mockup - Left */}
          <div 
            className={`absolute left-0 top-8 w-[85%] md:w-[70%] transition-all duration-1000 ease-out ${
              animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
            }`}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Browser Chrome */}
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-lg px-4 py-1.5 text-xs text-gray-400 max-w-xs">
                    dermaspaceng.com/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="flex">
                {/* Sidebar */}
                <div className="w-48 bg-gray-50 border-r border-gray-100 p-4 hidden md:block">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-full bg-[#7B2D8E] flex items-center justify-center">
                      <span className="text-white text-xs font-bold">D</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Dermaspace</p>
                      <p className="text-[10px] text-gray-400">Dashboard</p>
                    </div>
                  </div>
                  <nav className="space-y-1">
                    {['Home', 'Appointments', 'Schedule', 'Clients', 'Services'].map((item, i) => (
                      <div 
                        key={item}
                        className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                          i === 1 ? 'bg-[#7B2D8E] text-white' : 'text-gray-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded ${i === 1 ? 'bg-white/20' : 'bg-gray-200'}`} />
                        {item}
                      </div>
                    ))}
                  </nav>
                </div>

                {/* Main Calendar Area */}
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Calendar</h3>
                      <p className="text-[10px] text-gray-400">April 2026</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">Today</span>
                      <span className="text-xs font-medium text-gray-900">Friday, April 4</span>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
                    {/* Day Headers */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="bg-gray-50 p-2 text-center">
                        <span className="text-[10px] font-medium text-gray-500">{day}</span>
                      </div>
                    ))}
                    {/* Time Slots Row */}
                    {[6, 7, 8, 9, 10, 11, 12].map(date => (
                      <div key={date} className="bg-white p-2 min-h-[80px]">
                        <span className="text-[10px] text-gray-400">{date}</span>
                        {date === 10 && (
                          <div className="mt-1 space-y-1">
                            <div className="bg-[#7B2D8E] text-white text-[8px] px-1.5 py-1 rounded truncate">
                              Facial - 9am
                            </div>
                            <div className="bg-[#7B2D8E]/60 text-white text-[8px] px-1.5 py-1 rounded truncate">
                              Massage - 2pm
                            </div>
                          </div>
                        )}
                        {date === 11 && (
                          <div className="mt-1">
                            <div className="bg-[#7B2D8E]/80 text-white text-[8px] px-1.5 py-1 rounded truncate">
                              Body Scrub
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile App Mockup - Right */}
          <div 
            className={`absolute right-0 md:right-8 top-16 w-[200px] md:w-[240px] transition-all duration-1000 delay-300 ease-out ${
              animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
            }`}
          >
            <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border-4 border-gray-800">
              {/* Phone Notch */}
              <div className="bg-gray-800 h-6 flex items-center justify-center">
                <div className="w-16 h-4 bg-black rounded-b-xl" />
              </div>
              
              {/* App Content */}
              <div className="p-4 bg-gray-50">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] text-gray-400">Welcome back</p>
                    <p className="text-sm font-semibold text-gray-900">My Bookings</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[#7B2D8E]" />
                  </div>
                </div>

                {/* Stats Card */}
                <div className="bg-[#7B2D8E] rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/70">This Month</span>
                    <span className="text-[10px] text-white/70">Apr 2026</span>
                  </div>
                  <div className="flex items-end gap-4">
                    <div>
                      <p className="text-2xl font-bold text-white">3</p>
                      <p className="text-[10px] text-white/70">Appointments</p>
                    </div>
                    <div className="flex-1 flex items-end gap-1 h-12">
                      {[40, 65, 45, 80, 55, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-white/30 rounded-t"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upcoming */}
                <div className="mb-3">
                  <p className="text-[10px] font-medium text-gray-500 mb-2">UPCOMING</p>
                  <div className="space-y-2">
                    {upcomingBookings.map((booking, i) => (
                      <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-900">{booking.service}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-gray-400">{booking.date}</span>
                              <span className="text-[10px] text-gray-400">{booking.time}</span>
                            </div>
                          </div>
                          <span className={`text-[8px] font-medium px-2 py-0.5 rounded-full ${
                            booking.status === 'Confirmed' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Book Button */}
                <button className="w-full py-2.5 bg-[#7B2D8E] text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2">
                  Book New Appointment
                </button>
              </div>

              {/* Home Indicator */}
              <div className="bg-gray-50 pb-2 pt-1">
                <div className="w-24 h-1 bg-gray-300 rounded-full mx-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Features Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Calendar, title: 'Easy Scheduling', desc: 'Book appointments with just a few taps' },
            { icon: Clock, title: 'Real-time Availability', desc: 'See open slots instantly' },
            { icon: Star, title: 'Manage Bookings', desc: 'Reschedule or cancel anytime' },
          ].map((feature, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-white/70 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-white/80 mb-4">For now, book directly with us:</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:+2349017972919"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-[#7B2D8E] font-medium rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Phone className="w-5 h-5" />
              Call to Book
            </a>
            <a
              href="https://wa.me/+2349013134945"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/20"
            >
              WhatsApp Us
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
