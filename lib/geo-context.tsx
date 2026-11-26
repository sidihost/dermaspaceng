"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { isCountryBlocked, normalizeCountryCode } from './geo-blocking'
import {
  COUNTRIES,
  EXCHANGE_RATES,
  computeEffectiveCountry,
  type CountryCode,
  type CountryInfo,
} from './geo-display'

export { COUNTRIES, EXCHANGE_RATES, type CountryCode, type CountryInfo }

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
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax'
  document.cookie = `${name}=${value}; expires=${expires}; path=/; ${sameSite}`
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax'
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; ${sameSite}`
}

function readStoredManualCountry(): string | null {
  try {
    const fromStorage = window.localStorage.getItem('ds.geo.manual_country')
    if (fromStorage) return normalizeCountryCode(fromStorage)
  } catch {
    // ignore storage restrictions
  }
  return normalizeCountryCode(getCookie('user_selected_country'))
}

function writeStoredManualCountry(code: CountryCode) {
  try {
    window.localStorage.setItem('ds.geo.manual_country', code)
  } catch {
    // ignore storage restrictions
  }
  setCookie('user_selected_country', code, 30)
}

function readStoredLastDetected(): string | null {
  try {
    const fromStorage = window.localStorage.getItem('ds.geo.last_detected')
    if (fromStorage) return normalizeCountryCode(fromStorage)
  } catch {
    // ignore storage restrictions
  }
  return normalizeCountryCode(getCookie('geo_last_detected'))
}

function writeStoredLastDetected(code: string) {
  try {
    window.localStorage.setItem('ds.geo.last_detected', code)
  } catch {
    // ignore storage restrictions
  }
  setCookie('geo_last_detected', code, 30)
}

async function detectBrowserEgressCountry(): Promise<string | null> {
  // Used only when server `/api/geo` could not see a public IP (e.g. local dev).
  try {
    const res = await fetch('https://api.country.is/', {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    })
    if (res.ok) {
      const data = (await res.json()) as { country?: string }
      const code = normalizeCountryCode(data.country)
      if (code) return code
    }
  } catch {
    // try backup
  }

  try {
    const res = await fetch('https://get.geojs.io/v1/ip/country.json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    })
    if (res.ok) {
      const data = (await res.json()) as { country?: string }
      const code = normalizeCountryCode(data.country)
      if (code) return code
    }
  } catch {
    // ignore
  }

  return null
}

function isBlockedExemptPathname(pathname: string): boolean {
  return (
    pathname.startsWith('/blocked') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/offline') ||
    pathname.startsWith('/maintenance')
  )
}

export function GeoProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<CountryInfo>(COUNTRIES.NG)
  const [isDetected, setIsDetected] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    let cancelled = false

    const applyDetectedCountry = (detectedCode: string | null) => {
      if (cancelled) return

      if (
        detectedCode &&
        isCountryBlocked(detectedCode) &&
        typeof window !== 'undefined' &&
        !isBlockedExemptPathname(window.location.pathname)
      ) {
        window.location.replace('/blocked')
        return
      }

      const savedManualCode = readStoredManualCountry()
      const bannerDismissed = getCookie('geo_banner_dismissed') === 'true'
      const lastDetectedCode = readStoredLastDetected()

      const decision = computeEffectiveCountry({
        detectedCode,
        lastDetectedCode,
        savedManualCode,
        bannerDismissed,
      })

      if (decision.shouldClearManualOverride) {
        clearCookie('user_selected_country')
        clearCookie('geo_banner_dismissed')
      }

      if (detectedCode) {
        writeStoredLastDetected(detectedCode)
      }

      setCountryState(decision.country)
      setShowBanner(decision.showBanner)
      setIsDetected(true)
    }

    // 1) Immediately restore any explicit manual currency selection (leaving
    //    default first-time renders & crawlers strictly in NGN / Nigeria).
    const initialManualCode = readStoredManualCountry()
    if (initialManualCode && initialManualCode in COUNTRIES) {
      setCountryState(COUNTRIES[initialManualCode as CountryCode])
      setShowBanner(false)
      setIsDetected(true)
    }

    // 2) Fast synchronous check from middleware cookie (for geo-blocking & banner).
    const cookieDetectedFlag = getCookie('geo_detected') === '1'
    const cookieCountry = cookieDetectedFlag
      ? normalizeCountryCode(getCookie('geo_country'))
      : null
    if (cookieCountry) {
      applyDetectedCountry(cookieCountry)
    }

    // 3) Verify live against `/api/geo` for geo-blocking and optional banner
    //    visibility; currency stays NGN unless the user manually selects one.
    const detectLive = async () => {
      let liveCode: string | null = null
      try {
        const res = await fetch('/api/geo', { cache: 'no-store' })
        if (res.ok) {
          const data = (await res.json()) as {
            country?: string | null
            detected?: boolean
          }
          if (data.detected && data.country) {
            liveCode = normalizeCountryCode(data.country)
          }
        }
      } catch {
        // network error — try fallback below
      }

      if (!liveCode && !cancelled) {
        liveCode = await detectBrowserEgressCountry()
      }

      if (cancelled) return

      if (liveCode) {
        applyDetectedCountry(liveCode)
      } else if (!cookieCountry) {
        applyDetectedCountry(null)
      }
    }

    void detectLive()

    return () => {
      cancelled = true
    }
  }, [])

  const setCountry = (code: CountryCode) => {
    const countryInfo = COUNTRIES[code]
    if (countryInfo) {
      setCountryState(countryInfo)
      writeStoredManualCountry(code)
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
      maximumFractionDigits: 2,
    })}`
  }

  return (
    <GeoContext.Provider
      value={{
        country,
        setCountry,
        formatPrice,
        convertPrice,
        isDetected,
        showBanner,
        dismissBanner,
      }}
    >
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
