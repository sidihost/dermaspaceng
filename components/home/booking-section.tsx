'use client'

import { SectionTitle } from '@/components/ui/section-title'
import { BookingFrame } from '@/components/booking/booking-frame'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 lg:px-6">
        <SectionTitle
          label="Book Online"
          title="Schedule Your"
          highlight="Appointment"
          description="Select your preferred service, date and time"
        />
        <BookingFrame minHeight={650} />
      </div>
    </section>
  )
}
