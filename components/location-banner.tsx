"use client"

import { X, MapPin, ChevronDown } from 'lucide-react'
import { useGeo, COUNTRIES, CountryCode } from '@/lib/geo-context'
import { useState } from 'react'

export function LocationBanner() {
  const { country, showBanner, dismissBanner, setCountry } = useGeo()
  const [showSelector, setShowSelector] = useState(false)
  
  if (!showBanner) return null
  
  return (
    <div className="bg-[#7B2D8E] text-white py-3 px-4 relative z-[60]">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pr-8 text-xs sm:text-sm">
        <div className="flex items-center justify-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="text-center leading-snug min-w-0">
            We noticed you&apos;re visiting from <strong>{country.name}</strong>.{' '}
            Prices are shown in <strong>{country.currency}</strong>.
          </span>
        </div>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowSelector(!showSelector)}
            className="inline-flex items-center gap-1 whitespace-nowrap flex-shrink-0 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-medium transition-colors"
          >
            Change
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>

          {showSelector && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSelector(false)}
              />
              <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-52 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-gray-200 z-50 overflow-hidden">
                {Object.values(COUNTRIES).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountry(c.code as CountryCode)
                      setShowSelector(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      country.code === c.code ? 'bg-[#7B2D8E]/5' : ''
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">{c.flag}</span>
                    <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{c.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">{c.symbol}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={dismissBanner}
          className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
