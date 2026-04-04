'use client'

import { Calendar, Clock, MapPin, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import SectionHeader from '@/components/shared/section-header'

const features = [
  {
    icon: Calendar,
    title: 'Easy Scheduling',
    desc: 'Pick your preferred date and time with real-time availability',
  },
  {
    icon: MapPin,
    title: 'Multiple Locations',
    desc: 'Choose from our Victoria Island or Ikoyi branches',
  },
  {
    icon: Clock,
    title: 'Instant Confirmation',
    desc: 'Get immediate booking confirmation via email and SMS',
  },
]

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeader 
          badge="Launching Soon"
          title="Online"
          highlight="Booking"
          description="We're building a seamless booking experience. Book appointments, manage schedules, and more."
        />

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left - Features */}
            <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="space-y-5">
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-[#7B2D8E]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-0.5">{feature.title}</h4>
                      <p className="text-xs text-gray-500">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">For now, contact us directly to book</p>
                <div className="flex gap-2">
                  <a
                    href="tel:+2349017972919"
                    className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Call Us
                  </a>
                  <a
                    href="https://wa.me/+2349013134945"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#7B2D8E] text-white rounded-lg text-xs font-medium hover:bg-[#6B2278] transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Right - Preview */}
            <div className="p-6 md:p-8 bg-gray-50/50">
              <div className="space-y-3">
                {/* Service Selection Preview */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500">Select Service</span>
                    <Check className="w-3.5 h-3.5 text-[#7B2D8E]" />
                  </div>
                  <div className="flex gap-2">
                    {['Facial', 'Massage', 'Nail Care'].map((service, i) => (
                      <div 
                        key={service}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                          i === 0 
                            ? 'bg-[#7B2D8E] text-white' 
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {service}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Preview */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 block mb-2">April 2026</span>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={i} className="text-[10px] text-gray-400 py-0.5">{day}</div>
                    ))}
                    {[...Array(3)].map((_, i) => (
                      <div key={`empty-${i}`} className="w-6 h-6" />
                    ))}
                    {[...Array(30)].map((_, i) => (
                      <div 
                        key={i}
                        className={`w-6 h-6 flex items-center justify-center text-[10px] rounded-md ${
                          i + 1 === 15 
                            ? 'bg-[#7B2D8E] text-white font-medium' 
                            : 'text-gray-600'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Slots Preview */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 block mb-2">Available Times</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['10:00 AM', '11:30 AM', '2:00 PM'].map((time, i) => (
                      <div 
                        key={time}
                        className={`py-1.5 rounded-lg text-[10px] text-center font-medium ${
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
        </div>

        {/* Bottom Link */}
        <div className="mt-8 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#7B2D8E] hover:underline"
          >
            Contact us for appointments
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
