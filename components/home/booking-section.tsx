'use client'

import { Calendar, Clock, MapPin, Sparkles, ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Coming Soon
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Online <span className="text-[#7B2D8E]">Booking</span>
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            We&apos;re building a seamless booking experience for you. Book appointments, manage schedules, and more - all in one place.
          </p>
        </div>

        {/* Premium Preview Card */}
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100">
            {/* Glass Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7B2D8E]/5 via-transparent to-[#7B2D8E]/5" />
            
            {/* Content Grid */}
            <div className="relative grid md:grid-cols-2 gap-0">
              {/* Left Side - Feature Preview */}
              <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-gray-100">
                <div className="space-y-6">
                  {/* Feature Item 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Easy Scheduling</h4>
                      <p className="text-sm text-gray-500">Pick your preferred date and time with real-time availability</p>
                    </div>
                  </div>

                  {/* Feature Item 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Multiple Locations</h4>
                      <p className="text-sm text-gray-500">Choose from our Victoria Island or Ikoyi branches</p>
                    </div>
                  </div>

                  {/* Feature Item 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Instant Confirmation</h4>
                      <p className="text-sm text-gray-500">Get immediate booking confirmation via email and SMS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Mock Preview */}
              <div className="p-8 md:p-10 bg-gray-50/50">
                <div className="space-y-4">
                  {/* Mock Calendar Header */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-400">Select Service</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex gap-2">
                      {['Facial', 'Massage', 'Nail Care'].map((service) => (
                        <div 
                          key={service}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                            service === 'Facial' 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {service}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mock Date Picker */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-400">April 2026</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-[10px] text-gray-400 py-1">{day}</div>
                      ))}
                      {[...Array(5)].map((_, i) => (
                        <div key={`empty-${i}`} className="w-7 h-7" />
                      ))}
                      {[...Array(30)].map((_, i) => (
                        <div 
                          key={i}
                          className={`w-7 h-7 flex items-center justify-center text-xs rounded-lg ${
                            i + 1 === 15 
                              ? 'bg-[#7B2D8E] text-white font-medium' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mock Time Slots */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <span className="text-sm font-medium text-gray-400 block mb-3">Available Times</span>
                    <div className="grid grid-cols-3 gap-2">
                      {['10:00 AM', '11:30 AM', '2:00 PM'].map((time, i) => (
                        <div 
                          key={time}
                          className={`px-2 py-1.5 rounded-lg text-xs text-center font-medium ${
                            i === 1 
                              ? 'bg-[#7B2D8E] text-white' 
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {time}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA Bar */}
            <div className="border-t border-gray-100 bg-white px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Launching Soon</p>
                <p className="text-xs text-gray-500">For now, contact us directly to book</p>
              </div>
              <div className="flex gap-3">
                <a
                  href="tel:+2349017972919"
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Call Us
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7B2D8E] text-white rounded-xl text-sm font-medium hover:bg-[#6B2278] transition-colors"
                >
                  Contact
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {['Instant Confirmation', '24/7 Online Access', 'Easy Rescheduling', 'No Hidden Fees'].map((badge) => (
            <div key={badge} className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-[#7B2D8E]" />
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
