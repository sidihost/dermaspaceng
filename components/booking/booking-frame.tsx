'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

interface BookingFrameProps {
  className?: string
  minHeight?: number
}

export function BookingFrame({ className, minHeight = 700 }: BookingFrameProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
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

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setIsLoggedIn(!!data.user)
        } else {
          setIsLoggedIn(false)
        }
      } catch {
        setIsLoggedIn(false)
      }
    }
    checkAuth()
  }, [])

  return (
    <div ref={frameRef} className={cn('w-full', className)}>
      {/* Sign up prompt for non-logged-in users */}
      {isLoggedIn === false && (
        <div className="max-w-4xl mx-auto mb-4 px-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-gray-900 mb-1">Create an account to manage your bookings</p>
                <p className="text-sm text-gray-500">Track appointments, earn rewards, and get personalized recommendations</p>
              </div>
              <Link
                href="/signup"
                className="flex items-center gap-3 px-5 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-[#7B2D8E] hover:bg-[#7B2D8E]/5 transition-all group"
              >
                <div className="w-6 h-6 relative flex-shrink-0">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
                    alt="Dermaspace"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-[#7B2D8E] transition-colors whitespace-nowrap">
                  Sign up with DermaspaceNG
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

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
