'use client'

import { BookingCard } from '@/components/booking/booking-card'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-12 bg-white">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Book <span className="text-[#7B2D8E]">Appointment</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">Schedule your visit with us</p>
        </div>
        <BookingCard />
      </div>
    </section>
  )
}
