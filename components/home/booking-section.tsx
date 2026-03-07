'use client'

import { SectionTitle } from '@/components/ui/section-title'
import { BookingFrame } from '@/components/booking/booking-frame'

export default function BookingSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-white via-[#faf8fc] to-white relative">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
      
      <div className="max-w-5xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <SectionTitle
          label="Book Online"
          title="Schedule Your"
          highlight="Appointment"
          description="Select your preferred service, date and time. Our online booking system makes it easy to reserve your spot at Dermaspace."
        />

        {/* Booking iframe with beautiful frame */}
        <BookingFrame minHeight={700} />
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2D8E]/20 to-transparent" />
    </section>
  )
}
