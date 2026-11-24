"use client"

import { X, MapPin, ChevronDown, Check } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useGeo, COUNTRIES, CountryCode } from '@/lib/geo-context'
import { useEffect, useState } from 'react'

const EXCLUDED_PREFIXES = [
  '/admin',
  '/staff',
  '/signin',
  '/signup',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/complete-profile',
  '/verify-email',
  '/accept-invite',
  '/offline',
  '/maintenance',
  '/blocked',
]

export function LocationBanner() {
  const pathname = usePathname() || ''
  const { country, showBanner, dismissBanner, setCountry } = useGeo()
  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => {
    if (!showSelector) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSelector(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showSelector])

  const isExcluded = EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (!showBanner || isExcluded) return null

  return (
    <div
      className={`relative border-b border-[#7B2D8E]/15 bg-[#FBF9FC] text-gray-800 transition-colors ${
        showSelector ? 'z-[60]' : 'z-30'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-2 sm:gap-4 text-xs sm:text-[13px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-6 h-6 rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E] hidden xs:inline-flex sm:inline-flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <p className="min-w-0 truncate leading-tight text-gray-700">
            <span className="sm:hidden">
              {country.flag} <strong className="font-semibold text-gray-900">{country.name}</strong> · Prices in{' '}
              <strong className="font-semibold text-[#7B2D8E]">{country.currency}</strong>
            </span>
            <span className="hidden sm:inline">
              {country.flag} Visiting from{' '}
              <strong className="font-semibold text-gray-900">{country.name}</strong> — prices are shown in{' '}
              <strong className="font-semibold text-[#7B2D8E]">
                {country.currency} ({country.symbol})
              </strong>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSelector((prev) => !prev)}
              aria-expanded={showSelector}
              aria-haspopup="listbox"
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#7B2D8E]/25 bg-white hover:bg-[#7B2D8E]/5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-[#7B2D8E] transition-colors"
            >
              <span>{country.currency}</span>
              <span className="hidden sm:inline font-normal text-gray-500">· Change</span>
              <ChevronDown
                className={`w-3 h-3 flex-shrink-0 transition-transform ${
                  showSelector ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showSelector && (
              <>
                <div
                  className="fixed inset-0 z-[55]"
                  onClick={() => setShowSelector(false)}
                />
                <div
                  role="listbox"
                  aria-label="Select currency and location"
                  className="absolute top-full right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white z-[70] overflow-hidden"
                >
                  <div className="px-3.5 py-2 border-b border-gray-100 bg-[#FBF9FC]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                      Currency &amp; Region
                    </p>
                  </div>
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {Object.values(COUNTRIES).map((c) => {
                      const active = country.code === c.code
                      return (
                        <button
                          key={c.code}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setCountry(c.code as CountryCode)
                            setShowSelector(false)
                          }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors ${
                            active
                              ? 'bg-[#7B2D8E]/[0.07] text-[#7B2D8E]'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-base flex-shrink-0">{c.flag}</span>
                          <span className="flex-1 min-w-0 truncate text-xs sm:text-sm font-medium">
                            {c.name}
                          </span>
                          <span className="text-xs font-mono text-gray-500 flex-shrink-0 whitespace-nowrap">
                            {c.symbol} {c.currency}
                          </span>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-[#7B2D8E] flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={dismissBanner}
            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 transition-colors flex-shrink-0"
            aria-label="Dismiss location banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
