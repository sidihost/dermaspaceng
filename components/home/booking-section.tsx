'use client'

import { BookingFrame } from '@/components/booking/booking-frame'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A853] mb-3">
            Book Online
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Schedule Appointment
          </h2>
        </div>
        <BookingFrame minHeight={650} />
      </div>
    </section>
  )
}
