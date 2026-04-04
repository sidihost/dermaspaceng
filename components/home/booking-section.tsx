'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ArrowRight, Star, Phone } from 'lucide-react'

export default function BookingSection() {
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="py-20 bg-[#7B2D8E] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className={`transition-all duration-700 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/90 text-sm font-medium">Launching Soon</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Online Booking<br />
              <span className="text-white/80">Coming Your Way</span>
            </h2>

            <p className="text-white/70 text-base mb-8 max-w-md">
              We&apos;re building a seamless booking experience. Soon you&apos;ll be able to schedule appointments, 
              manage your visits, and more - all from your device.
            </p>

            {/* Features */}
            <div className="space-y-4 mb-8">
              {[
                { icon: Calendar, text: 'Easy appointment scheduling' },
                { icon: Clock, text: 'Real-time availability' },
                { icon: Star, text: 'Manage your bookings' }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white/90 text-sm">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              <a
                href="tel:+2349017972919"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#7B2D8E] rounded-xl font-medium text-sm hover:bg-white/90 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call to Book
              </a>
              <a
                href="https://wa.me/+2349013134945"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium text-sm hover:bg-white/20 transition-colors border border-white/20"
              >
                WhatsApp Us
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right - Device Mockups */}
          <div className={`relative transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            {/* Desktop Mockup */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              {/* Browser Chrome */}
              <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400">dermaspaceng.com/booking</div>
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="p-4 bg-gray-50">
                <div className="flex gap-4">
                  {/* Sidebar */}
                  <div className="w-40 bg-white rounded-lg p-3 hidden sm:block">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/10" />
                      <div>
                        <div className="h-2 w-16 bg-gray-200 rounded" />
                        <div className="h-1.5 w-12 bg-gray-100 rounded mt-1" />
                      </div>
                    </div>
                    {['Home', 'Appointments', 'Schedule', 'Profile'].map((item, i) => (
                      <div key={item} className={`flex items-center gap-2 px-2 py-2 rounded-lg mb-1 ${i === 1 ? 'bg-[#7B2D8E]/10' : ''}`}>
                        <div className={`w-4 h-4 rounded ${i === 1 ? 'bg-[#7B2D8E]' : 'bg-gray-200'}`} />
                        <span className={`text-xs ${i === 1 ? 'text-[#7B2D8E] font-medium' : 'text-gray-500'}`}>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="flex-1 bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">April 2026</span>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded bg-gray-100" />
                        <div className="w-6 h-6 rounded bg-gray-100" />
                      </div>
                    </div>
                    {/* Week Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <div key={i} className="text-[10px] text-gray-400 py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 28 }, (_, i) => (
                        <div
                          key={i}
                          className={`aspect-square rounded flex items-center justify-center text-[10px] ${
                            i === 3 ? 'bg-[#7B2D8E] text-white font-medium' :
                            i === 10 || i === 17 ? 'bg-[#7B2D8E]/10 text-[#7B2D8E]' :
                            'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Mockup */}
            <div className="absolute -bottom-8 -right-4 w-44 bg-white rounded-3xl shadow-2xl overflow-hidden transform rotate-6 hover:rotate-3 transition-transform duration-500 border-4 border-gray-800">
              {/* Phone Notch */}
              <div className="bg-gray-800 h-6 flex items-center justify-center">
                <div className="w-16 h-3 bg-black rounded-full" />
              </div>
              
              {/* App Content */}
              <div className="p-3 bg-gray-50 min-h-[200px]">
                <div className="text-xs font-semibold text-gray-900 mb-2">My Bookings</div>
                
                {/* Stats Card */}
                <div className="bg-[#7B2D8E] rounded-lg p-2 mb-2">
                  <div className="text-white/70 text-[8px] mb-1">This Month</div>
                  <div className="flex justify-between items-end">
                    <div className="text-white text-lg font-bold">3</div>
                    <div className="flex gap-0.5 items-end">
                      {[40, 60, 35, 80, 55].map((h, i) => (
                        <div key={i} className="w-2 bg-white/30 rounded-t" style={{ height: `${h * 0.3}px` }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Appointment Cards */}
                {[
                  { title: 'Signature Facial', time: '10:00 AM', status: 'Confirmed' },
                  { title: 'Body Massage', time: '2:30 PM', status: 'Pending' }
                ].map((apt, i) => (
                  <div key={i} className="bg-white rounded-lg p-2 mb-1.5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-medium text-gray-900">{apt.title}</div>
                        <div className="text-[8px] text-gray-500">{apt.time}</div>
                      </div>
                      <span className={`text-[7px] px-1.5 py-0.5 rounded-full ${
                        apt.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Book Button */}
                <div className="bg-[#7B2D8E] rounded-lg py-2 text-center mt-2">
                  <span className="text-white text-[9px] font-medium">Book New</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 transition-all duration-700 delay-400 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {[
            { icon: Calendar, title: 'Easy Scheduling', desc: 'Book appointments in seconds' },
            { icon: Clock, title: 'Real-time Availability', desc: 'See open slots instantly' },
            { icon: Star, title: 'Manage Bookings', desc: 'Reschedule or cancel anytime' }
          ].map((card, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-1">{card.title}</h3>
              <p className="text-white/60 text-sm">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
