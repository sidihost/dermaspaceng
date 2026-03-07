'use client'

import { SectionTitle } from '@/components/ui/section-title'
import { BookingFrame } from '@/components/booking/booking-frame'

export default function BookingSection() {
  return (
    <section id="booking-section" className="py-20 bg-[#FDFBF9]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <SectionTitle
          label="Book Online"
          title="Schedule Your"
          highlight="Appointment"
          description="Select your preferred service, date and time"
        />
        <div className="mt-10">
          <BookingFrame minHeight={700} />
        </div>
      </div>
    </section>
  )
}
