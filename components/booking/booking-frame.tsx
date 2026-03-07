'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Calendar, Clock, MapPin } from 'lucide-react'

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
      {/* Outer Glow */}
      <div className="absolute -inset-4 bg-[#7B2D8E]/5 rounded-[2rem] blur-xl" />
      
      {/* Main Container */}
      <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl shadow-[#7B2D8E]/10 border border-[#7B2D8E]/10">
        {/* Top Header Bar */}
        <div className="bg-[#7B2D8E] px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Left - Decorative Elements */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Book Your Appointment</h3>
                <p className="text-white/70 text-sm">Select your preferred service and time</p>
              </div>
            </div>
            
            {/* Right - Quick Info */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 text-white/80">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Open 9AM - 7PM</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">2 Locations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="relative bg-[#faf8fc]" style={{ minHeight }}>
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#faf8fc] z-10">
              <div className="text-center">
                {/* Elegant Loader */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-[#7B2D8E]/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#7B2D8E] animate-spin" />
                  <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#C41E8E] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }} />
                  <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center shadow-inner">
                    <Calendar className="w-6 h-6 text-[#7B2D8E]" />
                  </div>
                </div>
                <p className="text-base text-gray-600 font-medium">Loading booking system...</p>
                <p className="text-sm text-gray-400 mt-1">Please wait a moment</p>
              </div>
            </div>
          )}

          {/* Iframe */}
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

        {/* Bottom Bar */}
        <div className="bg-[#f8f5fc] px-6 py-4 border-t border-[#7B2D8E]/10">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#7B2D8E]" />
              <span>Instant Confirmation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D4A853]" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#C41E8E]" />
              <span>Free Cancellation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
