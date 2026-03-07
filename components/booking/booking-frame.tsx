'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Calendar, Clock, MapPin } from 'lucide-react'

interface BookingFrameProps {
  className?: string
  minHeight?: number
}

export function BookingFrame({ className, minHeight = 700 }: BookingFrameProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (frameRef.current) {
      observer.observe(frameRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={frameRef} className={cn('w-full', className)}>
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#7B2D8E] px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Book Your Appointment</h3>
                <p className="text-white/80 text-sm">Select your service, date and time</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Open 9AM - 7PM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>VI & Ikoyi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="relative" style={{ minHeight }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#FDFBF9]">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-[#7B2D8E]/20 border-t-[#7B2D8E] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading booking system...</p>
              </div>
            </div>
          )}

          {isVisible && (
            <iframe
              src="https://app.withsplice.com/s/dermaspaceng"
              width="100%"
              height={minHeight}
              style={{ border: 'none', display: 'block' }}
              title="Book Appointment at Dermaspace"
              onLoad={() => setIsLoading(false)}
              allow="payment"
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#FDFBF9] px-6 lg:px-8 py-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
            <p>Need help? Call us at <a href="tel:+2349017972919" className="text-[#7B2D8E] font-medium hover:underline">+234 901 797 2919</a></p>
            <p>Secure booking powered by Splice</p>
          </div>
        </div>
      </div>
    </div>
  )
}
