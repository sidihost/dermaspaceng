'use client'

import { useState, useEffect } from 'react'
import { X, Globe, AlertTriangle } from 'lucide-react'

interface RegionData {
  country: string
  countryCode: string
  city: string
  flag: string
}

const BLOCKED_COUNTRIES = ['PK', 'IN'] // Pakistan and India

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  AE: '🇦🇪',
  NG: '🇳🇬',
  GH: '🇬🇭',
  ZA: '🇿🇦',
  CA: '🇨🇦',
  DE: '🇩🇪',
  FR: '🇫🇷',
  KE: '🇰🇪',
  AU: '🇦🇺',
  IN: '🇮🇳',
  PK: '🇵🇰',
}

export default function RegionBanner() {
  const [region, setRegion] = useState<RegionData | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const detectRegion = async () => {
      try {
        // Check if already dismissed in this session
        if (typeof window !== 'undefined' && sessionStorage.getItem('region-banner-dismissed')) {
          return
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const res = await fetch('https://ipapi.co/json/', {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!res.ok) {
          return
        }
        
        const data = await res.json()
        
        if (!data.country_code) {
          return
        }
        
        const regionData: RegionData = {
          country: data.country_name || 'Unknown',
          countryCode: data.country_code,
          city: data.city || '',
          flag: COUNTRY_FLAGS[data.country_code] || '🌍'
        }
        
        setRegion(regionData)
        
        if (BLOCKED_COUNTRIES.includes(regionData.countryCode)) {
          setIsBlocked(true)
        }
        
        // Only show banner for international visitors (not Nigeria)
        if (regionData.countryCode !== 'NG') {
          setShowBanner(true)
        }
      } catch {
        // Silently fail - region detection is not critical
      }
    }

    detectRegion()
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('region-banner-dismissed', 'true')
  }

  // Blocked country modal
  if (isBlocked && region) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Service Not Available</h2>
          <p className="text-gray-600 mb-6">
            We&apos;re sorry, but Dermaspace services are not yet available in {region.country}. 
            We&apos;re working on expanding to more regions. Please check back later.
          </p>
          <div className="text-sm text-gray-500">
            For inquiries, contact us at{' '}
            <a href="mailto:info@dermaspaceng.com" className="text-[#7B2D8E] hover:underline">
              info@dermaspaceng.com
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Region banner for international visitors - positioned at TOP of page
  if (!showBanner || dismissed || !region) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-slide-down">
      <div className="bg-gradient-to-r from-[#7B2D8E] to-[#5A1D6A] text-white">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-white/80" />
              <span className="text-xl">{region.flag}</span>
              <span className="text-sm font-medium">
                You&apos;re visiting from {region.country}
              </span>
            </div>
            <span className="text-white/60 hidden sm:inline">|</span>
            <span className="text-sm text-white/80 hidden sm:inline">
              Our spa is located in Lagos, Nigeria. International visitors welcome!
            </span>
            <button
              onClick={handleDismiss}
              className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}
