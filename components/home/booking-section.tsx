'use client'

import { BookingCard } from '@/components/booking/booking-card'
import SectionHeader from '@/components/shared/section-header'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-16 bg-white">
      <div className="max-w-md mx-auto px-4">
        <SectionHeader 
          badge="Book Online"
          title="Schedule"
          highlight="Appointment"
        />
        <BookingCard />
      </div>
    </section>
  )
}
