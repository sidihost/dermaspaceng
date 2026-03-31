"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type CountryCode = 'NG' | 'GB' | 'US' | 'AE' | 'GH' | 'ZA'

interface CountryInfo {
  code: CountryCode
  name: string
  currency: string
  symbol: string
  flag: string
}

export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  NG: { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦', flag: '🇳🇬' },
  GB: { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', flag: '🇬🇧' },
  US: { code: 'US', name: 'United States', currency: 'USD', symbol: '$', flag: '🇺🇸' },
  AE: { code: 'AE', name: 'UAE', currency: 'AED', symbol: 'د.إ', flag: '🇦🇪' },
  GH: { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: '₵', flag: '🇬🇭' },
  ZA: { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', flag: '🇿🇦' },
}

// Approximate exchange rates from NGN (updated manually or via API)
export const EXCHANGE_RATES: Record<string, number> = {
  NGN: 1,
  GBP: 0.00052,   // 1 NGN ≈ 0.00052 GBP
  USD: 0.00065,   // 1 NGN ≈ 0.00065 USD
  AED: 0.0024,    // 1 NGN ≈ 0.0024 AED
  GHS: 0.0078,    // 1 NGN ≈ 0.0078 GHS
  ZAR: 0.012,     // 1 NGN ≈ 0.012 ZAR
}

interface GeoContextType {
  country: CountryInfo
  setCountry: (code: CountryCode) => void
  formatPrice: (priceInNGN: number) => string
  convertPrice: (priceInNGN: number) => number
  isDetected: boolean
  showBanner: boolean
  dismissBanner: () => void
}

const GeoContext = createContext<GeoContextType | undefined>(undefined)

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

function setCookie(name: string, value: string, days: number = 30) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

export function GeoProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<CountryInfo>(COUNTRIES.NG)
  const [isDetected, setIsDetected] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already selected a country
    const savedCountry = getCookie('user_selected_country')
    const bannerDismissed = getCookie('geo_banner_dismissed')
    
    if (savedCountry && COUNTRIES[savedCountry as CountryCode]) {
      setCountryState(COUNTRIES[savedCountry as CountryCode])
      setIsDetected(true)
      return
    }
    
    // Get detected country from middleware cookie
    const detectedCountry = getCookie('geo_country')
    
    if (detectedCountry && COUNTRIES[detectedCountry as CountryCode]) {
      const countryInfo = COUNTRIES[detectedCountry as CountryCode]
      setCountryState(countryInfo)
      setIsDetected(true)
      
      // Show banner if not Nigeria and not already dismissed
      if (detectedCountry !== 'NG' && !bannerDismissed) {
        setShowBanner(true)
      }
    } else {
      setIsDetected(true)
    }
  }, [])

  const setCountry = (code: CountryCode) => {
    const countryInfo = COUNTRIES[code]
    if (countryInfo) {
      setCountryState(countryInfo)
      setCookie('user_selected_country', code, 30)
      setShowBanner(false)
    }
  }

  const dismissBanner = () => {
    setShowBanner(false)
    setCookie('geo_banner_dismissed', 'true', 7)
  }

  const convertPrice = (priceInNGN: number): number => {
    const rate = EXCHANGE_RATES[country.currency] || 1
    return Math.round(priceInNGN * rate * 100) / 100
  }

  const formatPrice = (priceInNGN: number): string => {
    const converted = convertPrice(priceInNGN)
    
    // Format based on currency
    if (country.currency === 'NGN') {
      return `₦${converted.toLocaleString()}`
    }
    
    return `${country.symbol}${converted.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  return (
    <GeoContext.Provider value={{ 
      country, 
      setCountry, 
      formatPrice, 
      convertPrice,
      isDetected,
      showBanner,
      dismissBanner
    }}>
      {children}
    </GeoContext.Provider>
  )
}

export function useGeo() {
  const context = useContext(GeoContext)
  if (context === undefined) {
    throw new Error('useGeo must be used within a GeoProvider')
  }
  return context
}
