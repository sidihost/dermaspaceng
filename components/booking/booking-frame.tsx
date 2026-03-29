import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Calendar, ArrowRight } from 'lucide-react'

interface BookingFrameProps {
  className?: string
  minHeight?: number
}

export function BookingFrame({ className, minHeight = 400 }: BookingFrameProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="bg-white overflow-hidden border-y sm:border border-gray-200 sm:rounded-2xl">
        {/* Container */}
        <div className="relative flex items-center justify-center" style={{ minHeight }}>
          {/* Redirect to Booking Page */}
          <div className="text-center px-6 py-10 max-w-sm">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7B2D8E]/10 mb-4">
              <Calendar className="w-8 h-8 text-[#7B2D8E]" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Dermaspace Booking Software
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-6">
              Our custom booking system is ready to help you schedule your perfect treatment.
            </p>

            {/* Book Now Button */}
            <Link
              href="/booking"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#7B2D8E] text-white rounded-xl hover:bg-[#5A1D6A] transition-colors font-medium text-sm"
            >
              Book Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
