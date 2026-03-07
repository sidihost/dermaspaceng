'use client'

import { BookingFrame } from '@/components/booking/booking-frame'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
            <span className="text-xs font-semibold text-[#7B2D8E] uppercase tracking-widest">Book Online</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Schedule <span className="text-[#7B2D8E]">Appointment</span>
          </h2>
          {/* Decorative curve */}
          <div className="flex items-center justify-center gap-1 mt-4">
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
            <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
            <svg width="60" height="8" viewBox="0 0 60 8" fill="none">
              <path d="M1 6C15 2 45 2 59 6" stroke="#7B2D8E" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3"/>
            </svg>
          </div>
        </div>
        <BookingFrame minHeight={650} />
      </div>
    </section>
  )
}
