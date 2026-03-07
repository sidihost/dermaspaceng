'use client'

import { useState, useEffect } from 'react'
import { X, Globe, AlertTriangle } from 'lucide-react'

interface RegionData {
  country: string
  countryCode: string
  city: string
}

const BLOCKED_COUNTRIES = ['PK', 'IN'] // Pakistan and India

const REGION_MESSAGES: Record<string, { flag: string; message: string }> = {
  US: { flag: '🇺🇸', message: 'You are visiting from the United States' },
  GB: { flag: '🇬🇧', message: 'You are visiting from the United Kingdom' },
  AE: { flag: '🇦🇪', message: 'You are visiting from Dubai, UAE' },
  NG: { flag: '🇳🇬', message: 'Welcome! You are browsing from Nigeria' },
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
        if (sessionStorage.getItem('region-banner-dismissed')) {
          return
        }

        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        
        const regionData: RegionData = {
          country: data.country_name,
          countryCode: data.country_code,
          city: data.city
        }
        
        setRegion(regionData)
        
        if (BLOCKED_COUNTRIES.includes(regionData.countryCode)) {
          setIsBlocked(true)
        }
        
        // Only show banner for international visitors
        if (regionData.countryCode !== 'NG') {
          setShowBanner(true)
        }
      } catch (error) {
        console.error('Region detection failed:', error)
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

  // Region banner for international visitors
  if (!showBanner || dismissed || !region) return null

  const regionInfo = REGION_MESSAGES[region.countryCode]
  if (!regionInfo) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-[#7B2D8E]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{regionInfo.flag}</span>
              <p className="font-semibold text-gray-900 text-sm">{regionInfo.message}</p>
            </div>
            <p className="text-xs text-gray-500">
              Our spa is located in Lagos, Nigeria. We welcome international visitors!
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}
