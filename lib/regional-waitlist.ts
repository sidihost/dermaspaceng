export interface RegionalWaitlistInput {
  email: string
  name: string
  city: string
  region: string
  source: 'blocked' | 'waitlist'
}

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateWaitlistSubmission(
  raw: unknown,
): { ok: true; data: RegionalWaitlistInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      error: 'Please provide your email address to join the waitlist.',
    }
  }
  const obj = raw as Record<string, unknown>
  const email =
    typeof obj.email === 'string' ? obj.email.trim().toLowerCase() : ''
  if (!email || email.length > 160 || !SIMPLE_EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }

  const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 80) : ''
  const city = typeof obj.city === 'string' ? obj.city.trim().slice(0, 80) : ''
  const regionRaw =
    typeof obj.region === 'string' ? obj.region.trim().toUpperCase() : ''
  const region = /^[A-Z]{2,12}$/.test(regionRaw) ? regionRaw : 'GLOBAL'
  const source: 'blocked' | 'waitlist' =
    obj.source === 'blocked' ? 'blocked' : 'waitlist'

  return {
    ok: true,
    data: {
      email,
      name,
      city,
      region,
      source,
    },
  }
}
