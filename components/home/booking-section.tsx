'use client'

import { BookingFrame } from '@/components/booking/booking-frame'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2D8E]/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7B2D8E]" />
            <span className="text-xs font-medium text-[#7B2D8E] uppercase tracking-wide">Book Online</span>
          </div>
          <h2 className="text-headline font-semibold text-gray-900">
            Schedule Your <span className="text-[#7B2D8E]">Appointment</span>
          </h2>
        </div>
        <BookingFrame minHeight={600} />
      </div>
    </section>
  )
}
