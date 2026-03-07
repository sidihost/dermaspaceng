'use client'

import { SectionTitle } from '@/components/ui/section-title'
import { BookingFrame } from '@/components/booking/booking-frame'

export default function BookingSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-[#f8f5fc] relative">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
      
      <div className="max-w-5xl mx-auto px-4 lg:px-6">
        {/* Section Header */}
        <SectionTitle
          label="Book Online"
          title="Schedule Your"
          highlight="Appointment"
          description="Select your preferred service, date and time. Our online booking system makes it easy to reserve your spot."
        />

        {/* Booking iframe with beautiful frame */}
        <BookingFrame minHeight={650} />
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
    </section>
  )
}
