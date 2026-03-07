'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

interface BookingFrameProps {
  className?: string
  minHeight?: number
}

export function BookingFrame({ className, minHeight = 650 }: BookingFrameProps) {
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
    <div ref={frameRef} className={cn('relative', className)}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
        {/* Header */}
        <div className="bg-[#7B2D8E] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">Book Your Appointment</h3>
              <p className="text-white/70 text-sm">Select your service and time</p>
            </div>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="relative" style={{ minHeight }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-[#7B2D8E]/20 border-t-[#7B2D8E] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-500">Loading booking system...</p>
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
      </div>
    </div>
  )
}
