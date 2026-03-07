'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface BookingFrameProps {
  className?: string
  minHeight?: number
}

export function BookingFrame({ className, minHeight = 600 }: BookingFrameProps) {
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
      {/* Decorative Frame Border */}
      <div className="absolute -inset-1 bg-gradient-to-br from-[#7B2D8E]/20 via-[#C41E8E]/10 to-[#D4A853]/20 rounded-3xl blur-sm" />
      <div className="absolute -inset-px bg-gradient-to-br from-[#7B2D8E]/30 via-transparent to-[#D4A853]/30 rounded-3xl" />
      
      {/* Main Container */}
      <div className="relative bg-white rounded-3xl overflow-hidden">
        {/* Top Decorative Bar */}
        <div className="h-14 bg-gradient-to-r from-[#7B2D8E] via-[#9B4DB0] to-[#C41E8E] flex items-center justify-between px-6">
          {/* Left - Dots */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white/30" />
            <div className="w-3 h-3 rounded-full bg-white/50" />
            <div className="w-3 h-3 rounded-full bg-white/70" />
          </div>
          
          {/* Center - Title */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <svg className="w-4 h-4 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium text-white/90 tracking-wide">Schedule Your Visit</span>
          </div>
          
          {/* Right - Status */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-white/70">Online</span>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="relative" style={{ minHeight }}>
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#f8f5fc] to-white">
              <div className="text-center">
                {/* Animated Loader */}
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-[#7B2D8E]/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7B2D8E] animate-spin" />
                  <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#C41E8E] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#7B2D8E]/10 to-[#C41E8E]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#7B2D8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Loading booking system...</p>
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

        {/* Bottom Decorative Bar */}
        <div className="h-3 bg-gradient-to-r from-[#7B2D8E]/5 via-[#C41E8E]/5 to-[#D4A853]/5" />
      </div>

      {/* Corner Decorations */}
      <div className="absolute -top-2 -left-2 w-4 h-4">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#7B2D8E] to-transparent" />
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[#7B2D8E] to-transparent" />
      </div>
      <div className="absolute -top-2 -right-2 w-4 h-4">
        <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-[#C41E8E] to-transparent" />
        <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-[#C41E8E] to-transparent" />
      </div>
      <div className="absolute -bottom-2 -left-2 w-4 h-4">
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#D4A853] to-transparent" />
        <div className="absolute bottom-0 left-0 w-0.5 h-full bg-gradient-to-t from-[#D4A853] to-transparent" />
      </div>
      <div className="absolute -bottom-2 -right-2 w-4 h-4">
        <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-l from-[#7B2D8E] to-transparent" />
        <div className="absolute bottom-0 right-0 w-0.5 h-full bg-gradient-to-t from-[#7B2D8E] to-transparent" />
      </div>
    </div>
  )
}
