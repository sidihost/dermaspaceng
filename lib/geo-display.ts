import { normalizeCountryCode } from './geo-blocking'

export type CountryCode = 'NG' | 'GB' | 'US' | 'AE' | 'GH' | 'ZA'

export interface CountryInfo {
  code: string
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

// Approximate exchange rates from NGN
export const EXCHANGE_RATES: Record<string, number> = {
  NGN: 1,
  GBP: 0.00052, // 1 NGN ≈ 0.00052 GBP
  USD: 0.00065, // 1 NGN ≈ 0.00065 USD
  EUR: 0.00060, // 1 NGN ≈ 0.00060 EUR
  AED: 0.0024,  // 1 NGN ≈ 0.0024 AED
  GHS: 0.0078,  // 1 NGN ≈ 0.0078 GHS
  ZAR: 0.012,   // 1 NGN ≈ 0.012 ZAR
}

const EUROZONE_CODES = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
])

export function countryCodeToFlag(isoCode: string): string {
  const code = normalizeCountryCode(isoCode)
  if (!code) return '🌍'
  return String.fromCodePoint(
    0x1f1e6 + (code.charCodeAt(0) - 65),
    0x1f1e6 + (code.charCodeAt(1) - 65),
  )
}

export function getRegionDisplayName(isoCode: string): string {
  const code = normalizeCountryCode(isoCode)
  if (!code) return 'International'
  if (code in COUNTRIES) {
    return COUNTRIES[code as CountryCode].name
  }
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
      const resolved = displayNames.of(code)
      if (resolved && resolved !== code) return resolved
    }
  } catch {
    // fallback below
  }
  return code
}

/**
 * Resolves any ISO alpha-2 country code into a `CountryInfo` suitable for
 * currency conversion and `LocationBanner` display.
 *
 * Known markets (`NG`, `GB`, `US`, `AE`, `GH`, `ZA`) return their exact entry
 * in `COUNTRIES`; any other detected country (e.g. `NL`, `DE`, `CA`, `JP`)
 * displays its real name and flag with EUR (Eurozone) or USD pricing.
 */
export function resolveCountryInfo(rawCode: string | null | undefined): CountryInfo {
  const code = normalizeCountryCode(rawCode)
  if (!code) return COUNTRIES.NG
  if (code in COUNTRIES) {
    return COUNTRIES[code as CountryCode]
  }
  const isEuro = EUROZONE_CODES.has(code)
  return {
    code,
    name: getRegionDisplayName(code),
    currency: isEuro ? 'EUR' : 'USD',
    symbol: isEuro ? '€' : '$',
    flag: countryCodeToFlag(code),
  }
}

export interface EffectiveCountryDecision {
  country: CountryInfo
  showBanner: boolean
  shouldClearManualOverride: boolean
}

/**
 * Determines which country & banner state to apply given the freshly detected
 * network country and any previously stored user preference / last detected
 * country. If the visitor's network country changed (e.g. they turned on or
 * switched a VPN), the newly detected country automatically takes precedence
 * so VPN switches are reflected immediately.
 */
export function computeEffectiveCountry(params: {
  detectedCode: string | null
  lastDetectedCode: string | null
  savedManualCode: string | null
  bannerDismissed: boolean
}): EffectiveCountryDecision {
  const detected = normalizeCountryCode(params.detectedCode)
  const lastDetected = normalizeCountryCode(params.lastDetectedCode)
  const savedManual = normalizeCountryCode(params.savedManualCode)

  const networkCountryChanged = Boolean(detected && detected !== lastDetected)

  if (!networkCountryChanged && savedManual && savedManual in COUNTRIES) {
    return {
      country: COUNTRIES[savedManual as CountryCode],
      showBanner: false,
      shouldClearManualOverride: false,
    }
  }

  if (detected) {
    const info = resolveCountryInfo(detected)
    const shouldShowBanner =
      detected !== 'NG' && (networkCountryChanged || !params.bannerDismissed)
    return {
      country: info,
      showBanner: shouldShowBanner,
      shouldClearManualOverride: networkCountryChanged,
    }
  }

  if (savedManual && savedManual in COUNTRIES) {
    return {
      country: COUNTRIES[savedManual as CountryCode],
      showBanner: false,
      shouldClearManualOverride: false,
    }
  }

  return {
    country: COUNTRIES.NG,
    showBanner: false,
    shouldClearManualOverride: false,
  }
}
