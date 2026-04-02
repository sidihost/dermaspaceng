'use client'

import SectionHeader from '@/components/shared/section-header'
import { BookingCard } from '@/components/booking/booking-card'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-16 bg-white">
      <div className="max-w-md mx-auto px-4">
        <SectionHeader 
          badge="Book Online"
          title="Schedule"
          highlight="Appointment"
        />
        <div className="mt-8">
          <BookingCard />
        </div>
      </div>
    </section>
  )
}
