import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Phone, MessageCircle } from 'lucide-react'

interface BookingFrameProps {
  className?: string
  minHeight?: number
}

export function BookingFrame({ className, minHeight = 700 }: BookingFrameProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white overflow-hidden border-y sm:border border-gray-200 sm:rounded-2xl">
        {/* Container */}
        <div className="relative flex items-center justify-center" style={{ minHeight }}>
          {/* Maintenance Message */}
          <div className="text-center px-6 py-16 max-w-md">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#7B2D8E]/10 mb-6">
              <div className="text-3xl">🔧</div>
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Booking Under Maintenance
            </h3>

            {/* Description */}
            <p className="text-base text-gray-600 mb-8">
              Our online booking system is currently being updated to serve you better. We'll be back shortly!
            </p>

            {/* Contact Options */}
            <div className="space-y-3">
              <a
                href="tel:+2349017972919"
                className="flex items-center justify-center gap-3 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#5A1D6A] transition-colors font-semibold"
              >
                <Phone className="w-5 h-5" />
                Call Us
              </a>
              <a
                href="https://wa.me/+2349013134945"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-6 py-3 border-2 border-[#7B2D8E] text-[#7B2D8E] rounded-xl hover:bg-[#7B2D8E]/5 transition-colors font-semibold"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp Us
              </a>
            </div>

            {/* Info text */}
            <p className="text-sm text-gray-500 mt-6">
              Reach out via phone or WhatsApp to schedule your appointment
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
