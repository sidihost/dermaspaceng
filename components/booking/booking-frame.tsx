'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

interface BookingFrameProps {
  className?: string
  minHeight?: number
}

export function BookingFrame({ className, minHeight = 700 }: BookingFrameProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [showIframe, setShowIframe] = useState(false)
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
          const loggedIn = !!data.user
          setIsLoggedIn(loggedIn)
          // If logged in, show iframe immediately
          if (loggedIn) {
            setShowIframe(true)
          }
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
      <div className="bg-white overflow-hidden border-y sm:border border-gray-200 sm:rounded-2xl">
        {/* Container */}
        <div className="relative" style={{ minHeight }}>
          {/* Sign up prompt for non-logged-in users - INSIDE the iframe area */}
          {isLoggedIn === false && !showIframe && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FDFBF9] to-white p-6">
              <div className="text-center max-w-md">
                {/* Logo */}
                <div className="mb-6">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/415302924_1075146177064225_6577577843482783337_n.png-e95maF9TCmUwX5S85lZBjxTzCvbVuH.webp"
                    alt="Dermaspace"
                    width={180}
                    height={60}
                    className="mx-auto"
                  />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Book Your Appointment
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Sign up with DermaspaceNG to book appointments, track your treatments, and earn exclusive rewards.
                </p>

                {/* Sign up button */}
                <Link
                  href="/signup?redirect=/booking"
                  className="inline-flex items-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl hover:border-[#7B2D8E] hover:shadow-lg transition-all group mb-4"
                >
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-512-x-512-px-2-100x100.png-Aqw42iT3fQwqwLKNDBknFKhyzr2MAT.webp"
                    alt="Dermaspace"
                    width={28}
                    height={28}
                    className="flex-shrink-0"
                  />
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-[#7B2D8E] transition-colors">
                    Sign up with DermaspaceNG
                  </span>
                </Link>

                <p className="text-xs text-gray-500 mb-4">
                  Already have an account?{' '}
                  <Link href="/signin?redirect=/booking" className="text-[#7B2D8E] font-medium hover:underline">
                    Sign in
                  </Link>
                </p>

                {/* Continue as guest */}
                <button
                  onClick={() => setShowIframe(true)}
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#7B2D8E] transition-colors"
                >
                  Continue as guest
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {(isLoggedIn === true || showIframe) && isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#FDFBF9]">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-[#7B2D8E]/20 border-t-[#7B2D8E] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-base text-gray-500">Loading booking system...</p>
              </div>
            </div>
          )}

          {/* Iframe */}
          {isVisible && (isLoggedIn === true || showIframe) && (
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

          {/* Loading auth state */}
          {isLoggedIn === null && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#FDFBF9]">
              <div className="w-8 h-8 border-2 border-[#7B2D8E]/20 border-t-[#7B2D8E] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
