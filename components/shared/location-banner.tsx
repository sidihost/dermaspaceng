'use client'

import { useState, useEffect } from 'react'
import { MapPin, X } from 'lucide-react'
import Link from 'next/link'

export default function LocationBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [location, setLocation] = useState<string | null>(null)

  useEffect(() => {
    // Check if already dismissed
    const dismissed = sessionStorage.getItem('location-banner-dismissed')
    if (dismissed) return

    // Detect location (simplified - in production use a proper geo API)
    const detectLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.city && data.country_code === 'NG') {
          setLocation(data.city)
          setIsVisible(true)
        } else if (data.country_name) {
          setLocation(data.country_name)
          setIsVisible(true)
        }
      } catch {
        // Default to Lagos if detection fails
        setLocation('Lagos')
        setIsVisible(true)
      }
    }

    // Small delay for better UX
    const timer = setTimeout(detectLocation, 1500)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setIsVisible(false)
    sessionStorage.setItem('location-banner-dismissed', 'true')
  }

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-[#7B2D8E]/5 to-[#7B2D8E]/10 border-y border-[#7B2D8E]/10">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#7B2D8E]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Hi there!</span> We detected you're browsing from{' '}
                <span className="font-semibold text-[#7B2D8E]">{location}</span>
              </p>
              <p className="text-xs text-gray-500">Visit us at our Ikoyi or Victoria Island branch</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/contact#locations"
              className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-white bg-[#7B2D8E] rounded-full hover:bg-[#5A1D6A] transition-colors"
            >
              View Locations
            </Link>
            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
