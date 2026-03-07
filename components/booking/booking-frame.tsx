'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

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
      <div className="bg-white overflow-hidden border-y sm:border border-gray-200 sm:rounded-2xl">
        {/* Iframe Container */}
        <div className="relative" style={{ minHeight }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#FDFBF9]">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-[#7B2D8E]/20 border-t-[#7B2D8E] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-base text-gray-500">Loading booking system...</p>
              </div>
            </div>
          )}

          {isVisible && (
            <iframe
              src="https://app.withsplice.com/s/dermaspaceng"
              width="100%"
              height={minHeight}
              style={{ border: 'none', display: 'block' }}
              title="Book Appointment"
              onLoad={() => setIsLoading(false)}
              allow="payment"
            />
          )}
        </div>
      </div>
    </div>
  )
}
