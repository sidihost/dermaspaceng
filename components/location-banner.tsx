"use client"

import { X, MapPin, ChevronDown } from 'lucide-react'
import { useGeo, COUNTRIES, CountryCode } from '@/lib/geo-context'
import { useState } from 'react'

export function LocationBanner() {
  const { country, showBanner, dismissBanner, setCountry } = useGeo()
  const [showSelector, setShowSelector] = useState(false)
  
  if (!showBanner) return null
  
  return (
    <div className="bg-[#7B2D8E] text-white py-3 px-4 relative">
      <div className="container mx-auto flex items-center justify-center gap-3 text-sm">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <span className="text-center">
          We noticed you&apos;re visiting from <strong>{country.name}</strong>. 
          Prices are shown in <strong>{country.currency}</strong>.
        </span>
        
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-medium transition-colors"
          >
            Change
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showSelector && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowSelector(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-50 overflow-hidden">
                {Object.values(COUNTRIES).map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountry(c.code as CountryCode)
                      setShowSelector(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      country.code === c.code ? 'bg-[#7B2D8E]/5' : ''
                    }`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="flex-1 text-sm text-gray-700">{c.name}</span>
                    <span className="text-xs text-gray-500">{c.symbol}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={dismissBanner}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
