// ---------------------------------------------------------------------------
// Visitor telemetry & live-chat transcript formatting helpers (pure functions)
// ---------------------------------------------------------------------------
// Shared across /api/live-chat/request, /api/staff/live-chat/*, and the
// staff/admin live chat consoles so anonymous guests and logged-in visitors
// both surface crisp, accurate browser, OS, device, location, timezone, and
// current-page context without external dependencies.
// ---------------------------------------------------------------------------

export interface ParsedVisitorUA {
  browser: string | null
  os: string | null
  device: 'Mobile' | 'Tablet' | 'Desktop' | null
}

export interface ClientVisitorHints {
  pageUrl: string | null
  referrer: string | null
  timezone: string | null
  language: string | null
  screen: string | null
}

export interface VisitorMetadata {
  location: string | null
  ip: string | null
  userAgent: string | null
  browser: string | null
  os: string | null
  device: string | null
  timezone: string | null
  pageUrl: string | null
  referrer: string | null
  language: string | null
  screen: string | null
}

const COUNTRY_NAME_BY_CODE: Record<string, string> = {
  NG: 'Nigeria',
  US: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  CA: 'Canada',
  GH: 'Ghana',
  ZA: 'South Africa',
  KE: 'Kenya',
  EG: 'Egypt',
  AE: 'United Arab Emirates',
  IN: 'India',
  DE: 'Germany',
  FR: 'France',
  AU: 'Australia',
  NL: 'Netherlands',
  IE: 'Ireland',
  IT: 'Italy',
  ES: 'Spain',
  BR: 'Brazil',
  SG: 'Singapore',
}

const TIMEZONE_CITY_COUNTRY: Record<string, string> = {
  'Africa/Lagos': 'Lagos, Nigeria',
  'Africa/Accra': 'Accra, Ghana',
  'Africa/Johannesburg': 'Johannesburg, South Africa',
  'Africa/Nairobi': 'Nairobi, Kenya',
  'Africa/Cairo': 'Cairo, Egypt',
  'Europe/London': 'London, United Kingdom',
  'Europe/Dublin': 'Dublin, Ireland',
  'Europe/Paris': 'Paris, France',
  'Europe/Berlin': 'Berlin, Germany',
  'Europe/Amsterdam': 'Amsterdam, Netherlands',
  'America/New_York': 'New York, United States',
  'America/Chicago': 'Chicago, United States',
  'America/Denver': 'Denver, United States',
  'America/Los_Angeles': 'Los Angeles, United States',
  'America/Toronto': 'Toronto, Canada',
  'Asia/Dubai': 'Dubai, United Arab Emirates',
  'Asia/Kolkata': 'India',
  'Asia/Singapore': 'Singapore',
  'Australia/Sydney': 'Sydney, Australia',
}

export function cleanTextField(
  value: unknown,
  maxLen: number,
): string | null {
  if (typeof value !== 'string') return null
  const stripped = value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!stripped) return null
  return stripped.slice(0, maxLen)
}

export function sanitizeVisitorHints(raw: unknown): ClientVisitorHints {
  if (!raw || typeof raw !== 'object') {
    return {
      pageUrl: null,
      referrer: null,
      timezone: null,
      language: null,
      screen: null,
    }
  }
  const obj = raw as Record<string, unknown>
  const rawPage = cleanTextField(obj.pageUrl, 300)
  const rawRef = cleanTextField(obj.referrer, 300)
  const rawTz = cleanTextField(obj.timezone, 64)
  const rawLang = cleanTextField(obj.language, 32)
  const rawScreen = cleanTextField(obj.screen, 32)

  // Only allow safe http(s) or relative path URLs
  const safeUrl = (u: string | null): string | null => {
    if (!u) return null
    if (u.startsWith('/')) return u
    if (/^https?:\/\//i.test(u)) return u
    return null
  }

  return {
    pageUrl: safeUrl(rawPage),
    referrer: safeUrl(rawRef),
    timezone:
      rawTz && /^[A-Za-z0-9_./+-]+$/.test(rawTz) ? rawTz : null,
    language:
      rawLang && /^[A-Za-z0-9_-]+(?:,[A-Za-z0-9_.;=-]+)*$/.test(rawLang)
        ? rawLang
        : null,
    screen:
      rawScreen && /^\d{2,5}\s*[x×]\s*\d{2,5}$/i.test(rawScreen)
        ? rawScreen.replace(/\s*[x×]\s*/i, '×')
        : null,
  }
}

export function parseVisitorUserAgent(
  ua: string | null | undefined,
): ParsedVisitorUA {
  if (!ua || typeof ua !== 'string') {
    return { browser: null, os: null, device: null }
  }

  let os: string | null = null
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11'
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/ipad/i.test(ua)) {
    const m = ua.match(/OS (\d+)[_.](\d+)/i)
    os = m ? `iPadOS ${m[1]}.${m[2]}` : 'iPadOS'
  } else if (/iphone|ipod/i.test(ua)) {
    const m = ua.match(/OS (\d+)[_.](\d+)/i)
    os = m ? `iOS ${m[1]}.${m[2]}` : 'iOS'
  } else if (/android/i.test(ua)) {
    const m = ua.match(/Android (\d+(?:\.\d+)?)/i)
    os = m ? `Android ${m[1]}` : 'Android'
  } else if (/mac os x/i.test(ua)) {
    const m = ua.match(/Mac OS X (\d+)[_.](\d+)/i)
    os = m ? `macOS ${m[1]}.${m[2]}` : 'macOS'
  } else if (/cros/i.test(ua)) os = 'ChromeOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  const ver = (re: RegExp) => {
    const m = ua.match(re)
    return m ? m[1] : null
  }

  let browser: string | null = null
  if (/edg(?:a|ios)?\//i.test(ua)) {
    browser = `Edge ${ver(/edg(?:a|ios)?\/(\d+)/i) ?? ''}`.trim()
  } else if (/opr\/|opera/i.test(ua)) {
    browser = `Opera ${ver(/opr\/(\d+)/i) ?? ''}`.trim()
  } else if (/samsungbrowser\//i.test(ua)) {
    browser = `Samsung Internet ${ver(/samsungbrowser\/(\d+)/i) ?? ''}`.trim()
  } else if (/fxios\//i.test(ua)) {
    browser = `Firefox ${ver(/fxios\/(\d+)/i) ?? ''}`.trim()
  } else if (/firefox\//i.test(ua)) {
    browser = `Firefox ${ver(/firefox\/(\d+)/i) ?? ''}`.trim()
  } else if (/crios\//i.test(ua)) {
    browser = `Chrome ${ver(/crios\/(\d+)/i) ?? ''}`.trim()
  } else if (/chrome\//i.test(ua)) {
    browser = `Chrome ${ver(/chrome\/(\d+)/i) ?? ''}`.trim()
  } else if (/version\/.*safari/i.test(ua)) {
    browser = `Safari ${ver(/version\/(\d+)/i) ?? ''}`.trim()
  } else if (/safari/i.test(ua)) {
    browser = 'Safari'
  }

  let device: 'Mobile' | 'Tablet' | 'Desktop' | null = null
  if (/ipad|tablet|playbook|silk/i.test(ua)) device = 'Tablet'
  else if (/iphone|ipod|android.*mobile|mobile/i.test(ua)) device = 'Mobile'
  else if (/android/i.test(ua)) device = 'Tablet'
  else if (os) device = 'Desktop'

  return { browser, os, device }
}

export function inferLocationFromTimezone(
  timezone: string | null | undefined,
): string | null {
  if (!timezone) return null
  const trimmed = timezone.trim()
  if (!trimmed || trimmed === 'UTC' || trimmed === 'Etc/UTC') return null
  if (TIMEZONE_CITY_COUNTRY[trimmed]) {
    return TIMEZONE_CITY_COUNTRY[trimmed]
  }
  const parts = trimmed.split('/')
  if (parts.length >= 2) {
    const city = parts[parts.length - 1]!.replace(/_/g, ' ').trim()
    if (city && city.toLowerCase() !== 'unknown') {
      return city
    }
  }
  return null
}

export function resolveCountryName(codeOrName: string | null | undefined): string | null {
  if (!codeOrName) return null
  const cleaned = codeOrName.trim()
  if (!cleaned) return null
  const upper = cleaned.toUpperCase()
  if (COUNTRY_NAME_BY_CODE[upper]) return COUNTRY_NAME_BY_CODE[upper]
  return cleaned
}

export function formatVisitorLocation(opts: {
  city?: string | null
  region?: string | null
  country?: string | null
  timezone?: string | null
}): string | null {
  const parts: string[] = []
  const city = cleanTextField(opts.city, 80)
  const region = cleanTextField(opts.region, 80)
  const country = resolveCountryName(cleanTextField(opts.country, 80))

  if (city) parts.push(city)
  if (region && region.toLowerCase() !== city?.toLowerCase()) {
    parts.push(region)
  }
  if (country && country.toLowerCase() !== city?.toLowerCase()) {
    parts.push(country)
  }

  if (parts.length > 0) {
    return parts.join(', ')
  }

  const fromTz = inferLocationFromTimezone(opts.timezone)
  return fromTz || null
}

export function extractVisitorIpFromHeaders(headers: Headers): string | null {
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0],
  ]
  for (const raw of candidates) {
    const ip = cleanTextField(raw, 64)
    if (ip) return ip
  }
  return null
}

export function formatChatTimestamp(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const datePart = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const timePart = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${datePart}, ${timePart}`
  } catch {
    return ''
  }
}

export function formatLiveChatTranscriptText(input: {
  supportCode: string
  customerName: string
  customerEmail?: string | null
  topic?: string | null
  status: string
  visitor?: Partial<VisitorMetadata> | null
  messages: Array<{
    sender_role: 'user' | 'staff' | 'system'
    sender_name?: string | null
    body: string
    created_at: string
  }>
}): string {
  const lines: string[] = [
    'DERMASPACE LIVE CHAT TRANSCRIPT',
    '========================================',
    `Support ID: ${input.supportCode}`,
    `Customer: ${input.customerName}${input.customerEmail ? ` (${input.customerEmail})` : ''}`,
    `Status: ${input.status}`,
  ]
  if (input.topic) lines.push(`Topic: ${input.topic}`)
  if (input.visitor?.location) lines.push(`Location: ${input.visitor.location}`)
  if (input.visitor?.browser || input.visitor?.os) {
    const env = [input.visitor.browser, input.visitor.os, input.visitor.device]
      .filter(Boolean)
      .join(' · ')
    if (env) lines.push(`Environment: ${env}`)
  }
  if (input.visitor?.pageUrl) lines.push(`Page: ${input.visitor.pageUrl}`)
  lines.push('========================================', '')

  for (const m of input.messages) {
    const stamp = formatChatTimestamp(m.created_at)
    if (m.sender_role === 'system') {
      lines.push(`[${stamp}] --- ${m.body} ---`)
    } else if (m.sender_role === 'user') {
      lines.push(`[${stamp}] ${input.customerName}: ${m.body}`)
    } else {
      lines.push(
        `[${stamp}] ${m.sender_name || 'Dermaspace Representative'}: ${m.body}`,
      )
    }
  }

  return lines.join('\n')
}

export interface VisitorPresenceInfo {
  isOnline: boolean
  online: boolean
  state: 'online' | 'away' | 'offline'
  status: 'online' | 'idle' | 'offline'
  label: string
}

export interface VisitorPresenceOptions {
  status?: string | null
  lastSeenAt?: string | null
  lastActivityAt?: string | null
  nowMs?: number
}

/**
 * Returns true if a typing heartbeat timestamp is within the active typing window.
 */
export function isTypingActive(
  typingAt: string | null | undefined,
  nowMs: number = Date.now(),
  windowMs = 6500,
): boolean {
  if (!typingAt) return false
  const t = new Date(typingAt).getTime()
  if (!Number.isFinite(t)) return false
  const delta = nowMs - t
  return delta >= -2000 && delta <= windowMs
}

/**
 * Computes live visitor presence ("Online now", "Away", "Last seen Xm ago", "Offline")
 * from customer_last_seen_at / fallback activity timestamp and session status.
 */
export function getVisitorPresence(
  inputOrLastSeen: string | null | undefined | VisitorPresenceOptions,
  sessionStatus?: string | null,
  nowMsArg?: number,
): VisitorPresenceInfo {
  const isObj =
    typeof inputOrLastSeen === 'object' && inputOrLastSeen !== null
  const lastSeenAt = isObj
    ? inputOrLastSeen.lastSeenAt ?? inputOrLastSeen.lastActivityAt ?? null
    : inputOrLastSeen
  const status = isObj ? inputOrLastSeen.status : sessionStatus
  const nowMs = isObj ? (inputOrLastSeen.nowMs ?? Date.now()) : (nowMsArg ?? Date.now())

  if (status === 'closed' || status === 'abandoned') {
    return {
      isOnline: false,
      online: false,
      state: 'offline',
      status: 'offline',
      label: 'Offline',
    }
  }
  if (!lastSeenAt) {
    return {
      isOnline: false,
      online: false,
      state: 'offline',
      status: 'offline',
      label: 'Offline',
    }
  }
  const t = new Date(lastSeenAt).getTime()
  if (!Number.isFinite(t)) {
    return {
      isOnline: false,
      online: false,
      state: 'offline',
      status: 'offline',
      label: 'Offline',
    }
  }
  const diffSec = Math.max(0, Math.floor((nowMs - t) / 1000))
  if (diffSec <= 25) {
    return {
      isOnline: true,
      online: true,
      state: 'online',
      status: 'online',
      label: 'Online now',
    }
  }
  if (diffSec <= 120) {
    return {
      isOnline: false,
      online: false,
      state: 'away',
      status: 'idle',
      label: 'Away',
    }
  }
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60)
    return {
      isOnline: false,
      online: false,
      state: 'offline',
      status: 'offline',
      label: `Last seen ${mins}m ago`,
    }
  }
  const hrs = Math.floor(diffSec / 3600)
  if (hrs < 24) {
    return {
      isOnline: false,
      online: false,
      state: 'offline',
      status: 'offline',
      label: `Last seen ${hrs}h ago`,
    }
  }
  return {
    isOnline: false,
    online: false,
    state: 'offline',
    status: 'offline',
    label: 'Offline',
  }
}

